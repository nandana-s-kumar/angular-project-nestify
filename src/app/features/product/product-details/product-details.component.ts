import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Location } from '@angular/common';
import { Subscription } from 'rxjs';
import { Product } from 'src/app/core/models/product.model';
import { ProductService } from 'src/app/core/services/product.service';
import { CartService } from 'src/app/core/services/cart.service';

@Component({
  selector: 'app-product-details',
  templateUrl: './product-details.component.html',
  styleUrls: ['./product-details.component.css']
})
export class ProductDetailsComponent implements OnInit, OnDestroy {
  product?: Product;
  productId!: number;
  quantity = 1;
  private sub?: Subscription;
  loading=true;
  errorMessage?:string;

  constructor(
    private route: ActivatedRoute,
    private productService: ProductService,
    private cartService: CartService,
    private router: Router,
    private location: Location
  ) {}

  ngOnInit(): void {
    this.loading = true;
    const idParam = this.route.snapshot.paramMap.get('id');
    if (!idParam) {
      this.errorMessage = 'Missing product id';
      this.loading = false;
      console.error(this.errorMessage);
      return;
    }

    // Coerce to number because ProductService.getProductById expects a number
    const idNum = Number(idParam);
    if (Number.isNaN(idNum)) {
      this.errorMessage = `Invalid product id: ${idParam}`;
      this.loading = false;
      console.error(this.errorMessage);
      return;
    }

    this.productId = idNum;

    // call service with number
    this.sub = this.productService.getProductById(this.productId).subscribe({
      next: p => {
        this.product = p;
        this.loading = false;
      },
      error: err => {
        console.error('Failed to load product', err);
        this.errorMessage = 'Failed to load product';
        this.loading = false;
      }
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  addToCart(andNavigateToCart = true) {
    if (!this.product) return;
    const qty = Math.max(1, Math.floor(this.quantity || 1));
    this.cartService.addToCart(this.product, qty);
    if (andNavigateToCart) this.router.navigate(['/cart']);
  }

  goBack() {
    this.location.back();
  }

  getPrimaryImage(prod?: Product): string {
    if (!prod) return 'assets/placeholder.png';
    if ((prod as any).image) return (prod as any).image;
    const imgs = (prod as any).images as string[] | undefined;
    return imgs && imgs.length ? imgs[0] : 'assets/placeholder.png';
  }
}