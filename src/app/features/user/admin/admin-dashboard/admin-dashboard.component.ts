import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AdminApiService, Order, User } from 'src/app/core/services/admin-api.service';
import { AuthService, UserRecord } from 'src/app/core/services/auth.service';
import { Product } from 'src/app/core/models/product.model'; // keep original import (may not include imageUrl/available)

type TopUser = {
  id?: string;
  name: string;
  email?: string;
  orders: number;
  spent: number;
  role?: string;
  status?: string;
};

// Local product shape used by admin UI — extends server Product and adds optional admin-only props
type AdminProduct = Product & {
  id: string | number;
  imageUrl?: string;
  available?: boolean;
  // other optional override fields are allowed
};

@Component({
  selector: 'app-admin-dashboard',
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.css'],
})
export class AdminDashboardComponent implements OnInit {
  adminName = 'Admin';
  searchQuery = '';
  notifications: string[] = [];

  stats: { title: string; value: number | string; delta: number }[] = [];
  orders: Order[] = [];
  displayedOrders: Order[] = [];
  filteredOrders: Order[] = [];
  topUsers: TopUser[] = [];
  users: UserRecord[] = [];

  // modal
  modalOrder: Order | null = null;

  // UI controls
  isSidebarCollapsed = false;
  darkMode = false;
  activeTab: 'dashboard' | 'users' | 'orders' | 'products' | 'settings' = 'dashboard';

  // filters & pagination (orders)
  filterStatus = '';
  minAmount?: number;
  page = 1;
  pageSize = 6;
  totalPages = 1;

  // ---------- Products (integrated) ----------
  products: AdminProduct[] = [];
  displayedProducts: AdminProduct[] = [];
  productPage = 1;
  productPageSize = 8;
  productTotalPages = 1;
  productSearch = '';
  productLoading = false;
  productFeedback = '';

  newProduct: Partial<AdminProduct> = {
    name: '',
    price: 0,
    stock: 0,
    category: '',
    description: '',
    imageUrl: '',
    available: true
  };

  constructor(
    private router: Router,
    private api: AdminApiService,
    private auth: AuthService
  ) {}

  ngOnInit(): void {
    const cur = this.auth?.currentUser ? this.auth.currentUser() : null;
    if (cur) this.adminName = cur.name;
    this.notifications = ['New user signed up', 'Payment failed for order #A102'];

    this.fetchStats();
    this.reloadOrders();
    this.loadTopUsers();
    this.loadUsers();
    this.loadProducts();
  }

  /** NAV / UI */
  setTab(t: any) {
    this.activeTab = t;
    if (t === 'orders') this.reloadOrders();
    if (t === 'users') this.loadUsers();
    if (t === 'products') this.loadProducts();
  }

  toggleSidebar() {
    this.isSidebarCollapsed = !this.isSidebarCollapsed;
  }

  toggleDarkMode() {
    this.darkMode = !this.darkMode;
  }

  openNotifications(): void {
    if (!this.notifications || this.notifications.length === 0) {
      alert('No notifications');
      return;
    }
    const msg = this.notifications.map((n, i) => `${i + 1}. ${n}`).join('\n\n');
    alert(msg);
    this.notifications = [];
  }

  fetchStats() {
    this.stats = [
      { title: 'Total Users', value: this.users.length || '—', delta: 4 },
      { title: 'Active Orders', value: this.orders.filter(o => o.status === 'Pending').length || '—', delta: -2 },
      { title: 'Revenue (M)', value: '—', delta: 7 },
      { title: 'Avg. Order', value: '—', delta: 1.3 },
    ];
  }

  /** ORDERS */
  reloadOrders() {
    this.api.getOrders().subscribe({
      next: (data: Order[]) => {
        this.orders = data || [];
        this.applyFilters();
        this.fetchStats();
      },
      error: (err: any) => {
        console.error('Could not load orders', err);
      }
    });
  }

  onSearch() {
    this.applyFilters();
  }

  applyFilters() {
    let list = [...(this.orders || [])];
    const q = (this.searchQuery || '').trim().toLowerCase();
    if (q) list = list.filter(o => (o.customer || '').toLowerCase().includes(q) || (o.id || '').toLowerCase().includes(q));

    if (this.filterStatus) list = list.filter(o => o.status === this.filterStatus);
    if (this.minAmount) list = list.filter(o => o.amount >= (this.minAmount || 0));

    this.filteredOrders = list;
    this.totalPages = Math.max(1, Math.ceil(this.filteredOrders.length / this.pageSize));
    this.page = Math.min(this.page, this.totalPages);
    this.updateDisplayed();
  }

  updateDisplayed() {
    const start = (this.page - 1) * this.pageSize;
    this.displayedOrders = this.filteredOrders.slice(start, start + this.pageSize);
  }

  prevPage() { if (this.page > 1) { this.page--; this.updateDisplayed(); } }
  nextPage() { if (this.page < this.totalPages) { this.page++; this.updateDisplayed(); } }

  selectOrder(o: Order) {
    console.log('select order', o.id);
  }

