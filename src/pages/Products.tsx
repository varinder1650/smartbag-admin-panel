import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ProductsTable } from "@/components/products/ProductsTable";
import { ProductFormDialog } from "@/components/products/ProductFormDialog";
import { wsService } from "@/services/websocket";
import { useToast } from "@/hooks/use-toast";
import { Product, Brand, Category, Warehouse } from "@/types/product";
import { WsProductsData, WsErrorData } from "@/types/websocket";
import { Plus, Search, Package } from "lucide-react";

export default function Products() {
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const handleProductsData = (data: WsProductsData) => {
      setProducts(data.products || []);
      setCategories(data.categories || []);
      setBrands(data.brands || []);
      setIsLoading(false);
    };

    const handleProductCreated = () => {
      wsService.send({ type: 'get_products' });
      setShowForm(false);
      toast({ title: "Product Created" });
    };

    const handleProductUpdated = () => {
      wsService.send({ type: 'get_products' });
      setShowForm(false);
      toast({ title: "Product Updated" });
    };

    const handleProductDeleted = () => {
      wsService.send({ type: 'get_products' });
      toast({ title: "Product Deleted" });
    };

    const handleWarehousesData = (data: { warehouses?: any[] }) => {
      if (data.warehouses) {
        setWarehouses(
          data.warehouses.map((w) => ({
            id: w.warehouse_id,
            name: w.name,
            address: "",
            city: "",
            state: "",
            status: true,
          }))
        );
      }
    };

    const handleError = (data: WsErrorData) => {
      setIsLoading(false);
      if (!data.message?.includes('Unknown message type')) {
        toast({ title: "Error", description: data.message, variant: "destructive" });
      }
    };

    const cleanups = [
      wsService.onMessage("products_data", handleProductsData),
      wsService.onMessage("product_created", handleProductCreated),
      wsService.onMessage("product_updated", handleProductUpdated),
      wsService.onMessage("product_deleted", handleProductDeleted),
      wsService.onMessage("pg_warehouses_data", handleWarehousesData),
      wsService.onMessage("error", handleError),
    ];

    wsService.send({ type: 'get_products' });
    wsService.send({ type: 'get_pg_warehouses' });

    return () => {
      cleanups.forEach(cleanup => cleanup());
    };
  }, [toast]);

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (product.category && product.category.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setShowForm(true);
  };

  const handleDelete = (productId: string) => {
    if (confirm("Are you sure you want to delete this product? This will also delete all images.")) {
      wsService.send({ type: 'delete_product', data: { id: productId } });
    }
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingProduct(null);
  };

  const handleFormSubmit = (data: Partial<Product> & { images?: File[] }) => {
    const type = editingProduct ? 'update_product' : 'create_product';
    wsService.send({ type, data });
    toast({ 
      title: editingProduct ? "Updating Product" : "Creating Product",
      description: data.images?.length > 0 ? `Uploading ${data.images.length} images...` : "Please wait..."
    });
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Package className="h-8 w-8" />
            Products
          </h1>
          <p className="text-muted-foreground">Manage your product catalog</p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Product
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Product Catalog</CardTitle>
          <CardDescription>
            {isLoading ? "Loading..." : `${filteredProducts.length} products found`}
          </CardDescription>
          
          <div className="flex items-center space-x-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-sm"
              disabled={isLoading}
            />
          </div>
        </CardHeader>

        <CardContent>
          <ProductsTable
            products={filteredProducts}
            isLoading={isLoading}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        </CardContent>
      </Card>

      <ProductFormDialog
        open={showForm}
        product={editingProduct}
        brands={brands}
        categories={categories}
        warehouses={warehouses}
        onClose={handleFormClose}
        onSubmit={handleFormSubmit}
      />
    </div>
  );
}