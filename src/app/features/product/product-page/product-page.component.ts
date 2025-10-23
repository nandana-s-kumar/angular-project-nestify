import { Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Product } from 'src/app/core/models/product.model';
import { ProductService } from 'src/app/core/services/product.service';

type SortKey = 'name' | 'priceAsc' | 'priceDesc' | 'rating' | 'stock';

@Component({
  selector: 'app-product-page',
  templateUrl: './product-page.component.html',
  styleUrls: ['./product-page.component.css']
})
export class ProductPageComponent implements OnInit {
  activeRoute = inject(ActivatedRoute)

  products: Product[] = [];
  filtered: Product[] = [];
  // categories: string[] = ['All'];
    categories: any = ['All','Living-Room','Bed-Room','Dinning','Kitchen' ];


  searchTerm = '';
  selectedCategory = 'All';
  sortBy: SortKey = 'name';

  itemsPerPage = 12;
  page = 1;
  totalPages = 1;

  loading = false;
  error = '';

  constructor(private productService: ProductService, private router: Router) {}

  ngOnInit(): void {
    this.loading = true;
    this.productService.getProducts().subscribe({
      next: (products) => {
        this.products = products ?? [];
        this.categories = ['All', ...Array.from(new Set(this.products.map(p => p.category).filter(Boolean)))];
        this.applyFilters();
        this.loading = false;
      },
      error: (err) => {
        console.error('Failed to load products', err);
        this.error = 'Failed to load products';
        this.products = [];
        this.applyFilters();
        this.loading = false;
      }
    });

    this.activeRoute.queryParams.subscribe((params)=>{
      if(params['cat']){
        this.selectedCategory = params['cat']
      }
    })



  }

  getPrimaryImage(product?: Product): string {
    if (!product) return 'assets/images/placeholder.png';
    if (product.image) return product.image;
    if (Array.isArray(product.images) && product.images.length) return product.images[0];
    return 'assets/images/placeholder.png';
  }

  onSearchChange() {
    this.page = 1;
    this.applyFilters();
  }

  onCategorySelect(cat: string) {
    this.selectedCategory = cat;
    this.page = 1;
    this.applyFilters();
  }

  onSortChange() {
    this.page = 1;
    this.applyFilters();
  }


  private applyFilters() {
    let result = this.products.filter(p => {
      return this.selectedCategory === 'All' || (p.category ?? '') === this.selectedCategory;
    });

    const q = this.searchTerm.trim().toLowerCase();
    if (q) {
      result = result.filter(p => {
        const name = (p.name || '').toString().toLowerCase();
        const desc = (p.description || '').toString().toLowerCase();
        return name.includes(q) || desc.includes(q);
      });
    }

    result.sort((a, b) => {
      switch (this.sortBy) {
        case 'name': return (a.name || '').localeCompare(b.name || '');
        case 'priceAsc': return (a.price ?? 0) - (b.price ?? 0);
        case 'priceDesc': return (b.price ?? 0) - (a.price ?? 0);
        case 'rating': return (b.rating ?? 0) - (a.rating ?? 0);
        case 'stock': return (b.stock ?? 0) - (a.stock ?? 0);
        default: return 0;
      }
    });

    this.filtered = result;
    this.totalPages = Math.max(1, Math.ceil(this.filtered.length / this.itemsPerPage));
    if (this.page > this.totalPages) this.page = this.totalPages;
  }

  getDisplayedProducts(): Product[] {
    const start = (this.page - 1) * this.itemsPerPage;
    return this.filtered.slice(start, start + this.itemsPerPage);
  }

  prevPage() {
    if (this.page > 1) this.page--;
  }

  nextPage() {
    if (this.page < this.totalPages) this.page++;
  }
}