  viewOrder(o: Order, ev?: MouseEvent) {
    if (ev) ev.stopPropagation();
    this.modalOrder = o;
  }

  closeModal() { this.modalOrder = null; }

  toggleOrderStatus(o: Order, ev?: MouseEvent) {
    if (ev) ev.stopPropagation();
    const newStatus: Order['status'] = o.status === 'Pending' ? 'Completed' : 'Pending';
    this.api.updateOrderStatus(o.id, newStatus).subscribe({
      next: (updated: Order) => {
        const idx = this.orders.findIndex(x => x.id === updated.id);
        if (idx !== -1) this.orders[idx] = updated;
        this.applyFilters();
        this.fetchStats();
      },
      error: (err: any) => console.error('Failed to update order', err)
    });
  }

  statCardClick(s: any) {
    if (s.title === 'Active Orders') {
      this.setTab('orders');
      this.filterStatus = '';
      this.applyFilters();
    }
  }

  /** USERS */
  loadTopUsers() {
    this.api.getTopUsers().subscribe({
      next: (data: User[] = []) => {
        this.topUsers = (data || []).map(u => ({
          id: (u.email || '').split('@')[0],
          name: u.name || (u.email || ''),
          email: u.email,
          orders: (u as any).orders ?? Math.floor(Math.random() * 10),
          spent: (u as any).spent ?? Math.floor(Math.random() * 50000),
          role: u.role,
          status: (u as any).status ?? 'active'
        }));
      },
      error: (err: any) => { console.error(err); }
    });
  }

  loadUsers() {
    this.api.getUsers().subscribe({
      next: (data: User[]) => { this.users = data || []; this.fetchStats(); },
      error: (err: any) => { console.error(err); }
    });
  }

  acceptUser(u: UserRecord | TopUser) {
    const email = (u as any).email;
    if (!email) return;
    const res = this.auth.acceptUserByEmail(email);
    if (res.success) {
      this.loadUsers();
      this.loadTopUsers();
      alert(res.message);
    } else {
      alert(res.message);
    }
  }

  blockUser(u: UserRecord | TopUser) {
    const email = (u as any).email;
    if (!email) return;
    const res = this.auth.blockUserByEmail(email);
    if (res.success) {
      this.loadUsers();
      this.loadTopUsers();
      alert(res.message);
    } else {
      alert(res.message);
    }
  }

  unblockUser(u: UserRecord | TopUser) {
    this.acceptUser(u);
  }

  deleteUser(u: UserRecord | TopUser) {
    if (!confirm(`Delete user ${(u as any).name || (u as any).email}?`)) return;
    const email = (u as any).email;
    if (!email) return;
    const res = this.auth.removeUserByEmail(email);
    if (res.success) {
      this.loadUsers();
      this.loadTopUsers();
      alert('User deleted.');
    } else {
      alert(res.message);
    }
  }

  editUser(u: UserRecord | TopUser) {
    const email = (u as any).email;
    if (!email) return;
    const newName = prompt('New name', (u as any).name || '');
    if (!newName) return;
    const users = this.auth.listUsers();
    const idx = users.findIndex(x => x.email === (email || '').toLowerCase());
    if (idx === -1) { alert('User not found'); return; }
    users[idx].name = newName;
    this.auth.saveUsers(users);
    this.loadUsers();
    this.loadTopUsers();
    alert('User updated.');
  }

  openUser(u: UserRecord | TopUser) {
    console.log('open user', (u as any).email);
  }

 

  logout() {
    if (this.auth) this.auth.logout();
    this.router.navigate(['/auth/login']).catch(err => console.error('Navigation failed', err));
  }

  // ----------------- Products integration -----------------
  private productStorageKey() { return 'nestify_products'; }

  loadProducts() {
    this.productLoading = true;
    if (this.api && typeof (this.api as any).getProducts === 'function') {
      (this.api as any).getProducts().subscribe({
        next: (data: AdminProduct[] = []) => {
          // normalize each incoming product to AdminProduct shape
          this.products = (data || []).map((x: any) => this.normalizeIncomingProduct(x));
          this.applyProductFilters();
          this.productLoading = false;
        },
        error: (err: any) => {
          console.error('Failed to fetch products from API', err);
          this.products = this.loadProductsFromStorage();
          this.applyProductFilters();
          this.productLoading = false;
        }
      });
    } else {
      this.products = this.loadProductsFromStorage();
      this.applyProductFilters();
      this.productLoading = false;
    }
  }

  private normalizeIncomingProduct(x: any): AdminProduct {
    // Accept server shape but ensure admin-friendly fields exist
    return {
      ...(x || {}),
      id: x.id ?? x._id ?? x.sku ?? this.generateId(),
      imageUrl: x.imageUrl ?? x.image ?? (Array.isArray(x.images) && x.images.length ? x.images[0] : undefined),
      available: typeof x.available === 'boolean' ? x.available : (typeof x.inStock === 'boolean' ? x.inStock : (x.stock && x.stock > 0) ? true : !!x.available),
    } as AdminProduct;
  }

