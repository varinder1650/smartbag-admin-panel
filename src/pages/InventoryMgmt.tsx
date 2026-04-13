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
import { Badge } from "@/components/ui/badge";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { wsService } from "@/services/websocket";
import { WsErrorData } from "@/types/websocket";
import { useToast } from "@/hooks/use-toast";
import {
  Package,
  Plus,
  Search,
  Loader2,
  AlertTriangle,
  History,
  ArrowUp,
  ArrowDown,
} from "lucide-react";

interface InventoryItem {
  id: string;
  warehouse_id: string;
  warehouse_name: string;
  warehouse_str_id: string;
  sku_id: string;
  qty: number;
  reserved_qty: number;
  available_qty: number;
  reorder_threshold: number;
  last_updated: string;
}

interface AuditEntry {
  id: string;
  warehouse_id: string;
  warehouse_name: string;
  sku_id: string;
  delta: number;
  reason: string;
  reference_id: string | null;
  created_at: string;
}

interface LowStockItem {
  warehouse_id: string;
  warehouse_name: string;
  warehouse_str_id: string;
  sku_id: string;
  qty: number;
  reserved_qty: number;
  available_qty: number;
  reorder_threshold: number;
}

interface PgWarehouse {
  warehouse_id: string;
  name: string;
}

