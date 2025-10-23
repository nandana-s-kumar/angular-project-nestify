// src/app/core/services/admin-api.service.ts
import { Injectable } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { delay } from 'rxjs/operators';
import { AuthService, UserRecord } from './auth.service';
import { ProductService, Product } from './product.service';

export type User = UserRecord; // export a User alias so other modules can import { User }
export interface Order {
  id: string;
  customer: string;
  amount: number;
  status: 'Pending' | 'Completed' | 'Cancelled';
  items?: any[];
}

@Injectable({
  providedIn: 'root'
})
export class AdminApiService {
  private readonly ordersKey = 'demo_orders';

  constructor(private auth: AuthService, private productSvc: ProductService) {
    this._ensureOrdersSeed();
  }

  // ---------------------------
  // Users
  // ---------------------------
  getUsers(): Observable<User[]> {
    // return active + pending + blocked users
    return of(this.auth.listUsers()).pipe(delay(40));
  }

  // ---------------------------
  // Orders (simple localStorage demo)
  // ---------------------------
  private _readOrders(): Order[] {
    try {
      const raw = localStorage.getItem(this.ordersKey);
      return raw ? (JSON.parse(raw) as Order[]) : [];
    } catch {
      return [];
    }
  }

  private _writeOrders(list: Order[]) {
    localStorage.setItem(this.ordersKey, JSON.stringify(list));
  }

  private _ensureOrdersSeed() {
    const existing = this._readOrders();
    if (!existing || existing.length === 0) {
      const seed: Order[] = [
        { id: 'A101', customer: 'Rahul K', amount: 1340, status: 'Pending' },
        { id: 'A102', customer: 'Sana P', amount: 2400, status: 'Completed' },
        { id: 'A103', customer: 'Anil G', amount: 560, status: 'Cancelled' },
      ];
      this._writeOrders(seed);
    }
  }

  getOrders(): Observable<Order[]> {
    return of(this._readOrders()).pipe(delay(60));
  }

  updateOrderStatus(id: string, status: Order['status']): Observable<Order> {
    const list = this._readOrders();
    const idx = list.findIndex(o => o.id === id);
    if (idx === -1) return throwError(() => new Error('Order not found'));
    list[idx].status = status;
    this._writeOrders(list);
    return of(list[idx]).pipe(delay(40));
  }

  // ---------------------------
  // Top users (derived)
  // ---------------------------
  getTopUsers(): Observable<User[]> {
    const users = this.auth.listUsers().filter(u => u.status === 'active');
    return of(users.slice(0, 5)).pipe(delay(40));
  }

  // ---------------------------
  // Products (delegate)
  // ---------------------------
  getProducts(): Observable<Product[]> {
    return this.productSvc.getProducts();
  }
}