  private loadProductsFromStorage(): AdminProduct[] {
    try {
      const raw = localStorage.getItem(this.productStorageKey());
      const arr = raw ? (JSON.parse(raw) as any[]) : [];
      return (arr || []).map(a => this.normalizeIncomingProduct(a));
    } catch { return []; }
  }

  private saveProductsToStorage(products: AdminProduct[]) {
    localStorage.setItem(this.productStorageKey(), JSON.stringify(products));
  }

  applyProductFilters() {
    const q = (this.productSearch || '').trim().toLowerCase();
    let list = [...(this.products || [])];
    if (q) list = list.filter(p => (p.name || '').toLowerCase().includes(q) || (p.category || '').toLowerCase().includes(q));
    this.productTotalPages = Math.max(1, Math.ceil(list.length / this.productPageSize));
    this.productPage = Math.min(this.productPage, this.productTotalPages);
    const start = (this.productPage - 1) * this.productPageSize;
    this.displayedProducts = list.slice(start, start + this.productPageSize);
  }

  productPrevPage() { if (this.productPage > 1) { this.productPage--; this.applyProductFilters(); } }
  productNextPage() { if (this.productPage < this.productTotalPages) { this.productPage++; this.applyProductFilters(); } }

  toggleAvailability(p: AdminProduct) {
    const newAvailable = !p.available;
    if (this.api && typeof (this.api as any).updateProduct === 'function') {
      (this.api as any).updateProduct({ ...p, available: newAvailable }).subscribe({
        next: (updated: any) => {
          const norm = this.normalizeIncomingProduct(updated);
          this.replaceProductInList(norm);
          this.productFeedback = `${norm.name} is now ${norm.available ? 'available' : 'unavailable'}.`;
        },
        error: (err: any) => {
          console.error('Failed to update product via API', err);
          this.updateProductLocally(p, newAvailable);
          this.productFeedback = 'Updated locally (API call failed).';
        }
      });
    } else {
      this.updateProductLocally(p, newAvailable);
      this.productFeedback = `${p.name} availability updated (local).`;
    }
  }

  private updateProductLocally(p: AdminProduct, available: boolean) {
    const idx = this.products.findIndex(x => x.id === p.id);
    if (idx !== -1) {
      this.products[idx] = { ...this.products[idx], available };
      this.saveProductsToStorage(this.products);
      this.applyProductFilters();
    }
  }

  private replaceProductInList(updated: AdminProduct) {
    const idx = this.products.findIndex(x => x.id === updated.id);
    if (idx !== -1) this.products[idx] = updated;
    else this.products.unshift(updated);
    this.saveProductsToStorage(this.products);
    this.applyProductFilters();
  }

  addProduct() {
    const p = this.newProduct;
    if (!p.name || typeof p.price !== 'number' || p.price < 0) { this.productFeedback = 'Provide a valid product name and price.'; return; }
    const toCreate: AdminProduct = {
      id: this.generateId(),
      name: (p.name || '').trim(),
      price: Number(p.price || 0),
      stock: Number(p.stock || 0),
      category: (p.category || '').trim(),
      description: (p.description || '').trim(),
      imageUrl: (p.imageUrl || '').trim(),
      available: p.available === undefined ? true : !!p.available,
    } as AdminProduct;

    if (this.api && typeof (this.api as any).createProduct === 'function') {
      (this.api as any).createProduct(toCreate).subscribe({
        next: (created: any) => {
          const norm = this.normalizeIncomingProduct(created);
          this.products.unshift(norm);
          this.saveProductsToStorage(this.products);
          this.resetProductForm();
          this.productFeedback = 'Product added.';
          this.applyProductFilters();
        },
        error: (err: any) => {
          console.error('Failed to create product via API', err);
          this.products.unshift(toCreate);
          this.saveProductsToStorage(this.products);
          this.resetProductForm();
          this.productFeedback = 'Product added locally (API failed).';
          this.applyProductFilters();
        }
      });
    } else {
      this.products.unshift(toCreate);
      this.saveProductsToStorage(this.products);
      this.resetProductForm();
      this.productFeedback = 'Product added (local).';
      this.applyProductFilters();
    }
  }

  deleteProduct(p: AdminProduct) {
    if (!confirm(`Delete product "${p.name}"?`)) return;
    if (this.api && typeof (this.api as any).deleteProduct === 'function') {
      (this.api as any).deleteProduct(p.id).subscribe({
        next: () => {
          this.products = this.products.filter(x => x.id !== p.id);
          this.saveProductsToStorage(this.products);
          this.applyProductFilters();
          this.productFeedback = 'Product deleted.';
        },
        error: (err: any) => {
          console.error('Failed to delete product via API', err);
          this.products = this.products.filter(x => x.id !== p.id);
          this.saveProductsToStorage(this.products);
          this.applyProductFilters();
          this.productFeedback = 'Product deleted (local).';
        }
      });
    } else {
      this.products = this.products.filter(x => x.id !== p.id);
      this.saveProductsToStorage(this.products);
      this.applyProductFilters();
      this.productFeedback = 'Product deleted (local).';
    }
  }

  resetProductForm() {
    this.newProduct = {
      name: '',
      price: 0,
      stock: 0,
      category: '',
      description: '',
      imageUrl: '',
      available: true
    };
  }

