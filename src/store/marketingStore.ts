// admin-panel/src/store/marketingStore.ts
import { create } from 'zustand';

export interface MarketingContainer {
  title: string;
  image_url: string;
  image_data?: string;
  bg_color: string;
  link_type: 'category' | 'product' | 'url' | 'none';
  link_value: string;
}

export interface MarketingBanner {
  id?: string;
  _id?: string;
  title: string;
  subtitle: string;
  image_url: string;
  bg_color: string;
  is_active: boolean;
  order: number;
  auto_rotate_interval: number;
  containers: MarketingContainer[];
  created_at?: string;
  updated_at?: string;
}

interface MarketingState {
  banners: MarketingBanner[];
  setBanners: (banners: MarketingBanner[]) => void;
  addBanner: (banner: MarketingBanner) => void;
  updateBanner: (id: string, updates: Partial<MarketingBanner>) => void;
  deleteBanner: (id: string) => void;
}

export const useMarketingStore = create<MarketingState>((set) => ({
  banners: [],
  setBanners: (banners) => set({ banners }),
  addBanner: (banner) =>
    set((state) => ({ banners: [...state.banners, banner] })),
  updateBanner: (id, updates) =>
    set((state) => ({
      banners: state.banners.map((b) =>
        (b._id === id || b.id === id) ? { ...b, ...updates } : b
      ),
    })),
  deleteBanner: (id) =>
    set((state) => ({
      banners: state.banners.filter((b) => b._id !== id && b.id !== id),
    })),
}));
