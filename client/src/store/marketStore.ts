import { create } from 'zustand';
import { api } from '../lib/api';

export interface Product {
  id: string;
  title: string;
  description: string;
  category: 'credits' | 'outfits' | 'accounts' | 'services';
  price: number;
  creditAmount: number;
  images: string[];
  status: 'available' | 'sold' | 'hidden';
  creator: string;
  createdAt: string;
  updatedAt: string;
}

export interface MarketOrder {
  id: string;
  buyer: string;
  product: string;
  razorpayOrderId: string;
  razorpayPaymentId?: string;
  amount: number;
  status: 'pending' | 'completed' | 'failed';
  createdAt: string;
  updatedAt: string;
}

interface MarketState {
  products: Product[];
  selectedProduct: Product | null;
  orders: MarketOrder[];
  loading: boolean;
  error: string | null;
  fetchProducts: () => Promise<void>;
  createProduct: (data: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  selectProduct: (product: Product | null) => void;
  initiatePurchase: (productId: string) => Promise<{ razorpayOrderId: string; amount: number; key_id: string }>;
  verifyPayment: (data: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => Promise<void>;
  fetchOrders: () => Promise<void>;
  clearError: () => void;
}

export const useMarketStore = create<MarketState>((set) => ({
  products: [],
  selectedProduct: null,
  orders: [],
  loading: false,
  error: null,

  fetchProducts: async () => {
    set({ loading: true, error: null });
    try {
      const res = await api.get('/api/products');
      const data = res.data as { ok: boolean; products: Product[] };
      if (data.ok) {
        set({ products: data.products, loading: false });
      } else {
        set({ error: 'Failed to fetch products', loading: false });
      }
    } catch (err) {
      set({ error: 'Failed to fetch products', loading: false });
    }
  },

  createProduct: async (data) => {
    set({ loading: true, error: null });
    try {
      const res = await api.post('/api/products', data);
      const responseData = res.data as { ok: boolean; product: Product };
      if (responseData.ok) {
        set((state) => ({
          products: [...state.products, responseData.product],
          loading: false,
        }));
      } else {
        set({ error: 'Failed to create product', loading: false });
      }
    } catch (err) {
      set({ error: 'Failed to create product', loading: false });
    }
  },

  selectProduct: (product) => {
    set({ selectedProduct: product });
  },

  initiatePurchase: async (productId) => {
    set({ loading: true, error: null });
    try {
      const res = await api.post('/api/payments/create-order', { productId });
      const data = res.data as { ok: boolean; order: { razorpayOrderId: string; amount: number; key_id: string } };
      if (data.ok) {
        set({ loading: false });
        return {
          razorpayOrderId: data.order.razorpayOrderId,
          amount: data.order.amount,
          key_id: data.order.key_id,
        };
      } else {
        set({ error: 'Failed to initiate purchase', loading: false });
        throw new Error('Failed to initiate purchase');
      }
    } catch (err) {
      set({ error: 'Failed to initiate purchase', loading: false });
      throw err;
    }
  },

  verifyPayment: async (paymentData) => {
    set({ loading: true, error: null });
    try {
      const res = await api.post('/api/payments/verify-payment', paymentData);
      const data = res.data as { ok: boolean; order: MarketOrder };
      if (data.ok) {
        set((state) => ({
          orders: [...state.orders, data.order],
          loading: false,
        }));
      } else {
        set({ error: 'Failed to verify payment', loading: false });
      }
    } catch (err) {
      set({ error: 'Failed to verify payment', loading: false });
    }
  },

  fetchOrders: async () => {
    set({ loading: true, error: null });
    try {
      const res = await api.get('/api/orders');
      const data = res.data as { ok: boolean; orders: MarketOrder[] };
      if (data.ok) {
        set({ orders: data.orders, loading: false });
      } else {
        set({ error: 'Failed to fetch orders', loading: false });
      }
    } catch (err) {
      set({ error: 'Failed to fetch orders', loading: false });
    }
  },

  clearError: () => {
    set({ error: null });
  },
}));