  private generateId() {
    return 'p_' + Math.random().toString(36).slice(2, 9);
  }
}























// import { Component, OnInit } from '@angular/core';
// import { Router } from '@angular/router';
// import { AdminApiService, Order, User } from 'src/app/core/services/admin-api.service';
// import { AuthService, UserRecord } from 'src/app/core/services/auth.service';

// type TopUser = {
//   id?: string;
//   name: string;
//   email?: string;
//   orders: number;
//   spent: number;
//   role?: string;
//   status?: string;
// };

// @Component({
//   selector: 'app-admin-dashboard',
//   templateUrl: './admin-dashboard.component.html',
//   styleUrls: ['./admin-dashboard.component.css'],
// })
// export class AdminDashboardComponent implements OnInit {
//   adminName = 'Admin';
//   searchQuery = '';
//   notifications: string[] = [];

//   stats: { title: string; value: number | string; delta: number }[] = [];
//   orders: Order[] = [];
//   displayedOrders: Order[] = [];
//   filteredOrders: Order[] = [];
//   topUsers: TopUser[] = [];
//   users: UserRecord[] = [];

//   // modal
//   modalOrder: Order | null = null;

//   // UI controls
//   isSidebarCollapsed = false;
//   darkMode = false;
//   activeTab: 'dashboard' | 'users' | 'orders' | 'products' | 'settings' = 'dashboard';

//   // filters & pagination
//   filterStatus = '';
//   minAmount?: number;
//   page = 1;
//   pageSize = 6;
//   totalPages = 1;

//   constructor(
//     private router: Router,
//     private api: AdminApiService,
//     private auth: AuthService
//   ) {}

//   ngOnInit(): void {
//     const cur = this.auth?.currentUser ? this.auth.currentUser() : null;
//     if (cur) this.adminName = cur.name;
//     this.notifications = ['New user signed up', 'Payment failed for order #A102'];

//     this.fetchStats();
//     this.reloadOrders();
//     this.loadTopUsers();
//     this.loadUsers();
//   }

//   /** NAV / UI */
//   setTab(t: any) {
//     this.activeTab = t;
//     if (t === 'orders') this.reloadOrders();
//     if (t === 'users') this.loadUsers();
//   }

//   toggleSidebar() {
//     this.isSidebarCollapsed = !this.isSidebarCollapsed;
//   }

//   toggleDarkMode() {
//     this.darkMode = !this.darkMode;
//   }

//   openNotifications(): void {
//     if (!this.notifications || this.notifications.length === 0) {
//       alert('No notifications');
//       return;
//     }
//     const msg = this.notifications.map((n, i) => `${i + 1}. ${n}`).join('\n\n');
//     alert(msg);
//     this.notifications = [];
//   }

//   fetchStats() {
//     this.stats = [
//       { title: 'Total Users', value: this.users.length || '—', delta: 4 },
//       { title: 'Active Orders', value: this.orders.filter(o => o.status === 'Pending').length || '—', delta: -2 },
//       { title: 'Revenue (M)', value: '—', delta: 7 },
//       { title: 'Avg. Order', value: '—', delta: 1.3 },
//     ];
//   }

//   /** ORDERS */
//   reloadOrders() {
//     this.api.getOrders().subscribe({
//       next: (data: Order[]) => {
//         this.orders = data || [];
//         this.applyFilters();
//         this.fetchStats();
//       },
//       error: (err: any) => {
//         console.error('Could not load orders', err);
//       }
//     });
//   }

//   onSearch() {
//     this.applyFilters();
//   }

//   applyFilters() {
//     let list = [...(this.orders || [])];
//     const q = (this.searchQuery || '').trim().toLowerCase();
//     if (q) list = list.filter(o => (o.customer || '').toLowerCase().includes(q) || (o.id || '').toLowerCase().includes(q));

//     if (this.filterStatus) list = list.filter(o => o.status === this.filterStatus);
//     if (this.minAmount) list = list.filter(o => o.amount >= (this.minAmount || 0));

//     this.filteredOrders = list;
//     this.totalPages = Math.max(1, Math.ceil(this.filteredOrders.length / this.pageSize));
//     this.page = Math.min(this.page, this.totalPages);
//     this.updateDisplayed();
//   }

//   updateDisplayed() {
//     const start = (this.page - 1) * this.pageSize;
//     this.displayedOrders = this.filteredOrders.slice(start, start + this.pageSize);
//   }

//   prevPage() { if (this.page > 1) { this.page--; this.updateDisplayed(); } }
//   nextPage() { if (this.page < this.totalPages) { this.page++; this.updateDisplayed(); } }

//   selectOrder(o: Order) {
//     console.log('select order', o.id);
//   }

//   viewOrder(o: Order, ev?: MouseEvent) {
//     if (ev) ev.stopPropagation();
//     this.modalOrder = o;
//   }

//   closeModal() { this.modalOrder = null; }

