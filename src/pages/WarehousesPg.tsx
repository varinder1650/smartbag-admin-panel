import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { wsService } from "@/services/websocket";
import { WsErrorData } from "@/types/websocket";
import { useToast } from "@/hooks/use-toast";
import {
  Plus,
  Search,
  Warehouse as WarehouseIcon,
  Edit,
  Loader2,
  MapPin,
  Copy,
  MapPinned,
  Trash2,
  Ticket,
} from "lucide-react";

interface HubData {
  id: string;
  hub_id: string;
  name: string;
  city: string;
  is_active: boolean;
}

interface PgWarehouseData {
  id: string;
  warehouse_id: string;
  hub_id: string;
  hub_name: string;
  hub_hub_id: string;
  name: string;
  address: string;
  lat: number | null;
  lng: number | null;
  is_active: boolean;
  pincode_count: number;
  created_at: string;
  updated_at: string;
}

interface PincodeMapping {
  id: string;
  pincode: string;
  priority: number;
}

interface PincodeData {
  pincodeId?: string;
  pincode: string;
  city: string;
  state: string;
  status: boolean;
}

export default function WarehousesPgPage() {
  const { toast } = useToast();
  const [warehouses, setWarehouses] = useState<PgWarehouseData[]>([]);
  const [hubs, setHubs] = useState<HubData[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPincodeModal, setShowPincodeModal] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState<PgWarehouseData | null>(null);
  const [selectedWarehouse, setSelectedWarehouse] = useState<PgWarehouseData | null>(null);
  const [pincodes, setPincodes] = useState<PincodeMapping[]>([]);
  const [allPincodes, setAllPincodes] = useState<PincodeData[]>([]);
  const [showAddPincodeModal, setShowAddPincodeModal] = useState(false);
  const [addPincodeForm, setAddPincodeForm] = useState({ warehouse_id: "", pincode: "", priority: "" });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState({
    hub_id: "",
    name: "",
    address: "",
    lat: "",
    lng: "",
    is_active: true,
  });

  const [newPincode, setNewPincode] = useState({ pincode: "", priority: "" });

  useEffect(() => {
    wsService.send({ type: "get_pg_warehouses" });
    wsService.send({ type: "get_hubs" });
    wsService.send({ type: "get_pincodes" });

    const cleanupWh = wsService.onMessage<{ warehouses?: PgWarehouseData[] }>(
      "pg_warehouses_data",
      (message) => {
        if (message.warehouses) {
          setWarehouses(message.warehouses);
          setIsLoading(false);
        }
      }
    );

    const cleanupHubs = wsService.onMessage<{ hubs?: HubData[] }>(
      "hubs_data",
      (message) => {
        if (message.hubs) setHubs(message.hubs);
      }
    );

    const cleanupCreated = wsService.onMessage("pg_warehouse_created", () => {
      setIsSaving(false);
      setShowAddModal(false);
      toast({ title: "Warehouse Created", description: "New warehouse added" });
    });

    const cleanupUpdated = wsService.onMessage("pg_warehouse_updated", () => {
      setIsSaving(false);
      setShowAddModal(false);
      toast({ title: "Warehouse Updated" });
    });

    const cleanupPincodes = wsService.onMessage<{
      warehouse_id?: string;
      pincodes?: PincodeMapping[];
    }>("warehouse_pincodes_data", (message) => {
      if (message.pincodes) setPincodes(message.pincodes);
    });

    const cleanupPcAssigned = wsService.onMessage("warehouse_pincodes_assigned", () => {
      setIsSaving(false);
      toast({ title: "Pincodes Assigned" });
      if (selectedWarehouse) {
        wsService.send({
          type: "get_warehouse_pincodes",
          data: { warehouse_id: selectedWarehouse.warehouse_id },
        });
        wsService.send({ type: "get_pg_warehouses" });
      }
    });

    const cleanupPcDeleted = wsService.onMessage("warehouse_pincode_deleted", () => {
      toast({ title: "Pincode Removed" });
      if (selectedWarehouse) {
        wsService.send({
          type: "get_warehouse_pincodes",
          data: { warehouse_id: selectedWarehouse.warehouse_id },
        });
        wsService.send({ type: "get_pg_warehouses" });
      }
    });

    const cleanupAllPincodes = wsService.onMessage<{ available_pincodes?: PincodeData[] }>(
      "pincodes_data",
      (message) => {
        if (message.available_pincodes) setAllPincodes(message.available_pincodes);
      }
    );

    const cleanupError = wsService.onMessage<WsErrorData>("error", (data) => {
      setIsLoading(false);
      setIsSaving(false);
      toast({
        title: "Error",
        description: data.message || "An error occurred",
        variant: "destructive",
      });
    });

    return () => {
      cleanupWh();
      cleanupHubs();
      cleanupCreated();
      cleanupUpdated();
      cleanupPincodes();
      cleanupPcAssigned();
      cleanupPcDeleted();
      cleanupAllPincodes();
      cleanupError();
    };
  }, [toast, selectedWarehouse]);

  const filtered = warehouses.filter((w) => {
    const term = searchQuery.toLowerCase();
    return (
      (w.name || "").toLowerCase().includes(term) ||
      (w.warehouse_id || "").toLowerCase().includes(term) ||
      (w.hub_name || "").toLowerCase().includes(term) ||
      (w.address || "").toLowerCase().includes(term)
    );
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    if (editingWarehouse) {
      wsService.send({
        type: "update_pg_warehouse",
        data: {
          warehouse_id: editingWarehouse.warehouse_id,
          name: formData.name,
          address: formData.address,
          lat: formData.lat,
          lng: formData.lng,
          is_active: formData.is_active,
        },
      });
    } else {
      wsService.send({
        type: "create_pg_warehouse",
        data: {
          hub_id: formData.hub_id,
          name: formData.name,
          address: formData.address,
          lat: formData.lat,
          lng: formData.lng,
        },
      });
    }
  };

  const handleEdit = (wh: PgWarehouseData) => {
    setFormData({
      hub_id: wh.hub_hub_id,
      name: wh.name,
      address: wh.address,
      lat: wh.lat?.toString() || "",
      lng: wh.lng?.toString() || "",
      is_active: wh.is_active,
    });
    setEditingWarehouse(wh);
    setTimeout(() => setShowAddModal(true), 0);
  };

  const openPincodeModal = (wh: PgWarehouseData) => {
    setSelectedWarehouse(wh);
    wsService.send({
      type: "get_warehouse_pincodes",
      data: { warehouse_id: wh.warehouse_id },
    });
    setShowPincodeModal(true);
  };

  const handleAddPincode = () => {
    if (!newPincode.pincode || !newPincode.priority || !selectedWarehouse) return;
    setIsSaving(true);
    wsService.send({
      type: "assign_warehouse_pincodes",
      data: {
        warehouse_id: selectedWarehouse.warehouse_id,
        pincodes: [
          { pincode: newPincode.pincode, priority: parseInt(newPincode.priority) },
        ],
      },
    });
    setNewPincode({ pincode: "", priority: "" });
  };

  const handleDeletePincode = (pincode: string) => {
    if (!selectedWarehouse) return;
    wsService.send({
      type: "delete_warehouse_pincode",
      data: {
        warehouse_id: selectedWarehouse.warehouse_id,
        pincode,
      },
    });
  };

  const handleStandaloneAddPincode = (e: React.FormEvent) => {
    e.preventDefault();
    if (!addPincodeForm.warehouse_id || !addPincodeForm.pincode || !addPincodeForm.priority) return;
    setIsSaving(true);
    wsService.send({
      type: "assign_warehouse_pincodes",
      data: {
        warehouse_id: addPincodeForm.warehouse_id,
        pincodes: [{ pincode: addPincodeForm.pincode, priority: parseInt(addPincodeForm.priority) }],
      },
    });
    setAddPincodeForm({ warehouse_id: "", pincode: "", priority: "" });
    setShowAddPincodeModal(false);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied!", description: `${text} copied to clipboard` });
  };

  const resetForm = () => {
    setEditingWarehouse(null);
    setFormData({ hub_id: "", name: "", address: "", lat: "", lng: "", is_active: true });
    setShowAddModal(false);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <WarehouseIcon className="h-8 w-8" />
            Warehouses (Inventory)
          </h1>
          <p className="text-muted-foreground">
            Multi-warehouse inventory system — manage warehouses under hubs with pincode priorities
          </p>
        </div>

        <div className="flex gap-2">
        <Dialog open={showAddPincodeModal} onOpenChange={(open) => { setShowAddPincodeModal(open); if (!open) setAddPincodeForm({ warehouse_id: "", pincode: "", priority: "" }); }}>
          <DialogTrigger asChild>
            <Button variant="outline">
              <Ticket className="h-4 w-4 mr-2" />
              Add Pincode
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add Pincode to Warehouse</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleStandaloneAddPincode} className="space-y-4">
              <div>
                <Label>Warehouse *</Label>
                <Select
                  value={addPincodeForm.warehouse_id}
                  onValueChange={(val) => setAddPincodeForm((p) => ({ ...p, warehouse_id: val }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a warehouse" />
                  </SelectTrigger>
                  <SelectContent>
                    {warehouses.filter((w) => w.is_active).map((w) => (
                      <SelectItem key={w.warehouse_id} value={w.warehouse_id}>
                        {w.name} ({w.warehouse_id})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Pincode *</Label>
                <Select
                  value={addPincodeForm.pincode}
                  onValueChange={(val) => setAddPincodeForm((p) => ({ ...p, pincode: val }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a pincode" />
                  </SelectTrigger>
                  <SelectContent>
                    {allPincodes.filter((p) => p.status).map((p) => (
                      <SelectItem key={p.pincodeId || p.pincode} value={p.pincode}>
                        {p.pincode} — {p.city}, {p.state}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="ap_priority">Priority *</Label>
                <Input
                  id="ap_priority"
                  type="number"
                  min={1}
                  placeholder="e.g. 1"
                  value={addPincodeForm.priority}
                  onChange={(e) => setAddPincodeForm((p) => ({ ...p, priority: e.target.value }))}
                  required
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setShowAddPincodeModal(false)} disabled={isSaving}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSaving || !addPincodeForm.warehouse_id || !addPincodeForm.pincode || !addPincodeForm.priority}>
                  {isSaving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Adding...</> : "Add Pincode"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={showAddModal} onOpenChange={(open) => { setShowAddModal(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button onClick={() => { resetForm(); }}>
              <Plus className="h-4 w-4 mr-2" />
              Add Warehouse
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingWarehouse ? "Edit Warehouse" : "Add New Warehouse"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              {!editingWarehouse && (
                <div>
                  <Label>Hub *</Label>
                  <Select
                    value={formData.hub_id}
                    onValueChange={(val) => setFormData((p) => ({ ...p, hub_id: val }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a hub" />
                    </SelectTrigger>
                    <SelectContent>
                      {hubs
                        .filter((h) => h.is_active)
                        .map((h) => (
                          <SelectItem key={h.hub_id} value={h.hub_id}>
                            {h.name} ({h.hub_id})
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div>
                <Label htmlFor="wh_name">Warehouse Name *</Label>
                <Input
                  id="wh_name"
                  placeholder="e.g. North Delhi Warehouse"
                  value={formData.name}
                  onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                  required
                />
              </div>
              <div>
                <Label htmlFor="wh_address">Address *</Label>
                <Input
                  id="wh_address"
                  placeholder="Full street address"
                  value={formData.address}
                  onChange={(e) => setFormData((p) => ({ ...p, address: e.target.value }))}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="wh_lat">Latitude</Label>
                  <Input
                    id="wh_lat"
                    type="number"
                    step="any"
                    placeholder="e.g. 28.7041"
                    value={formData.lat}
                    onChange={(e) => setFormData((p) => ({ ...p, lat: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="wh_lng">Longitude</Label>
                  <Input
                    id="wh_lng"
                    type="number"
                    step="any"
                    placeholder="e.g. 77.1025"
                    value={formData.lng}
                    onChange={(e) => setFormData((p) => ({ ...p, lng: e.target.value }))}
                  />
                </div>
              </div>
              {editingWarehouse && (
                <div className="flex items-center space-x-2">
                  <Label htmlFor="wh_status">Active</Label>
                  <Switch
                    id="wh_status"
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData((p) => ({ ...p, is_active: checked }))}
                  />
                </div>
              )}
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => { setShowAddModal(false); resetForm(); }} disabled={isSaving}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" />{editingWarehouse ? "Updating..." : "Creating..."}</>
                  ) : editingWarehouse ? "Update Warehouse" : "Create Warehouse"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {/* Pincode management modal */}
      <Dialog open={showPincodeModal} onOpenChange={setShowPincodeModal}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Pincode Mappings — {selectedWarehouse?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Select
                value={newPincode.pincode}
                onValueChange={(val) => setNewPincode((p) => ({ ...p, pincode: val }))}
              >
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Select pincode" />
                </SelectTrigger>
                <SelectContent>
                  {allPincodes
                    .filter((p) => p.status && !pincodes.some((ap) => ap.pincode === p.pincode))
                    .map((p) => (
                      <SelectItem key={p.pincodeId || p.pincode} value={p.pincode}>
                        {p.pincode} — {p.city}, {p.state}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <Input
                placeholder="Priority"
                type="number"
                min={1}
                value={newPincode.priority}
                onChange={(e) => setNewPincode((p) => ({ ...p, priority: e.target.value }))}
                className="w-24"
              />
              <Button onClick={handleAddPincode} disabled={isSaving || !newPincode.pincode || !newPincode.priority}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pincode</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pincodes.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>
                      <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{p.pincode}</code>
                    </TableCell>
                    <TableCell>
                      <Badge variant={p.priority === 1 ? "default" : "secondary"}>
                        P{p.priority}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-600 hover:text-red-700"
                        onClick={() => handleDeletePincode(p.pincode)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {pincodes.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground py-4">
                      No pincodes assigned yet
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <CardTitle>Warehouse Management</CardTitle>
          <CardDescription>
            {isLoading ? "Loading..." : `${filtered.length} warehouse(s) found`}
          </CardDescription>
          <div className="flex items-center gap-4 mt-4">
            <div className="flex-1 flex items-center space-x-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search warehouses..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="max-w-sm"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
              <p className="text-muted-foreground">Loading warehouses...</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Warehouse ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Hub</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead>Coords</TableHead>
                  <TableHead>Pincodes</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((w) => (
                  <TableRow key={w.id}>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                          {w.warehouse_id}
                        </code>
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => copyToClipboard(w.warehouse_id)}>
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{w.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{w.hub_name || w.hub_hub_id}</Badge>
                    </TableCell>
                    <TableCell className="max-w-[150px] truncate">{w.address}</TableCell>
                    <TableCell>
                      {w.lat && w.lng ? (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <MapPin className="h-3 w-3" />
                          {Number(w.lat).toFixed(4)}, {Number(w.lng).toFixed(4)}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground italic">Not set</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button size="sm" variant="outline" onClick={() => openPincodeModal(w)}>
                        <MapPinned className="h-3 w-3 mr-1" />
                        {w.pincode_count}
                      </Button>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={w.is_active ? "active" : "inactive"} />
                    </TableCell>
                    <TableCell>
                      <Button size="sm" variant="outline" onClick={() => handleEdit(w)} disabled={isSaving}>
                        <Edit className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {!isLoading && filtered.length === 0 && (
            <div className="text-center py-8">
              <WarehouseIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No warehouses found.</p>
              <p className="text-sm text-muted-foreground mt-2">
                {searchQuery ? "Try adjusting your search" : "Click 'Add Warehouse' to get started"}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
