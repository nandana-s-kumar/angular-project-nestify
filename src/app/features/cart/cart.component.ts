import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { CartService, CartEntry } from 'src/app/core/services/cart.service';

@Component({
  selector: 'app-cart',
  templateUrl: './cart.component.html',
  styleUrls: ['./cart.component.css']
})
export class CartComponent implements OnInit, OnDestroy {
  cartEntries: CartEntry[] = [];
  total = 0;
  private sub?: Subscription;

  constructor(private cartService: CartService) {}

  ngOnInit(): void {
    this.sub = this.cartService.cart$.subscribe((entries: CartEntry[]) => {
      this.cartEntries = entries;
      this.recalculate();
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  recalculate() {
    this.total = this.cartService.getTotal();
  }

  increase(entry: CartEntry) {
    const id = entry.product.id;
    this.cartService.updateQuantity(id, entry.quantity + 1);
  }

  decrease(entry: CartEntry) {
    const newQty = Math.max(1, entry.quantity - 1);
    const id = entry.product.id;
    this.cartService.updateQuantity(id, newQty);
  }

  onQtyChange(entry: CartEntry, event: Event) {
    const input = event.target as HTMLInputElement;
    const val = Number(input.value);
    const id = entry.product.id;
    if (isNaN(val) || val < 1) {
      input.value = String(entry.quantity);
      return;
    }
    this.cartService.updateQuantity(id, Math.floor(val));
  }

  remove(entry: CartEntry) {
    const id = entry.product.id;
    this.cartService.removeFromCart(id);
  }

  clearAll() {
    this.cartService.clearCart();
  }
}