//   toggleOrderStatus(o: Order, ev?: MouseEvent) {
//     if (ev) ev.stopPropagation();
//     const newStatus: Order['status'] = o.status === 'Pending' ? 'Completed' : 'Pending';
//     this.api.updateOrderStatus(o.id, newStatus).subscribe({
//       next: (updated: Order) => {
//         const idx = this.orders.findIndex(x => x.id === updated.id);
//         if (idx !== -1) this.orders[idx] = updated;
//         this.applyFilters();
//         this.fetchStats();
//       },
//       error: (err: any) => console.error('Failed to update order', err)
//     });
//   }

//   statCardClick(s: any) {
//     if (s.title === 'Active Orders') {
//       this.setTab('orders');
//       this.filterStatus = '';
//       this.applyFilters();
//     }
//   }

//   /** USERS */
//   loadTopUsers() {
//     this.api.getTopUsers().subscribe({
//       next: (data: User[] = []) => {
//         this.topUsers = (data || []).map(u => ({
//           id: (u.email || '').split('@')[0],
//           name: u.name || (u.email || ''),
//           email: u.email,
//           orders: (u as any).orders ?? Math.floor(Math.random() * 10),
//           spent: (u as any).spent ?? Math.floor(Math.random() * 50000),
//           role: u.role,
//           status: (u as any).status ?? 'active'
//         }));
//       },
//       error: (err: any) => { console.error(err); }
//     });
//   }

//   loadUsers() {
//     this.api.getUsers().subscribe({
//       next: (data: User[]) => { this.users = data || []; this.fetchStats(); },
//       error: (err: any) => { console.error(err); }
//     });
//   }

//   // Accept a pending user (calls AuthService.acceptUserByEmail)
//   acceptUser(u: UserRecord | TopUser) {
//     const email = (u as any).email;
//     if (!email) return;
//     const res = this.auth.acceptUserByEmail(email);
//     if (res.success) {
//       this.loadUsers();
//       this.loadTopUsers();
//       alert(res.message);
//     } else {
//       alert(res.message);
//     }
//   }

//   // Block a user (calls AuthService.blockUserByEmail)
//   blockUser(u: UserRecord | TopUser) {
//     const email = (u as any).email;
//     if (!email) return;
//     const res = this.auth.blockUserByEmail(email);
//     if (res.success) {
//       this.loadUsers();
//       this.loadTopUsers();
//       alert(res.message);
//     } else {
//       alert(res.message);
//     }
//   }

//   // Unblock user -> delegate to acceptUser (makes user active)
//   unblockUser(u: UserRecord | TopUser) {
//     this.acceptUser(u);
//   }

//   // Remove user completely
//   deleteUser(u: UserRecord | TopUser) {
//     if (!confirm(`Delete user ${(u as any).name || (u as any).email}?`)) return;
//     const email = (u as any).email;
//     if (!email) return;
//     const res = this.auth.removeUserByEmail(email);
//     if (res.success) {
//       this.loadUsers();
//       this.loadTopUsers();
//       alert('User deleted.');
//     } else {
//       alert(res.message);
//     }
//   }

//   // Edit user (simple inline prompt demo)
//   editUser(u: UserRecord | TopUser) {
//     const email = (u as any).email;
//     if (!email) return;
//     const newName = prompt('New name', (u as any).name || '');
//     if (!newName) return;
//     // find and update via AuthService public methods
//     const users = this.auth.listUsers();
//     const idx = users.findIndex(x => x.email === (email || '').toLowerCase());
//     if (idx === -1) { alert('User not found'); return; }
//     users[idx].name = newName;
//     // save via public API on AuthService
//     this.auth.saveUsers(users);
//     this.loadUsers();
//     this.loadTopUsers();
//     alert('User updated.');
//   }

//   openUser(u: UserRecord | TopUser) {
//     console.log('open user', (u as any).email);
//   }

//   promote(u: UserRecord | TopUser) {
//     const email = (u as any).email;
//     if (!email) return;
//     const res = this.auth.promoteToAdmin(email);
//     if (res.success) {
//       this.loadUsers();
//       this.loadTopUsers();
//       alert(res.message);
//     } else {
//       alert(res.message);
//     }
//   }

//   logout() {
//     if (this.auth) this.auth.logout();
//     this.router.navigate(['/auth/login']).catch(err => console.error('Navigation failed', err));
//   }
// }























// // src/app/features/user/admin/admin-dashboard/admin-dashboard.component.ts
// import { Component, OnInit } from '@angular/core';
// import { Router } from '@angular/router';
// import { AdminApiService, Order, User } from 'src/app/core/services/admin-api.service';
// import { AuthService, UserRecord } from 'src/app/core/services/auth.service';

// type TopUser = {
//   id?: string;
//   name: string;
//   email?: string;
//   orders: number;
//   spent: number;
//   role?: string;
//   status?: string;
// };

// @Component({
//   selector: 'app-admin-dashboard',
//   templateUrl: './admin-dashboard.component.html',
//   styleUrls: ['./admin-dashboard.component.css'],
// })
// export class AdminDashboardComponent implements OnInit {
//   adminName = 'Admin';
//   searchQuery = '';
//   notifications: string[] = [];

