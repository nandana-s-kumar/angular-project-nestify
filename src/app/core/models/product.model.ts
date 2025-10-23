export interface Product {
  id: number | string;
  name: string;
  category?: string;
  brand?: string;
  price?: number;
  image?: string;
  images?: string[];
  description?: string;
  stock?: number;
  rating?: number;
}
