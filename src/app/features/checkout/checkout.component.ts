// src/app/features/checkout/checkout.component.ts

import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subscription, firstValueFrom } from 'rxjs';
import { CartEntry, CartService } from 'src/app/core/services/cart.service';
import { OrderService } from 'src/app/core/services/order.service';
import { Router } from '@angular/router';
import { Order,OrderItem,PaymentMethod,ShippingAddress } from 'src/app/core/models/order.model';
import { AuthService } from 'src/app/core/services/auth.service';

@Component({
  selector: 'app-checkout',
  templateUrl: './checkout.component.html',
  styleUrls: ['./checkout.component.css']
})
export class CheckoutComponent implements OnInit, OnDestroy {
  cartEntries: CartEntry[] = [];
  subtotal = 0;
  shippingFee = 0;
  total = 0;

  shippingForm!: FormGroup;
  paymentMethod: PaymentMethod = 'COD';
  placingOrder = false;
  error?: string;

  private subs: Subscription[] = [];

  constructor(
    private cartService: CartService,
    private fb: FormBuilder,
    private orderService: OrderService,
    private router: Router,
    private auth: AuthService
  ) {}

  ngOnInit(): void {
    // Protect page: use isLoggedIn$ observable from your AuthService.
    // If your AuthService exposes a BehaviorSubject/Observable named isLoggedIn$ (as error indicated),
    // subscribe and redirect if not logged in.
    const s1 = this.auth.isLoggedIn$?.subscribe((logged) => {
      if (!logged) {
        // redirect to login with return url
        this.router.navigate(['/login'], { queryParams: { returnUrl: '/checkout' } });
      }
    });
    if (s1) this.subs.push(s1);

    this.shippingForm = this.fb.group({
      fullName: ['', [Validators.required, Validators.minLength(2)]],
      phone: ['', [Validators.required, Validators.pattern(/^[0-9+\- ]{6,20}$/)]],
      addressLine1: ['', Validators.required],
      addressLine2: [''],
      city: ['', Validators.required],
      state: ['', Validators.required],
      postalCode: ['', [Validators.required, Validators.minLength(3)]],
      country: ['', Validators.required]
    });

    this.loadCart();
    this.recalculate();
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
  }

  loadCart() {
    this.cartEntries = this.cartService.getCartSnapshot();
    this.recalculate();
  }

  recalculate() {
    this.subtotal = this.cartService.getTotal();
    this.shippingFee = this.subtotal > 1000 ? 0 : (this.subtotal === 0 ? 0 : 50);
    this.total = +(this.subtotal + this.shippingFee);
  }

  setPayment(method: PaymentMethod) {
    this.paymentMethod = method;
  }

  // helper: try to synchronously obtain a user id from your AuthService using several possible shapes.
  // This avoids compile-time errors if your AuthService doesn't expose getUserId().
  private tryGetUserIdSync(): string | number | undefined {
    const a: any = this.auth as any;

    // common pattern: a method getUserId()
    if (typeof a.getUserId === 'function') {
      try { return a.getUserId(); } catch { /* ignore */ }
    }

    // common pattern: a synchronous currentUser object
    if (a.currentUser && (typeof a.currentUser === 'object') && ('id' in a.currentUser || 'userId' in a.currentUser)) {
      return a.currentUser.id ?? a.currentUser.userId;
    }

    // common pattern: a BehaviorSubject/Observable currentUser$ with a getValue (BehaviorSubject)
    if (a.currentUser$ && typeof a.currentUser$?.getValue === 'function') {
      const u = a.currentUser$.getValue();
      return u?.id ?? u?.userId;
    }

    // fallback: no id available synchronously
    return undefined;
  }

  // place order
  async placeOrder() {
    this.error = undefined;

    if (this.cartEntries.length === 0) {
      this.error = 'Your cart is empty.';
      return;
    }

    if (this.shippingForm.invalid) {
      this.shippingForm.markAllAsTouched();
      this.error = 'Please complete the shipping address.';
      return;
    }

    // ensure user is logged in right now (double-check via isLoggedIn$)
    // use firstValueFrom to get latest value
    try {
      const logged = await firstValueFrom(this.auth.isLoggedIn$);
      if (!logged) {
        this.router.navigate(['/login'], { queryParams: { returnUrl: '/checkout' } });
        return;
      }
    } catch {
      // if something goes wrong reading the observable, continue but don't set user id
    }

    this.placingOrder = true;

    const shipping: ShippingAddress = this.shippingForm.value;
    const items: OrderItem[] = this.cartEntries.map((e) => ({
      productId: e.product.id,
      name: e.product.name,
      price: Number(e.product.price ?? 0),
      quantity: e.quantity
    }));

    // try to find a userId (if available) without assuming AuthService shape
    const userId = this.tryGetUserIdSync();

    const order: Order = {
      items,
      shippingAddress: shipping,
      paymentMethod: this.paymentMethod,
      subtotal: this.subtotal,
      shippingFee: this.shippingFee,
      total: this.total,
      status: 'pending',
      createdAt: new Date().toISOString(),
      userId: userId
    };

    this.orderService.placeOrder(order).subscribe({
      next: resp => {
        this.placingOrder = false;
        if (resp && (resp as any).success) {
          this.cartService.clearCart();
          const orderId = (resp as any).orderId ?? (resp as any).id;
          this.router.navigate(['/order-success'], { queryParams: { id: orderId } });
        } else {
          this.error = 'Failed to place order. Please try again.';
        }
      },
      error: err => {
        console.error('place order error', err);
        this.placingOrder = false;
        this.error = 'An error occurred while placing the order.';
      }
    });
  }
}