//   stats: { title: string; value: number | string; delta: number }[] = [];
//   orders: Order[] = [];
//   displayedOrders: Order[] = [];
//   filteredOrders: Order[] = [];
//   topUsers: TopUser[] = [];
//   users: UserRecord[] = [];

//   // modal
//   modalOrder: Order | null = null;

//   // UI controls
//   isSidebarCollapsed = false;
//   darkMode = false;
//   activeTab: 'dashboard' | 'users' | 'orders' | 'products' | 'settings' = 'dashboard';

//   // filters & pagination
//   filterStatus = '';
//   minAmount?: number;
//   page = 1;
//   pageSize = 6;
//   totalPages = 1;

//   constructor(
//     private router: Router,
//     private api: AdminApiService,
//     private auth: AuthService
//   ) {}

//   ngOnInit(): void {
//     const cur = this.auth?.currentUser ? this.auth.currentUser() : null;
//     if (cur) this.adminName = cur.name;
//     this.notifications = ['New user signed up', 'Payment failed for order #A102'];

//     this.fetchStats();
//     this.reloadOrders();
//     this.loadTopUsers();
//     this.loadUsers();
//   }

//   /** NAV / UI */
//   setTab(t: any) {
//     this.activeTab = t;
//     if (t === 'orders') this.reloadOrders();
//     if (t === 'users') this.loadUsers();
//   }

//   toggleSidebar() {
//     this.isSidebarCollapsed = !this.isSidebarCollapsed;
//   }

//   toggleDarkMode() {
//     this.darkMode = !this.darkMode;
//   }

//   openNotifications(): void {
//     if (!this.notifications || this.notifications.length === 0) {
//       alert('No notifications');
//       return;
//     }
//     const msg = this.notifications.map((n, i) => `${i + 1}. ${n}`).join('\n\n');
//     alert(msg);
//     this.notifications = [];
//   }

//   fetchStats() {
//     this.stats = [
//       { title: 'Total Users', value: this.users.length || '—', delta: 4 },
//       { title: 'Active Orders', value: this.orders.filter(o => o.status === 'Pending').length || '—', delta: -2 },
//       { title: 'Revenue (M)', value: '—', delta: 7 },
//       { title: 'Avg. Order', value: '—', delta: 1.3 },
//     ];
//   }

//   /** ORDERS */
//   reloadOrders() {
//     this.api.getOrders().subscribe({
//       next: (data: Order[]) => {
//         this.orders = data || [];
//         this.applyFilters();
//         this.fetchStats();
//       },
//       error: (err: any) => {
//         console.error('Could not load orders', err);
//       }
//     });
//   }

//   onSearch() {
//     this.applyFilters();
//   }

//   applyFilters() {
//     let list = [...(this.orders || [])];
//     const q = (this.searchQuery || '').trim().toLowerCase();
//     if (q) list = list.filter(o => (o.customer || '').toLowerCase().includes(q) || (o.id || '').toLowerCase().includes(q));

//     if (this.filterStatus) list = list.filter(o => o.status === this.filterStatus);
//     if (this.minAmount) list = list.filter(o => o.amount >= (this.minAmount || 0));

//     this.filteredOrders = list;
//     this.totalPages = Math.max(1, Math.ceil(this.filteredOrders.length / this.pageSize));
//     this.page = Math.min(this.page, this.totalPages);
//     this.updateDisplayed();
//   }

//   updateDisplayed() {
//     const start = (this.page - 1) * this.pageSize;
//     this.displayedOrders = this.filteredOrders.slice(start, start + this.pageSize);
//   }

//   prevPage() { if (this.page > 1) { this.page--; this.updateDisplayed(); } }
//   nextPage() { if (this.page < this.totalPages) { this.page++; this.updateDisplayed(); } }

//   selectOrder(o: Order) {
//     console.log('select order', o.id);
//   }

//   viewOrder(o: Order, ev?: MouseEvent) {
//     if (ev) ev.stopPropagation();
//     this.modalOrder = o;
//   }

//   closeModal() { this.modalOrder = null; }

//   toggleOrderStatus(o: Order, ev?: MouseEvent) {
//     if (ev) ev.stopPropagation();
//     const newStatus: Order['status'] = o.status === 'Pending' ? 'Completed' : 'Pending';
//     this.api.updateOrderStatus(o.id, newStatus).subscribe({
//       next: (updated: Order) => {
//         const idx = this.orders.findIndex(x => x.id === updated.id);
//         if (idx !== -1) this.orders[idx] = updated;
//         this.applyFilters();
//         this.fetchStats();
//       },
//       error: (err: any) => console.error('Failed to update order', err)
//     });
//   }

//   statCardClick(s: any) {
//     if (s.title === 'Active Orders') {
//       this.setTab('orders');
//       this.filterStatus = '';
//       this.applyFilters();
//     }
//   }

//   /** USERS */
//   loadTopUsers() {
//     this.api.getTopUsers().subscribe({
//       next: (data: User[] = []) => {
//         this.topUsers = (data || []).map(u => ({
//           id: (u.email || '').split('@')[0],
//           name: u.name || (u.email || ''),
//           email: u.email,
//           orders: (u as any).orders ?? Math.floor(Math.random() * 10),
//           spent: (u as any).spent ?? Math.floor(Math.random() * 50000),
//           role: u.role,
//           status: (u as any).status ?? 'active'
//         }));
//       },
//       error: (err: any) => { console.error(err); }
//     });
//   }

