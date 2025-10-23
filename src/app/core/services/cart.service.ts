// import { Injectable } from '@angular/core';
// import { BehaviorSubject } from 'rxjs';
// import { Product } from '../models/product.model';

// export interface CartEntry {
//   product: Product;
//   quantity: number;
// }

// @Injectable({
//   providedIn: 'root'
// })
// export class CartService {
  
//   private readonly STORAGE_KEY = 'app_cart_v1';
//   private _cart$ = new BehaviorSubject<CartEntry[]>(this.loadFromStorage());
//   public cart$ = this._cart$.asObservable();

//   constructor() {}

//   private saveToStorage(entries: CartEntry[]) {
//     try {
//       localStorage.setItem(this.STORAGE_KEY, JSON.stringify(entries));
//     } catch (e) {
//       console.warn('cart save failed', e);
//     }
//   }

//   private loadFromStorage(): CartEntry[] {
//     try {
//       const raw = localStorage.getItem(this.STORAGE_KEY);
//       return raw ? JSON.parse(raw) : [];
//     } catch (e) {
//       console.warn('cart load failed', e);
//       return [];
//     }
//   }

//   getCartSnapshot(): CartEntry[] {
//     return this._cart$.getValue();
//   }

//   addToCart(product: Product, qty = 1) {
//     if (!product) return;
//     const entries = this.getCartSnapshot().map(e => ({ ...e }));
//     const productKey = String(product.id);
//     const idx = entries.findIndex(e => String(e.product.id) === productKey);
//     if (idx > -1) {
//       entries[idx].quantity += Math.max(1, Math.floor(qty));
//     } else {
//       entries.push({ product, quantity: Math.max(1, Math.floor(qty)) });
//     }
//     this._cart$.next(entries);
//     this.saveToStorage(entries);
//   }

//   // accept string | number for id
//   updateQuantity(productId: string | number, quantity: number) {
//     const entries = this.getCartSnapshot().map(e => ({ ...e }));
//     const key = String(productId);
//     const idx = entries.findIndex(e => String(e.product.id) === key);
//     if (idx === -1) return;
//     entries[idx].quantity = Math.max(1, Math.floor(quantity));
//     this._cart$.next(entries);
//     this.saveToStorage(entries);
//   }

//   removeFromCart(productId: string | number) {
//     const key = String(productId);
//     const entries = this.getCartSnapshot().filter(e => String(e.product.id) !== key);
//     this._cart$.next(entries);
//     this.saveToStorage(entries);
//   }

//   clearCart() {
//     this._cart$.next([]);
//     this.saveToStorage([]);
//   }

//   // defensive price handling
//   getSubtotal(entry: CartEntry): number {
//     const price = Number(entry.product.price ?? 0);
//     return +(price * entry.quantity);
//   }

//   getTotal(): number {
//     return +this.getCartSnapshot()
//       .reduce((s, e) => s + (Number(e.product.price ?? 0) * e.quantity), 0);
//   }

//   getTotalItems(): number {
//     return this.getCartSnapshot().reduce((s, e) => s + e.quantity, 0);
//   }
// }


// src/app/core/services/cart.service.ts
import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Subscription } from 'rxjs';
import { Product } from '../models/product.model';
import { AuthService } from './auth.service';

export interface CartEntry {
  product: Product;
  quantity: number;
}

@Injectable({
  providedIn: 'root'
})
export class CartService implements OnDestroy {
  private readonly GUEST_KEY = 'guest_cart_v1';
  private cartKeyPrefix = 'cart_'; // final key: cart_<normalized-email>

  // BehaviorSubject contains entries for current user/guest
  private _cart$ = new BehaviorSubject<CartEntry[]>([]);
  public cart$ = this._cart$.asObservable();

  private authSub?: Subscription;

  constructor(private auth: AuthService) {
    // initialize current cart depending on login state
    this.loadCurrentCart();

    // when login state changes, swap/migrate carts
    this.authSub = this.auth.isLoggedIn$.subscribe((logged) => {
      this.onAuthChanged(logged);
    });
  }

  ngOnDestroy(): void {
    this.authSub?.unsubscribe();
  }

  // ---------------------- storage helpers ----------------------
  private normalizeEmail(email?: string) {
    return (email || '').trim().toLowerCase();
  }

