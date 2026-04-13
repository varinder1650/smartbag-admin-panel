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
import { wsService } from "@/services/websocket";
import { WsErrorData } from "@/types/websocket";
import { useToast } from "@/hooks/use-toast";
import {
  Plus,
  Search,
  Edit,
  Loader2,
  Building2,
  Copy,
} from "lucide-react";

interface HubData {
  id?: string;
  hub_id: string;
  name: string;
  city: string;
  is_active: boolean;
  warehouse_count?: number;
  created_at?: string;
  updated_at?: string;
}

export default function HubsPage() {
  const { toast } = useToast();
  const [hubs, setHubs] = useState<HubData[]>([]);
  const [editingHub, setEditingHub] = useState<HubData | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState({
    hub_id: "",
    name: "",
    city: "",
    is_active: true,
  });

  useEffect(() => {
    wsService.send({ type: "get_hubs" });

    const cleanupHubsData = wsService.onMessage<{ hubs?: HubData[] }>(
      "hubs_data",
      (message) => {
        if (message.hubs) {
          setHubs(message.hubs);
          setIsLoading(false);
        }
      }
    );

    const cleanupHubCreated = wsService.onMessage("hub_created", () => {
      setIsSaving(false);
      setShowAddModal(false);
      toast({
        title: "Hub Created",
        description: "New hub has been added successfully",
      });
    });

    const cleanupHubUpdated = wsService.onMessage("hub_updated", () => {
      setIsSaving(false);
      setShowAddModal(false);
      toast({
        title: "Hub Updated",
        description: "Hub has been updated successfully",
      });
    });

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
      cleanupHubsData();
      cleanupHubCreated();
      cleanupHubUpdated();
      cleanupError();
    };
  }, [toast]);

  const filteredHubs = hubs.filter((h) => {
    const term = searchQuery.toLowerCase();
    return (
      (h.name || "").toLowerCase().includes(term) ||
      (h.hub_id || "").toLowerCase().includes(term) ||
      (h.city || "").toLowerCase().includes(term)
    );
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    if (editingHub) {
      wsService.send({
        type: "update_hub",
        data: {
          hub_id: editingHub.hub_id,
          name: formData.name,
          city: formData.city,
          is_active: formData.is_active,
        },
      });
    } else {
      wsService.send({
        type: "create_hub",
        data: {
          hub_id: formData.hub_id,
          name: formData.name,
          city: formData.city,
        },
      });
    }

    resetForm();
  };

  const handleEdit = (hub: HubData) => {
    setFormData({
      hub_id: hub.hub_id,
      name: hub.name,
      city: hub.city,
      is_active: hub.is_active,
    });
    setEditingHub(hub);
    setTimeout(() => setShowAddModal(true), 0);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied!", description: `${text} copied to clipboard` });
  };

  const resetForm = () => {
    setEditingHub(null);
    setFormData({ hub_id: "", name: "", city: "", is_active: true });
    setShowAddModal(false);
  };

  const handleModalClose = (open: boolean) => {
    setShowAddModal(open);
    if (!open) resetForm();
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Building2 className="h-8 w-8" />
            Hubs
          </h1>
          <p className="text-muted-foreground">
            Manage hub locations that group warehouses
          </p>
        </div>

        <Dialog open={showAddModal} onOpenChange={handleModalClose}>
          <DialogTrigger asChild>
            <Button
              onClick={() => {
                setEditingHub(null);
                setFormData({ hub_id: "", name: "", city: "", is_active: true });
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Hub
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {editingHub ? "Edit Hub" : "Add New Hub"}
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              {!editingHub && (
                <div>
                  <Label htmlFor="hub_id">Hub ID *</Label>
                  <Input
                    id="hub_id"
                    placeholder="e.g. HUB-DELHI-01"
                    value={formData.hub_id}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, hub_id: e.target.value }))
                    }
                    required
                  />
                </div>
              )}

              <div>
                <Label htmlFor="name">Hub Name *</Label>
                <Input
                  id="name"
                  placeholder="e.g. Delhi North Hub"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, name: e.target.value }))
                  }
                  required
                />
              </div>

              <div>
                <Label htmlFor="city">City *</Label>
                <Input
                  id="city"
                  placeholder="e.g. Delhi"
                  value={formData.city}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, city: e.target.value }))
                  }
                  required
                />
              </div>

              {editingHub && (
                <div className="flex items-center space-x-2">
                  <Label htmlFor="is_active">Active</Label>
                  <Switch
                    id="is_active"
                    checked={formData.is_active}
                    onCheckedChange={(checked) =>
                      setFormData((prev) => ({ ...prev, is_active: checked }))
                    }
                  />
                </div>
              )}

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleModalClose(false)}
                  disabled={isSaving}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {editingHub ? "Updating..." : "Creating..."}
                    </>
                  ) : editingHub ? (
                    "Update Hub"
                  ) : (
                    "Create Hub"
                  )}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Hub Management</CardTitle>
          <CardDescription>
            {isLoading ? "Loading..." : `${filteredHubs.length} hub(s) found`}
          </CardDescription>
          <div className="flex items-center gap-4 mt-4">
            <div className="flex-1 flex items-center space-x-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search hubs..."
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
              <p className="text-muted-foreground">Loading hubs...</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Hub ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>City</TableHead>
                  <TableHead>Warehouses</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredHubs.map((h) => (
                  <TableRow key={h.id || h.hub_id}>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                          {h.hub_id}
                        </code>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={() => copyToClipboard(h.hub_id)}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{h.name}</TableCell>
                    <TableCell>{h.city}</TableCell>
                    <TableCell>{h.warehouse_count || 0}</TableCell>
                    <TableCell>
                      <StatusBadge status={h.is_active ? "active" : "inactive"} />
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(h)}
                        disabled={isSaving}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {!isLoading && filteredHubs.length === 0 && (
            <div className="text-center py-8">
              <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No hubs found.</p>
              <p className="text-sm text-muted-foreground mt-2">
                {searchQuery
                  ? "Try adjusting your search"
                  : "Click 'Add Hub' to create your first hub"}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