//   loadUsers() {
//     this.api.getUsers().subscribe({
//       next: (data: User[]) => { this.users = data || []; this.fetchStats(); },
//       error: (err: any) => { console.error(err); }
//     });
//   }

//   // Accept a pending user (calls AuthService.acceptUserByEmail)
//   acceptUser(u: UserRecord | TopUser) {
//     const email = (u as any).email;
//     if (!email) return;
//     const res = this.auth.acceptUserByEmail(email);
//     if (res.success) {
//       this.loadUsers();
//       this.loadTopUsers();
//       alert(res.message);
//     } else {
//       alert(res.message);
//     }
//   }

//   // Block a user (calls AuthService.blockUserByEmail)
//   blockUser(u: UserRecord | TopUser) {
//     const email = (u as any).email;
//     if (!email) return;
//     const res = this.auth.blockUserByEmail(email);
//     if (res.success) {
//       this.loadUsers();
//       this.loadTopUsers();
//       alert(res.message);
//     } else {
//       alert(res.message);
//     }
//   }

//   // Remove user completely
//   deleteUser(u: UserRecord | TopUser) {
//     if (!confirm(`Delete user ${(u as any).name || (u as any).email}?`)) return;
//     const email = (u as any).email;
//     if (!email) return;
//     const res = this.auth.removeUserByEmail(email);
//     if (res.success) {
//       this.loadUsers();
//       this.loadTopUsers();
//       alert('User deleted.');
//     } else {
//       alert(res.message);
//     }
//   }

//   // Edit user (simple inline prompt demo)
//   editUser(u: UserRecord | TopUser) {
//     const email = (u as any).email;
//     if (!email) return;
//     const newName = prompt('New name', (u as any).name || '');
//     if (!newName) return;
//     // find and update
//     const users = this.auth.listUsers();
//     const idx = users.findIndex(x => x.email === (email || '').toLowerCase());
//     if (idx === -1) { alert('User not found'); return; }
//     users[idx].name = newName;
//     this.auth.saveUsers ? this.auth.saveUsers(users) : localStorage.setItem((this.auth as any).storageKey ?? 'nestify_users', JSON.stringify(users));
//     this.loadUsers();
//     this.loadTopUsers();
//     alert('User updated.');
//   }

//   openUser(u: UserRecord | TopUser) {
//     console.log('open user', (u as any).email);
//   }

//   promote(u: UserRecord | TopUser) {
//     const email = (u as any).email;
//     if (!email) return;
//     const res = this.auth.promoteToAdmin(email);
//     if (res.success) {
//       this.loadUsers();
//       this.loadTopUsers();
//       alert(res.message);
//     } else {
//       alert(res.message);
//     }
//   }

//   logout() {
//     if (this.auth) this.auth.logout();
//     this.router.navigate(['/auth/login']).catch(err => console.error('Navigation failed', err));
//   }
// }






// // // src/app/features/admin/admin-dashboard/admin-dashboard.component.ts
// // import { Component, OnInit } from '@angular/core';
// // import { Router } from '@angular/router';
// // import { AdminApiService,Order,User } from 'src/app/core/services/admin-api.service';
// // import { AuthService } from 'src/app/core/services/auth.service';

// // @Component({
// //   selector: 'app-admin-dashboard',
// //   templateUrl: './admin-dashboard.component.html',
// //   styleUrls: ['./admin-dashboard.component.css'],
// // })
// // export class AdminDashboardComponent implements OnInit {
// //   adminName = 'Admin';
// //   searchQuery = '';
// //   notifications: string[] = [];

// //   stats: { title: string; value: number | string; delta: number }[] = [];
// //   orders: Order[] = [];
// //   displayedOrders: Order[] = [];
// //   filteredOrders: Order[] = [];
// //   topUsers: User[] = [];
// //   users: User[] = [];

// //   // modal
// //   modalOrder: Order | null = null;

// //   // UI controls
// //   isSidebarCollapsed = false;
// //   darkMode = false;
// //   activeTab: 'dashboard' | 'users' | 'orders' | 'products' | 'settings' = 'dashboard';

// //   // filters & pagination
// //   filterStatus = '';
// //   minAmount?: number;
// //   page = 1;
// //   pageSize = 6;
// //   totalPages = 1;

// //   constructor(
// //     private router: Router,
// //     private api: AdminApiService,
// //     private auth: AuthService
// //   ) {}

// //   ngOnInit(): void {
// //     const cur = this.auth?.currentUser ? this.auth.currentUser() : null;
// //     if (cur) this.adminName = cur.name;
// //     this.notifications = ['New user signed up', 'Payment failed for order #A102'];

// //     this.fetchStats();
// //     this.reloadOrders();
// //     this.loadTopUsers();
// //     this.loadUsers();
// //   }