  private userCartKey(email?: string) {
    const norm = this.normalizeEmail(email);
    return norm ? `${this.cartKeyPrefix}${norm}` : this.GUEST_KEY;
  }

  private readFromKey(key: string): CartEntry[] {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) as CartEntry[] : [];
    } catch (e) {
      console.warn('Failed to read cart from storage', e);
      return [];
    }
  }

  private saveToKey(key: string, entries: CartEntry[]) {
    try {
      localStorage.setItem(key, JSON.stringify(entries));
    } catch (e) {
      console.warn('Failed to save cart to storage', e);
    }
  }

  // load cart for current user (or guest) into BehaviorSubject
  private loadCurrentCart() {
    const cur = this.auth.currentUser();
    const key = this.userCartKey(cur?.email);
    const entries = this.readFromKey(key);
    this._cart$.next(entries);
  }

  // When auth changes: if logging in -> migrate guest cart into user cart.
  // If logging out -> load guest cart (keep user cart persisted).
  private onAuthChanged(loggedIn: boolean) {
    const cur = this.auth.currentUser(); // might be null when logged out
    const userKey = this.userCartKey(cur?.email);

    if (loggedIn && cur) {
      // merge guest cart into user's existing cart
      const guest = this.readFromKey(this.GUEST_KEY);
      const user = this.readFromKey(userKey);

      // create map by product id (string)
      const mergedMap = new Map<string, CartEntry>();
      user.forEach(e => mergedMap.set(String(e.product.id), { product: e.product, quantity: e.quantity }));
      guest.forEach(e => {
        const key = String(e.product.id);
        if (mergedMap.has(key)) mergedMap.get(key)!.quantity += Math.max(1, Math.floor(e.quantity));
        else mergedMap.set(key, { product: e.product, quantity: Math.max(1, Math.floor(e.quantity)) });
      });

      const merged = Array.from(mergedMap.values());
      // persist merged to user key and clear guest cart
      this.saveToKey(userKey, merged);
      this.saveToKey(this.GUEST_KEY, []); // clear guest cart after migration
      this._cart$.next(merged);
      return;
    }

    // on logout or no user: load guest cart
    const guestEntries = this.readFromKey(this.GUEST_KEY);
    this._cart$.next(guestEntries);
  }

  // ---------------------- public API ----------------------

  // snapshot of current cart
  getCartSnapshot(): CartEntry[] {
    // return a shallow clone to avoid external mutation
    return this._cart$.getValue().map(e => ({ product: e.product, quantity: e.quantity }));
  }

  private persistCurrent(entries: CartEntry[]) {
    const cur = this.auth.currentUser();
    const key = this.userCartKey(cur?.email);
    this.saveToKey(key, entries);
    this._cart$.next(entries);
  }

  addToCart(product: Product, qty = 1) {
    if (!product) return;
    const entries = this.getCartSnapshot().map(e => ({ ...e }));
    const productKey = String(product.id);
    const idx = entries.findIndex(e => String(e.product.id) === productKey);
    if (idx > -1) {
      entries[idx].quantity += Math.max(1, Math.floor(qty));
    } else {
      entries.push({ product, quantity: Math.max(1, Math.floor(qty)) });
    }
    this.persistCurrent(entries);
  }

  updateQuantity(productId: string | number, quantity: number) {
    const entries = this.getCartSnapshot().map(e => ({ ...e }));
    const key = String(productId);
    const idx = entries.findIndex(e => String(e.product.id) === key);
    if (idx === -1) return;
    entries[idx].quantity = Math.max(1, Math.floor(quantity));
    this.persistCurrent(entries);
  }

  removeFromCart(productId: string | number) {
    const key = String(productId);
    const entries = this.getCartSnapshot().filter(e => String(e.product.id) !== key);
    this.persistCurrent(entries);
  }

  clearCart() {
    this.persistCurrent([]);
  }

  // defensive price handling
  getSubtotal(entry: CartEntry): number {
    const price = Number(entry.product.price ?? 0);
    return +(price * entry.quantity);
  }

  getTotal(): number {
    return +this.getCartSnapshot()
      .reduce((s, e) => s + (Number(e.product.price ?? 0) * e.quantity), 0);
  }

  getTotalItems(): number {
    return this.getCartSnapshot().reduce((s, e) => s + e.quantity, 0);
  }
}
