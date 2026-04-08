export type OrderType = "product" | "printout" | "porter" | "mixed";

export type OrderStatus =
  | "preparing"
  | "assigning"
  | "assigned"
  | "out_for_delivery"
  | "delivered"
  | "cancelled";

export interface StatusHistory {
  status: OrderStatus;
  changed_at: string;
  changed_by?: string;
  message?: string;
}

export interface Address {
  name?: string;
  address?: string;
  street?: string;
  city: string;
  state: string;
  pincode: string;
  phone?: string;
  mobile_number?: string;
}

export interface ProductItem {
  type: "product";
  product: string;
  product_name?: string;
  product_image?: string[];
  quantity: number;
  price: number;
  warehouse_name?: string;
  warehouse_id?: string;
}

export interface PrintoutItem {
  type: "printout";
  service_data: {
    file_urls: string[];
    copies: number;
    color: boolean;
    paper_size: string;
    notes?: string;
    price: number;
  };
}

export interface PorterItem {
  type: "porter";
  service_data: {
    pickup_address: Address;
    delivery_address: Address;
    estimated_distance: number;
    estimated_cost: number;
    notes?: string;
    recipient_name?: string;
    phone?: string;
  };
}

export type OrderItem = ProductItem | PrintoutItem | PorterItem;

export interface Order {
  id: string;
  order_type: OrderType;
  status: OrderStatus;
  status_history?: StatusHistory[];
  customer?: {
    id: string;
    name: string;
    email: string;
    phone?: string;
  };
  delivery_partner_name?: string;
  delivery_address?: Address;
  items?: OrderItem[];
  payment_method?: string;
  payment_status?: string;
  total: number;
  created_at: string;
}

export interface PaginationInfo {
  current_page: number;
  total_pages: number;
  total_items: number;
  has_next: boolean;
  has_prev: boolean;
}

export interface OrderFilters {
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
  from_date?: string;
  to_date?: string;
}