// //   /** NAV / UI */
// //   setTab(t: any) {
// //     this.activeTab = t;
// //     if (t === 'orders') this.reloadOrders();
// //     if (t === 'users') this.loadUsers();
// //   }

// //   toggleSidebar() {
// //     this.isSidebarCollapsed = !this.isSidebarCollapsed;
// //   }

// //   toggleDarkMode() {
// //     this.darkMode = !this.darkMode;
// //   }

// //   /** show notifications (demo) */
// //   openNotifications(): void {
// //     if (!this.notifications || this.notifications.length === 0) {
// //       alert('No notifications');
// //       return;
// //     }
// //     const msg = this.notifications.map((n, i) => `${i + 1}. ${n}`).join('\n\n');
// //     alert(msg);
// //     // demo: clear notifications after viewing
// //     this.notifications = [];
// //   }

// //   /** STATS */
// //   fetchStats() {
// //     this.stats = [
// //       { title: 'Total Users', value: this.users.length || '—', delta: 4 },
// //       { title: 'Active Orders', value: this.orders.filter(o => o.status === 'Pending').length || '—', delta: -2 },
// //       { title: 'Revenue (M)', value: '—', delta: 7 },
// //       { title: 'Avg. Order', value: '—', delta: 1.3 },
// //     ];
// //   }

// //   /** ORDERS */
// //   reloadOrders() {
// //     this.api.getOrders().subscribe({
// //       next: (data: Order[]) => {
// //         this.orders = data || [];
// //         this.applyFilters();
// //         this.fetchStats();
// //       },
// //       error: (err: any) => {
// //         console.error('Could not load orders', err);
// //       }
// //     });
// //   }

// //   onSearch() {
// //     this.applyFilters();
// //   }

// //   applyFilters() {
// //     let list = [...(this.orders || [])];
// //     const q = (this.searchQuery || '').trim().toLowerCase();
// //     if (q) list = list.filter(o => (o.customer || '').toLowerCase().includes(q) || (o.id || '').toLowerCase().includes(q));

// //     if (this.filterStatus) list = list.filter(o => o.status === this.filterStatus);
// //     if (this.minAmount) list = list.filter(o => o.amount >= (this.minAmount || 0));

// //     this.filteredOrders = list;
// //     this.totalPages = Math.max(1, Math.ceil(this.filteredOrders.length / this.pageSize));
// //     this.page = Math.min(this.page, this.totalPages);
// //     this.updateDisplayed();
// //   }

// //   updateDisplayed() {
// //     const start = (this.page - 1) * this.pageSize;
// //     this.displayedOrders = this.filteredOrders.slice(start, start + this.pageSize);
// //   }

// //   prevPage() { if (this.page > 1) { this.page--; this.updateDisplayed(); } }
// //   nextPage() { if (this.page < this.totalPages) { this.page++; this.updateDisplayed(); } }

// //   selectOrder(o: Order) {
// //     console.log('select order', o.id);
// //   }

// //   viewOrder(o: Order, ev?: MouseEvent) {
// //     if (ev) ev.stopPropagation();
// //     this.modalOrder = o;
// //   }

// //   closeModal() { this.modalOrder = null; }

// //   toggleOrderStatus(o: Order, ev?: MouseEvent) {
// //     if (ev) ev.stopPropagation();
// //     const newStatus: Order['status'] = o.status === 'Pending' ? 'Completed' : 'Pending';
// //     this.api.updateOrderStatus(o.id, newStatus).subscribe({
// //       next: (updated: Order) => {
// //         const idx = this.orders.findIndex(x => x.id === updated.id);
// //         if (idx !== -1) this.orders[idx] = updated;
// //         this.applyFilters();
// //         this.fetchStats();
// //       },
// //       error: (err: any) => console.error('Failed to update order', err)
// //     });
// //   }

// //   statCardClick(s: any) {
// //     if (s.title === 'Active Orders') {
// //       this.setTab('orders');
// //       this.filterStatus = '';
// //       this.applyFilters();
// //     }
// //   }

// //   /** USERS */
// //   loadTopUsers() {
// //     this.api.getTopUsers().subscribe({
// //       next: (data: User[]) => { this.topUsers = data || []; },
// //       error: (err: any) => { console.error(err); }
// //     });
// //   }

// //   loadUsers() {
// //     this.api.getUsers().subscribe({
// //       next: (data: User[]) => { this.users = data || []; this.fetchStats(); },
// //       error: (err: any) => { console.error(err); }
// //     });
// //   }

// //   openUser(u: User) {
// //     console.log('open user', u.email);
// //   }

// //   promote(u: User) {
// //     u.role = 'admin';
// //     alert(`${u.name} promoted to admin (demo).`);
// //   }

// //   editUser(u: User) {
// //     console.log('edit', u);
// //   }

// //   deleteUser(u: User) {
// //     if (!confirm(`Delete user ${u.name}?`)) return;
// //     this.users = this.users.filter(x => x.email !== u.email);
// //   }

// //   /** LOGOUT */
// //   logout() {
// //     if (this.auth) this.auth.logout();
// //     this.router.navigate(['/auth/login']).catch(err => console.error('Navigation failed', err));
// //   }
// // }
