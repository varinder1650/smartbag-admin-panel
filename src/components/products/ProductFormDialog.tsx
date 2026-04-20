import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ImageUploader } from "@/components/products/ImageUploader";
import { Product, Brand, Category, Warehouse } from "@/types/product";
import { isValidPrice, isValidStock } from "@/utils/validation";
import { useToast } from "@/hooks/use-toast";

interface ProductFormDialogProps {
  open: boolean;
  product: Product | null;
  brands: Brand[];
  categories: Category[];
  warehouses: Warehouse[];
  onClose: () => void;
  onSubmit: (data: any) => void;
}

export const ProductFormDialog = ({
  open,
  product,
  brands,
  categories,
  warehouses,
  onClose,
  onSubmit,
}: ProductFormDialogProps) => {
  const { toast } = useToast();
  const [images, setImages] = useState<string[]>([]);
  const [mockupTemplate, setMockupTemplate] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    name: "",
    actual_price: "",
    selling_price: "",
    discount: "",
    stock: "",
    category: "",
    brand: "",
    warehouse: "",
    status: "active",
    keywords: "",
    description: "",
    allow_user_images: false,
    allow_user_description: false,
    mockup_template_url: "",
    printable_area_x: "25",
    printable_area_y: "20",
    printable_area_width: "50",
    printable_area_height: "60",
  });

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name || "",
        actual_price: product.actual_price?.toString() || "",
        selling_price: product.selling_price?.toString() || "",
        discount: product.discount?.toString() || "",
        stock: product.stock?.toString() || "",
        category: product.category || "",
        brand: product.brand || "",
        warehouse: product.warehouse || "",
        status: product.status || "active",
        keywords: product.keywords?.join(', ') || "",
        description: product.description || "",
        allow_user_images: product.allow_user_images || false,
        allow_user_description: product.allow_user_description || false,
        mockup_template_url: product.mockup_template_url || "",
        printable_area_x: product.printable_area ? String(product.printable_area.x * 100) : "25",
        printable_area_y: product.printable_area ? String(product.printable_area.y * 100) : "20",
        printable_area_width: product.printable_area ? String(product.printable_area.width * 100) : "50",
        printable_area_height: product.printable_area ? String(product.printable_area.height * 100) : "60",
      });
      setImages([]);
      setMockupTemplate([]);
    } else {
      setFormData({
        name: "",
        actual_price: "",
        selling_price: "",
        discount: "",
        stock: "",
        category: "",
        brand: "",
        warehouse: "",
        status: "active",
        keywords: "",
        description: "",
        allow_user_images: false,
        allow_user_description: false,
        mockup_template_url: "",
        printable_area_x: "25",
        printable_area_y: "20",
        printable_area_width: "50",
        printable_area_height: "60",
      });
      setImages([]);
      setMockupTemplate([]);
    }
  }, [product, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isValidPrice(formData.selling_price)) {
      toast({ title: "Invalid Price", variant: "destructive" });
      return;
    }

    if (!isValidStock(formData.stock)) {
      toast({ title: "Invalid Stock", variant: "destructive" });
      return;
    }

    if (!formData.warehouse) {
      toast({ title: "Warehouse Required", description: "Please select a warehouse for this product", variant: "destructive" });
      return;
    }

    const data = {
      name: formData.name,
      actual_price: formData.actual_price ? parseFloat(formData.actual_price) : null,
      selling_price: parseFloat(formData.selling_price),
      discount: ((parseFloat(formData.actual_price) - parseFloat(formData.selling_price)) / parseFloat(formData.actual_price)) * 100,
      stock: parseInt(formData.stock),
      category: formData.category,
      brand: formData.brand,
      warehouse: formData.warehouse,
      status: formData.status,
      description: formData.description,
      keywords: formData.keywords.split(',').map(k => k.trim()).filter(Boolean),
      allow_user_images: formData.allow_user_images,
      allow_user_description: formData.allow_user_description,
      ...(images.length > 0 && { images }),
      ...(formData.allow_user_images && {
        mockup_template_url: formData.mockup_template_url || undefined,
        printable_area: {
          x: parseFloat(formData.printable_area_x) / 100,
          y: parseFloat(formData.printable_area_y) / 100,
          width: parseFloat(formData.printable_area_width) / 100,
          height: parseFloat(formData.printable_area_height) / 100,
        },
        ...(mockupTemplate.length > 0 && { mockup_template: mockupTemplate }),
      }),
    };

    if (product) {
      onSubmit({ id: product.id, ...data });
    } else {
      onSubmit(data);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{product ? 'Edit Product' : 'Add New Product'}</DialogTitle>
          <DialogDescription>
            {product ? 'Update product information' : 'Fill in the details to create a new product'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Product Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="actual_price">Actual Price (MRP) (₹)</Label>
              <Input
                id="actual_price"
                type="number"
                step="0.01"
                value={formData.actual_price}
                onChange={(e) => setFormData({ ...formData, actual_price: e.target.value })}
                placeholder="Original price"
              />
              <p className="text-xs text-muted-foreground">
                Leave empty if no discount
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="price">Selling Price (₹) *</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                value={formData.selling_price}
                onChange={(e) => setFormData({ ...formData, selling_price: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Discount</Label>
              <div className="h-10 flex items-center">
                {formData.actual_price && formData.selling_price && parseFloat(formData.actual_price) > parseFloat(formData.selling_price) ? (
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold text-green-600">
                      {Math.round(((parseFloat(formData.actual_price) - parseFloat(formData.selling_price)) / parseFloat(formData.actual_price)) * 100)}%
                    </span>
                    <span className="text-sm text-muted-foreground">OFF</span>
                  </div>
                ) : (
                  <span className="text-sm text-muted-foreground">No discount</span>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="stock">Stock *</Label>
              <Input
                id="stock"
                type="number"
                value={formData.stock}
                onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData({ ...formData, category: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="brand">Brand</Label>
              <Select
                value={formData.brand}
                onValueChange={(value) => setFormData({ ...formData, brand: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select brand" />
                </SelectTrigger>
                <SelectContent>
                  {brands.map((brand) => (
                    <SelectItem key={brand.id} value={brand.id}>
                      {brand.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="warehouse">Warehouse *</Label>
            <Select
              value={formData.warehouse}
              onValueChange={(value) => setFormData({ ...formData, warehouse: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select warehouse" />
              </SelectTrigger>
              <SelectContent>
                {warehouses.filter(w => w.status).map((warehouse) => (
                  <SelectItem key={warehouse.id} value={warehouse.id}>
                    {warehouse.name}{warehouse.city ? ` — ${warehouse.city}, ${warehouse.state}` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Select the warehouse where this product is available for pickup
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select 
              value={formData.status} 
              onValueChange={(value) => setFormData({ ...formData, status: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <ImageUploader
            images={images}
            onChange={setImages}
            maxImages={10}
            existingImages={product?.images}
          />

          <div className="space-y-2">
            <Label htmlFor="keywords">Keywords (comma-separated)</Label>
            <Input
              id="keywords"
              placeholder="smartphone, electronics, mobile..."
              value={formData.keywords}
              onChange={(e) => setFormData({ ...formData, keywords: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              placeholder="Enter product description..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              required
              rows={4}
            />
          </div>

          {/* ✅ NEW: User Interaction Toggles */}
          <div className="border rounded-lg p-4 space-y-4 bg-muted/50">
            <div className="space-y-2">
              <Label className="text-base font-semibold">Customer Interaction Options</Label>
              <p className="text-sm text-muted-foreground">
                Allow customers to contribute content for this product
              </p>
            </div>

            <div className="flex items-center justify-between space-x-4 p-3 bg-background rounded-md">
              <div className="space-y-0.5 flex-1">
                <Label htmlFor="allow-images" className="font-medium">
                  Allow Customer Images
                </Label>
                <p className="text-sm text-muted-foreground">
                  Let customers upload product photos from their device
                </p>
              </div>
              <Switch
                id="allow-images"
                checked={formData.allow_user_images}
                onCheckedChange={(checked) => 
                  setFormData({ ...formData, allow_user_images: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between space-x-4 p-3 bg-background rounded-md">
              <div className="space-y-0.5 flex-1">
                <Label htmlFor="allow-description" className="font-medium">
                  Allow Customer Reviews
                </Label>
                <p className="text-sm text-muted-foreground">
                  Let customers add their own product reviews and feedback
                </p>
              </div>
              <Switch
                id="allow-description"
                checked={formData.allow_user_description}
                onCheckedChange={(checked) => 
                  setFormData({ ...formData, allow_user_description: checked })
                }
              />
            </div>
          </div>

          {formData.allow_user_images && (
            <div className="border rounded-lg p-4 space-y-4 bg-blue-50/50">
              <div className="space-y-2">
                <Label className="text-base font-semibold">Mockup Template Setup</Label>
                <p className="text-sm text-muted-foreground">
                  Upload a mockup image and define the printable area where customer images will appear
                </p>
              </div>

              <ImageUploader
                images={mockupTemplate}
                onChange={setMockupTemplate}
                maxImages={1}
                existingImages={product?.mockup_template_url ? [product.mockup_template_url] : undefined}
              />

              <div className="space-y-2">
                <Label className="font-medium">Printable Area (%)</Label>
                <p className="text-xs text-muted-foreground">
                  Define where the customer's image appears on the mockup (values are percentages of the template dimensions)
                </p>
                <div className="grid grid-cols-4 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="pa-x" className="text-xs">Left (X)</Label>
                    <Input
                      id="pa-x"
                      type="number"
                      min="0"
                      max="100"
                      value={formData.printable_area_x}
                      onChange={(e) => setFormData({ ...formData, printable_area_x: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="pa-y" className="text-xs">Top (Y)</Label>
                    <Input
                      id="pa-y"
                      type="number"
                      min="0"
                      max="100"
                      value={formData.printable_area_y}
                      onChange={(e) => setFormData({ ...formData, printable_area_y: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="pa-w" className="text-xs">Width</Label>
                    <Input
                      id="pa-w"
                      type="number"
                      min="0"
                      max="100"
                      value={formData.printable_area_width}
                      onChange={(e) => setFormData({ ...formData, printable_area_width: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="pa-h" className="text-xs">Height</Label>
                    <Input
                      id="pa-h"
                      type="number"
                      min="0"
                      max="100"
                      value={formData.printable_area_height}
                      onChange={(e) => setFormData({ ...formData, printable_area_height: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">
              {product ? 'Update Product' : 'Create Product'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};