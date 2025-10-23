// src/app/models/order.model.ts

import { Product } from './product.model';

export interface ShippingAddress {
  fullName: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export type PaymentMethod = 'COD' | 'CARD' | 'UPI';

export interface OrderItem {
  productId: number | string;
  name?: string;
  price?: number;
  quantity: number;
}

export interface Order {
  id?: string | number;
  userId?: string | number;
  items: OrderItem[];
  shippingAddress: ShippingAddress;
  paymentMethod: PaymentMethod;
  subtotal: number;
  shippingFee: number;
  total: number;
  createdAt?: string;
  status?: string;
}