export default function InventoryMgmtPage() {
  const { toast } = useToast();
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [audits, setAudits] = useState<AuditEntry[]>([]);
  const [lowStock, setLowStock] = useState<LowStockItem[]>([]);
  const [warehouses, setWarehouses] = useState<PgWarehouse[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterWarehouse, setFilterWarehouse] = useState("all");
  const [showRestockModal, setShowRestockModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("inventory");
  const [auditWarehouse, setAuditWarehouse] = useState("");

  const [restockForm, setRestockForm] = useState({
    warehouse_id: "",
    sku_id: "",
    qty: "",
    reference_id: "",
  });

  useEffect(() => {
    wsService.send({ type: "get_inventory", data: {} });
    wsService.send({ type: "get_low_stock", data: {} });
    wsService.send({ type: "get_pg_warehouses" });

    const cleanupInv = wsService.onMessage<{ inventory?: InventoryItem[] }>(
      "inventory_data",
      (message) => {
        if (message.inventory) {
          setInventory(message.inventory);
          setIsLoading(false);
        }
      }
    );

    const cleanupRestocked = wsService.onMessage("inventory_restocked", () => {
      setIsSaving(false);
      setShowRestockModal(false);
      toast({ title: "Inventory Restocked", description: "Stock updated successfully" });
      wsService.send({ type: "get_inventory", data: {} });
      wsService.send({ type: "get_low_stock", data: {} });
    });

    const cleanupAudit = wsService.onMessage<{
      audits?: AuditEntry[];
    }>("inventory_audit_data", (message) => {
      if (message.audits) setAudits(message.audits);
    });

    const cleanupLow = wsService.onMessage<{ items?: LowStockItem[] }>(
      "low_stock_data",
      (message) => {
        if (message.items) setLowStock(message.items);
      }
    );

    const cleanupWh = wsService.onMessage<{ warehouses?: PgWarehouse[] }>(
      "pg_warehouses_data",
      (message) => {
        if (message.warehouses) {
          setWarehouses(
            message.warehouses.map((w: any) => ({
              warehouse_id: w.warehouse_id,
              name: w.name,
            }))
          );
        }
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
      cleanupInv();
      cleanupRestocked();
      cleanupAudit();
      cleanupLow();
      cleanupWh();
      cleanupError();
    };
  }, [toast]);

  const filteredInventory = inventory.filter((item) => {
    const term = searchQuery.toLowerCase();
    const matchesSearch =
      item.sku_id.toLowerCase().includes(term) ||
      item.warehouse_name.toLowerCase().includes(term) ||
      item.warehouse_str_id.toLowerCase().includes(term);
    const matchesWarehouse =
      filterWarehouse === "all" || item.warehouse_str_id === filterWarehouse;
    return matchesSearch && matchesWarehouse;
  });

  const handleRestock = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    wsService.send({
      type: "restock_inventory",
      data: {
        warehouse_id: restockForm.warehouse_id,
        sku_id: restockForm.sku_id,
        qty: parseInt(restockForm.qty),
        reference_id: restockForm.reference_id || "admin_restock",
      },
    });
  };

  const loadAuditLog = (warehouseId: string) => {
    setAuditWarehouse(warehouseId);
    wsService.send({
      type: "get_inventory_audit",
      data: { warehouse_id: warehouseId, limit: 50, offset: 0 },
    });
  };

  const reasonBadgeVariant = (reason: string) => {
    switch (reason) {
      case "manual_restock":
        return "default";
      case "order_reserved":
        return "secondary";
      case "order_delivered":
        return "outline";
      case "order_cancelled":
        return "destructive";
      default:
        return "outline";
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Package className="h-8 w-8" />
            Inventory Management
          </h1>
          <p className="text-muted-foreground">
            Manage stock levels across warehouses
          </p>
        </div>

        <Dialog open={showRestockModal} onOpenChange={setShowRestockModal}>
          <DialogTrigger asChild>
            <Button onClick={() => setRestockForm({ warehouse_id: "", sku_id: "", qty: "", reference_id: "" })}>
              <Plus className="h-4 w-4 mr-2" />
              Restock
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Restock Warehouse</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleRestock} className="space-y-4">
              <div>
                <Label>Warehouse *</Label>
                <Select
                  value={restockForm.warehouse_id}
                  onValueChange={(val) => setRestockForm((p) => ({ ...p, warehouse_id: val }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select warehouse" />
                  </SelectTrigger>
                  <SelectContent>
                    {warehouses.map((w) => (
                      <SelectItem key={w.warehouse_id} value={w.warehouse_id}>
                        {w.name} ({w.warehouse_id})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="sku_id">SKU ID *</Label>
                <Input
                  id="sku_id"
                  placeholder="e.g. prod_001"
                  value={restockForm.sku_id}
                  onChange={(e) => setRestockForm((p) => ({ ...p, sku_id: e.target.value }))}
                  required
                />
              </div>
              <div>
                <Label htmlFor="restock_qty">Quantity *</Label>
                <Input
                  id="restock_qty"
                  type="number"
                  min={1}
                  placeholder="e.g. 100"
                  value={restockForm.qty}
                  onChange={(e) => setRestockForm((p) => ({ ...p, qty: e.target.value }))}
                  required
                />
              </div>
              <div>
                <Label htmlFor="ref_id">Reference ID</Label>
                <Input
                  id="ref_id"
                  placeholder="e.g. PO-2026-001"
                  value={restockForm.reference_id}
                  onChange={(e) => setRestockForm((p) => ({ ...p, reference_id: e.target.value }))}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setShowRestockModal(false)} disabled={isSaving}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Restocking...</> : "Restock"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="inventory">
            <Package className="h-4 w-4 mr-2" /> Inventory
          </TabsTrigger>
          <TabsTrigger value="low-stock">
            <AlertTriangle className="h-4 w-4 mr-2" /> Low Stock
            {lowStock.length > 0 && (
              <Badge variant="destructive" className="ml-2 text-xs">{lowStock.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="audit">
            <History className="h-4 w-4 mr-2" /> Audit Log
          </TabsTrigger>
        </TabsList>

        <TabsContent value="inventory">
          <Card>
            <CardHeader>
              <CardTitle>Stock Levels</CardTitle>
              <CardDescription>
                {isLoading ? "Loading..." : `${filteredInventory.length} item(s)`}
              </CardDescription>
              <div className="flex items-center gap-4 mt-4">
                <div className="flex-1 flex items-center space-x-2">
                  <Search className="h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by SKU or warehouse..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="max-w-sm"
                  />
                </div>
                <Select value={filterWarehouse} onValueChange={setFilterWarehouse}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="All warehouses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Warehouses</SelectItem>
                    {warehouses.map((w) => (
                      <SelectItem key={w.warehouse_id} value={w.warehouse_id}>
                        {w.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>SKU ID</TableHead>
                      <TableHead>Warehouse</TableHead>
                      <TableHead>Total Qty</TableHead>
                      <TableHead>Reserved</TableHead>
                      <TableHead>Available</TableHead>
                      <TableHead>Threshold</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Updated</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredInventory.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{item.sku_id}</code>
                        </TableCell>
                        <TableCell className="text-sm">
                          {item.warehouse_name}
                          <span className="text-xs text-muted-foreground ml-1">
                            ({item.warehouse_str_id})
                          </span>
                        </TableCell>
                        <TableCell className="font-mono">{item.qty}</TableCell>
                        <TableCell className="font-mono">{item.reserved_qty}</TableCell>
                        <TableCell className="font-mono font-semibold">{item.available_qty}</TableCell>
                        <TableCell className="font-mono">{item.reorder_threshold}</TableCell>
                        <TableCell>
                          {item.available_qty <= item.reorder_threshold ? (
                            <Badge variant="destructive">Low</Badge>
                          ) : (
                            <Badge variant="default">OK</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {new Date(item.last_updated).toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}

              {!isLoading && filteredInventory.length === 0 && (
                <div className="text-center py-8">
                  <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No inventory items found.</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Use the Restock button to add stock to a warehouse.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="low-stock">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                Low Stock Alerts
              </CardTitle>
              <CardDescription>
                Items at or below their reorder threshold
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>SKU ID</TableHead>
                    <TableHead>Warehouse</TableHead>
                    <TableHead>Available</TableHead>
                    <TableHead>Threshold</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lowStock.map((item, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{item.sku_id}</code>
                      </TableCell>
                      <TableCell>{item.warehouse_name} ({item.warehouse_str_id})</TableCell>
                      <TableCell>
                        <span className="font-mono font-semibold text-red-600">{item.available_qty}</span>
                      </TableCell>
                      <TableCell className="font-mono">{item.reorder_threshold}</TableCell>
                    </TableRow>
                  ))}
                  {lowStock.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                        No low-stock items
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audit">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Audit Log
              </CardTitle>
              <CardDescription>Track all inventory changes</CardDescription>
              <div className="mt-4">
                <Select value={auditWarehouse} onValueChange={(val) => loadAuditLog(val)}>
                  <SelectTrigger className="w-[300px]">
                    <SelectValue placeholder="Select warehouse to view audit" />
                  </SelectTrigger>
                  <SelectContent>
                    {warehouses.map((w) => (
                      <SelectItem key={w.warehouse_id} value={w.warehouse_id}>
                        {w.name} ({w.warehouse_id})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {!auditWarehouse ? (
                <div className="text-center py-8 text-muted-foreground">
                  Select a warehouse to view its audit log
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>SKU</TableHead>
                      <TableHead>Delta</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Reference</TableHead>
                      <TableHead>Time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {audits.map((a) => (
                      <TableRow key={a.id}>
                        <TableCell>
                          <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{a.sku_id}</code>
                        </TableCell>
                        <TableCell>
                          <span className={`font-mono flex items-center gap-1 ${a.delta > 0 ? "text-green-600" : "text-red-600"}`}>
                            {a.delta > 0 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                            {a.delta > 0 ? "+" : ""}{a.delta}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge variant={reasonBadgeVariant(a.reason)}>
                            {a.reason.replace(/_/g, " ")}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs">{a.reference_id || "-"}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {new Date(a.created_at).toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                    {audits.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                          No audit entries
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
