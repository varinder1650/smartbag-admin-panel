// admin-panel/src/pages/Marketing.tsx
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { useMarketingStore, MarketingBanner, MarketingContainer } from "@/store/marketingStore";
import { wsService } from "@/services/websocket";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2, Megaphone, X } from "lucide-react";
// @ts-ignore — colorthief v3 has no bundled TS types
import { getColor } from "colorthief";

const EMPTY_CONTAINER: MarketingContainer = {
  title: "",
  image_url: "",
  image_data: "",
  bg_color: "#FFFFFF",
  link_type: "none",
  link_value: "",
};

const EMPTY_BANNER: Omit<MarketingBanner, "_id" | "id"> = {
  title: "",
  subtitle: "",
  image_url: "",
  bg_color: "#FFFFFF",
  is_active: true,
  order: 0,
  auto_rotate_interval: 4,
  containers: [],
};

function rgbToHex(r: number, g: number, b: number): string {
  return "#" + [r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("");
}

export default function Marketing() {
  const { banners, setBanners, addBanner, updateBanner, deleteBanner } = useMarketingStore();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<typeof EMPTY_BANNER & { image_data?: string }>({ ...EMPTY_BANNER });

  useEffect(() => {
    wsService.send({ type: "get_marketing_banners" });

    const handleData = (msg: any) => {
      if (msg.type === "marketing_banners_data") setBanners(msg.banners || []);
      if (msg.type === "marketing_banner_created") addBanner(msg.banner);
      if (msg.type === "marketing_banner_updated") {
        const id = msg.banner._id || msg.banner.id;
        updateBanner(id, msg.banner);
      }
      if (msg.type === "marketing_banner_deleted") deleteBanner(msg.id);
    };

    const unsubscribe = wsService.onMessage("*", handleData);
    return () => { unsubscribe(); };
  }, []);

  const openCreate = () => {
    setEditingId(null);
    setForm({ ...EMPTY_BANNER });
    setDialogOpen(true);
  };

  const openEdit = (banner: MarketingBanner) => {
    setEditingId(banner._id || banner.id || null);
    setForm({
      title: banner.title,
      subtitle: banner.subtitle,
      image_url: banner.image_url,
      bg_color: banner.bg_color,
      is_active: banner.is_active,
      order: banner.order,
      auto_rotate_interval: banner.auto_rotate_interval,
      containers: banner.containers.map((c) => ({ ...c, image_data: "" })),
    });
    setDialogOpen(true);
  };

  const handleBannerImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Extract dominant color directly from File (avoids crossOrigin canvas taint)
    try {
      const color = await getColor(file as any);
      if (color) {
        const [r, g, b] = color;
        setForm((f) => ({ ...f, bg_color: rgbToHex(r, g, b) }));
      }
    } catch (_) {}

    // Read as data URL for preview + upload
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      setForm((f) => ({ ...f, image_data: dataUrl, image_url: dataUrl }));
    };
    reader.readAsDataURL(file);
  };

  const handleContainerImageChange = (
    idx: number,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      setForm((f) => {
        const containers = [...f.containers];
        containers[idx] = { ...containers[idx], image_data: dataUrl, image_url: dataUrl };
        return { ...f, containers };
      });
    };
    reader.readAsDataURL(file);
  };

  const addContainer = () =>
    setForm((f) => ({ ...f, containers: [...f.containers, { ...EMPTY_CONTAINER }] }));

  const removeContainer = (idx: number) =>
    setForm((f) => ({ ...f, containers: f.containers.filter((_, i) => i !== idx) }));

  const updateContainer = (idx: number, patch: Partial<MarketingContainer>) =>
    setForm((f) => {
      const containers = [...f.containers];
      containers[idx] = { ...containers[idx], ...patch };
      return { ...f, containers };
    });

  const handleSave = () => {
    const payload = {
      ...form,
      order: Number(form.order),
      auto_rotate_interval: Number(form.auto_rotate_interval),
      containers: form.containers.map((c) => ({
        title: c.title,
        image_url: c.image_url,
        image_data: c.image_data || "",
        bg_color: c.bg_color,
        link_type: c.link_type,
        link_value: c.link_value,
      })),
    };

    if (editingId) {
      wsService.send({ type: "update_marketing_banner", data: { ...payload, id: editingId } });
      toast({ title: "Banner updated" });
    } else {
      wsService.send({ type: "create_marketing_banner", data: payload });
      toast({ title: "Banner created" });
    }
    setDialogOpen(false);
  };

  const handleDelete = (id: string) => {
    wsService.send({ type: "delete_marketing_banner", data: { id } });
    toast({ title: "Banner deleted" });
  };

  const handleToggleActive = (banner: MarketingBanner) => {
    const id = banner._id || banner.id || "";
    wsService.send({
      type: "update_marketing_banner",
      data: { id, is_active: !banner.is_active },
    });
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Megaphone className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Marketing Banners</h1>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" /> Add Banner
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Image</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Order</TableHead>
                <TableHead>Containers</TableHead>
                <TableHead>Active</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {banners.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    No banners yet. Click "Add Banner" to create one.
                  </TableCell>
                </TableRow>
              )}
              {banners.map((banner) => {
                const id = banner._id || banner.id || "";
                return (
                  <TableRow key={id}>
                    <TableCell>
                      {banner.image_url ? (
                        <img
                          src={banner.image_url}
                          alt={banner.title}
                          className="h-12 w-20 object-cover rounded"
                        />
                      ) : (
                        <div className="h-12 w-20 bg-muted rounded flex items-center justify-center text-xs text-muted-foreground">
                          No image
                        </div>
                      )}
                    </TableCell>
                    <TableCell>{banner.title || <span className="text-muted-foreground">—</span>}</TableCell>
                    <TableCell>{banner.order}</TableCell>
                    <TableCell>{banner.containers.length}</TableCell>
                    <TableCell>
                      <Switch
                        checked={banner.is_active}
                        onCheckedChange={() => handleToggleActive(banner)}
                      />
                    </TableCell>
                    <TableCell className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => openEdit(banner)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => handleDelete(id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Banner" : "Add Banner"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Banner Image */}
            <div>
              <Label>Banner Image</Label>
              <Input type="file" accept="image/*" onChange={handleBannerImageChange} className="mt-1" />
              {form.image_url && (
                <img src={form.image_url} className="mt-2 h-32 w-full object-cover rounded" alt="preview" />
              )}
            </div>

            {/* Auto-extracted bg color */}
            <div className="flex items-center gap-3">
              <Label>Background Color (auto-extracted)</Label>
              <div
                className="h-8 w-8 rounded border"
                style={{ backgroundColor: form.bg_color }}
              />
              <span className="text-sm text-muted-foreground font-mono">{form.bg_color}</span>
            </div>

            {/* Title / Subtitle */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Title (optional)</Label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="e.g. Celebrate Akshaya Tritiya"
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Subtitle (optional)</Label>
                <Input
                  value={form.subtitle}
                  onChange={(e) => setForm((f) => ({ ...f, subtitle: e.target.value }))}
                  placeholder="e.g. Shop now"
                  className="mt-1"
                />
              </div>
            </div>

            {/* Order / Interval / Active */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Order</Label>
                <Input
                  type="number"
                  value={form.order}
                  onChange={(e) => setForm((f) => ({ ...f, order: Number(e.target.value) }))}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Auto-rotate (seconds)</Label>
                <Input
                  type="number"
                  value={form.auto_rotate_interval}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, auto_rotate_interval: Number(e.target.value) }))
                  }
                  className="mt-1"
                />
              </div>
              <div className="flex flex-col justify-end pb-1">
                <Label>Active</Label>
                <Switch
                  checked={form.is_active}
                  onCheckedChange={(v) => setForm((f) => ({ ...f, is_active: v }))}
                  className="mt-2"
                />
              </div>
            </div>

            {/* Containers */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-base font-semibold">Containers</Label>
                <Button type="button" size="sm" variant="outline" onClick={addContainer}>
                  <Plus className="h-4 w-4 mr-1" /> Add Container
                </Button>
              </div>

              {form.containers.map((c, idx) => (
                <Card key={idx} className="mb-3">
                  <CardHeader className="pb-2 pt-3 px-4">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm">Container {idx + 1}</CardTitle>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => removeContainer(idx)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="px-4 pb-4 space-y-3">
                    <div>
                      <Label>Title</Label>
                      <Input
                        value={c.title}
                        onChange={(e) => updateContainer(idx, { title: e.target.value })}
                        placeholder="e.g. Pooja Needs & More"
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label>Image</Label>
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleContainerImageChange(idx, e)}
                        className="mt-1"
                      />
                      {c.image_url && (
                        <img
                          src={c.image_url}
                          className="mt-1 h-16 w-16 object-cover rounded"
                          alt="container preview"
                        />
                      )}
                    </div>

                    <div className="flex items-center gap-3">
                      <Label>Background Color</Label>
                      <input
                        type="color"
                        value={c.bg_color}
                        onChange={(e) => updateContainer(idx, { bg_color: e.target.value })}
                        className="h-8 w-10 rounded border cursor-pointer"
                      />
                      <span className="text-sm font-mono text-muted-foreground">{c.bg_color}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Link Type</Label>
                        <Select
                          value={c.link_type}
                          onValueChange={(v: any) =>
                            updateContainer(idx, { link_type: v, link_value: "" })
                          }
                        >
                          <SelectTrigger className="mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">None</SelectItem>
                            <SelectItem value="category">Category</SelectItem>
                            <SelectItem value="product">Product</SelectItem>
                            <SelectItem value="url">URL</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {c.link_type !== "none" && (
                        <div>
                          <Label>
                            {c.link_type === "category"
                              ? "Category ID"
                              : c.link_type === "product"
                              ? "Product ID"
                              : "URL"}
                          </Label>
                          <Input
                            value={c.link_value}
                            onChange={(e) => updateContainer(idx, { link_value: e.target.value })}
                            placeholder={
                              c.link_type === "url" ? "https://..." : "Enter ID"
                            }
                            className="mt-1"
                          />
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave}>{editingId ? "Update" : "Create"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
