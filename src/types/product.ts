export interface ImageObject {
    url?: string;
    secure_url?: string;
    original?: string;
    thumbnail?: string;
  }
  
  export interface Product {
    id: string;
    _id?: string;
    name: string;
    actual_price: number;
    selling_price:number;
    discount: number;
    stock: number;
    category: string;
    brand: string;
    status: 'active' | 'inactive';
    images: string[] | ImageObject[];
    keywords?: string[];
    description: string;
    created_at?: string;
    updated_at?: string;
    allow_user_images: boolean;
    allow_user_description: boolean;
    mockup_template_url?: string;
    printable_area?: {
        x: number;
        y: number;
        width: number;
        height: number;
    };
    warehouse?: string;
  }

  export interface Warehouse {
    id: string;
    name: string;
    address: string;
    city: string;
    state: string;
    latitude?: number;
    longitude?: number;
    status: boolean;
    created_at?: string;
  }
  
  export interface Brand {
    id: string;
    _id?: string;
    name: string;
    description?: string;
    logo?: string;
    status: 'active' | 'inactive';
    created_at?: string;
    createdAt?: string;
  }
  
  export interface Category {
    id: string;
    _id?: string;
    name: string;
    description?: string;
    image?: string;
    parentId?: string;
    status: 'active' | 'inactive';
    created_at?: string;
    createdAt?: string;
  }