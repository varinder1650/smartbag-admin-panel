import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Edit, Trash2, Package } from "lucide-react";
import { getPrimaryImageUrl, getImageUrls } from "@/utils/imageHelpers";
import { formatCurrency } from "@/utils/formatters";
import { Product } from "@/types/product";

interface ProductsTableProps {
  products: Product[];
  isLoading: boolean;
  onEdit: (product: Product) => void;
  onDelete: (productId: string) => void;
}

export const ProductsTable = ({ 
  products, 
  isLoading, 
  onEdit, 
  onDelete 
}: ProductsTableProps) => {
  if (isLoading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground">Loading products...</p>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="text-center py-8">
        <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground">No products found</p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Product ID</TableHead>
          <TableHead>Images</TableHead>
          <TableHead>Name</TableHead>
          <TableHead>Selling Price</TableHead>
          <TableHead>Stock</TableHead>
          <TableHead>Category</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Keywords</TableHead>
          <TableHead>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {products.map((product) => {
          const primaryImageUrl = getPrimaryImageUrl(product.images);
          const imageUrls = getImageUrls(product.images);
          
          return (
            <TableRow key={product.id}>
              <TableCell className="font-mono text-xs text-muted-foreground">{product.id}</TableCell>
              <TableCell>
                <div className="flex items-center space-x-1">
                  {primaryImageUrl ? (
                    <img
                      src={primaryImageUrl}
                      alt={product.name}
                      className="h-12 w-12 rounded-lg object-cover border"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        if (e.currentTarget.nextElementSibling) {
                          (e.currentTarget.nextElementSibling as HTMLElement).style.display = 'flex';
                        }
                      }}
                    />
                  ) : null}
                  
                  <div 
                    className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center border"
                    style={{ display: primaryImageUrl ? 'none' : 'flex' }}
                  >
                    <Package className="h-6 w-6 text-muted-foreground" />
                  </div>
                  
                  {imageUrls.length > 1 && (
                    <div className="h-12 w-8 rounded-lg bg-muted flex items-center justify-center text-xs font-medium border">
                      +{imageUrls.length - 1}
                    </div>
                  )}
                </div>
              </TableCell>
              <TableCell className="font-medium">{product.name}</TableCell>
              <TableCell>{formatCurrency(product.selling_price)}</TableCell>
              <TableCell>
                <span className={product.stock < 1 ? 'text-destructive font-medium' : ''}>
                  {product.stock}
                </span>
              </TableCell>
              <TableCell>
                <Badge variant="secondary">{product.category}</Badge>
              </TableCell>
              <TableCell>
                <StatusBadge status={product.status} />
              </TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-1">
                  {product.keywords?.slice(0, 2).map((keyword, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {keyword}
                    </Badge>
                  ))}
                  {(product.keywords?.length || 0) > 2 && (
                    <Badge variant="outline" className="text-xs">
                      +{(product.keywords?.length || 0) - 2}
                    </Badge>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <div className="flex space-x-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onEdit(product)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => onDelete(product.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
};