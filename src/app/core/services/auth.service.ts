
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { Product } from '../models/product.model';

export interface UserRecord {
  name: string;
  email: string;
  password: string;
  role?: 'user' | 'admin' | string;
  phone?: string;
  cart?: Product[];
  status?: 'pending' | 'active' | 'blocked';
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  public readonly storageKey = 'nestify_users';
  private readonly loggedKey = 'nestify_current_user';

  private _isLoggedIn$ = new BehaviorSubject<boolean>(false);
  public readonly isLoggedIn$ = this._isLoggedIn$.asObservable();

  constructor() {
    if (!localStorage.getItem(this.storageKey)) {
      localStorage.setItem(this.storageKey, JSON.stringify([]));
    }

    const cur = localStorage.getItem(this.loggedKey);
    this._isLoggedIn$.next(!!cur);

    this.createAdminIfMissing();
  }

  // -------------------------
  // Internal helpers
  // -------------------------
  private loadUsers(): UserRecord[] {
    try {
      const raw = localStorage.getItem(this.storageKey);
      return raw ? (JSON.parse(raw) as UserRecord[]) : [];
    } catch {
      return [];
    }
  }

  // Changed to public so admin UI can call this directly in a typesafe way
  public saveUsers(users: UserRecord[]) {
    localStorage.setItem(this.storageKey, JSON.stringify(users));
  }

  private normalize(email?: string) {
    return (email || '').trim().toLowerCase();
  }

  private createAdminIfMissing() {
    const users = this.loadUsers();
    const adminExists = users.some((u: any) => String(u.role).toLowerCase() === 'admin');
    if (!adminExists) {
      users.push({
        name: 'Admin',
        email: 'admin123@gmail.com',
        password: 'Admin@123',
        role: 'admin',
        phone: '0000000000',
        status: 'active'
      } as UserRecord);
      this.saveUsers(users);
    }
  }

  signup(name: string, email: string, password: string): { success: boolean; message: string } {
    name = (name || '').trim();
    email = this.normalize(email);
    password = password || '';

    if (!name || !email || !password) return { success: false, message: 'All fields are required.' };

    const users = this.loadUsers();
    if (users.some(u => u.email === email)) return { success: false, message: 'Email already registered.' };

    const newUser: UserRecord = { name, email, password, role: 'user', status: 'pending', cart: [] };
    users.push(newUser);
    this.saveUsers(users);

    return { success: true, message: 'Account created. Awaiting admin approval.' };
  }

  login(email: string, password: string): { success: boolean; role?: string; message: string } {
    email = this.normalize(email);
    password = password || '';

    if (!email || !password) return { success: false, message: 'Provide email and password.' };

    const users = this.loadUsers();
    const found = users.find(u => u.email === email && u.password === password);

    if (!found) return { success: false, message: 'Invalid credentials' };

    if (found.status === 'pending') return { success: false, message: 'Account awaiting admin approval.' };
    if (found.status === 'blocked') return { success: false, message: 'Your account is blocked. Contact admin.' };

    localStorage.setItem(this.loggedKey, JSON.stringify(found));
    this._isLoggedIn$.next(true);

    return { success: true, role: found.role, message: 'Logged in successfully' };
  }

  loginAsync(email: string, password: string): Observable<{ success: boolean; role?: string; message: string }> {
    return of(this.login(email, password));
  }

  logout(): void {
    localStorage.removeItem(this.loggedKey);
    this._isLoggedIn$.next(false);
  }

  isAuthenticated(): boolean {
    return this._isLoggedIn$.getValue();
  }

  currentUser(): UserRecord | null {
    try {
      const raw = localStorage.getItem(this.loggedKey);
      return raw ? (JSON.parse(raw) as UserRecord) : null;
    } catch {
      return null;
    }
  }

  isAdmin(): boolean {
    const u = this.currentUser();
    return !!(u && String(u.role).toLowerCase() === 'admin');
  }

  updateProfile(updated: { name?: string; password?: string }): { success: boolean; message: string } {
    const cur = this.currentUser();
    if (!cur) return { success: false, message: 'Not logged in.' };

    const users = this.loadUsers();
    const idx = users.findIndex(u => u.email === cur.email);
    if (idx === -1) return { success: false, message: 'User not found.' };

    if (updated.name !== undefined && updated.name.trim() === '') return { success: false, message: 'Name cannot be empty.' };

    if (updated.name) users[idx].name = updated.name.trim();
    if (updated.password) users[idx].password = updated.password;

    this.saveUsers(users);
    localStorage.setItem(this.loggedKey, JSON.stringify(users[idx]));
    return { success: true, message: 'Profile updated.' };
  }

  deleteAccount(): { success: boolean; message: string } {
    const cur = this.currentUser();
    if (!cur) return { success: false, message: 'Not logged in.' };

    const users = this.loadUsers();
    if (cur.role === 'admin') {
      const adminCount = users.reduce((acc, u) => acc + (u.role === 'admin' ? 1 : 0), 0);
      if (adminCount <= 1) return { success: false, message: 'Cannot delete the last admin account.' };
    }

    const remaining = users.filter(u => u.email !== cur.email);
    this.saveUsers(remaining);

    localStorage.removeItem(this.loggedKey);
    this._isLoggedIn$.next(false);
    return { success: true, message: 'Account deleted.' };
  }

  // -------------------------
  // Admin helpers (used by admin UI)
  // -------------------------
  listUsers(): UserRecord[] {
    return this.loadUsers();
  }

  acceptUserByEmail(email: string): { success: boolean; message: string } {
    const e = this.normalize(email);
    const users = this.loadUsers();
    const idx = users.findIndex(u => u.email === e);
    if (idx === -1) return { success: false, message: 'User not found.' };
    users[idx].status = 'active';
    this.saveUsers(users);
    return { success: true, message: `${users[idx].name} accepted.` };
  }

  blockUserByEmail(email: string): { success: boolean; message: string } {
    const e = this.normalize(email);
    const users = this.loadUsers();
    const idx = users.findIndex(u => u.email === e);
    if (idx === -1) return { success: false, message: 'User not found.' };
    users[idx].status = 'blocked';
    this.saveUsers(users);

    const currentRaw = localStorage.getItem(this.loggedKey);
    if (currentRaw) {
      try {
        const cur = JSON.parse(currentRaw) as UserRecord;
        if (this.normalize(cur.email) === e) {
          localStorage.removeItem(this.loggedKey);
          this._isLoggedIn$.next(false);
        }
      } catch {}
    }

    return { success: true, message: `${users[idx].name} blocked.` };
  }

  promoteToAdmin(email: string): { success: boolean; message: string } {
    const e = this.normalize(email);
    const users = this.loadUsers();
    const idx = users.findIndex(u => u.email === e);
    if (idx === -1) return { success: false, message: 'User not found.' };
    users[idx].role = 'admin';
    users[idx].status = users[idx].status ?? 'active';
    this.saveUsers(users);
    return { success: true, message: `${users[idx].name} promoted to admin.` };
  }

  removeUserByEmail(email: string): { success: boolean; message: string } {
    const e = this.normalize(email);
    let users = this.loadUsers();
    if (!users.some(u => u.email === e)) return { success: false, message: 'User not found.' };
    users = users.filter(u => u.email !== e);
    this.saveUsers(users);

    const curRaw = localStorage.getItem(this.loggedKey);
    if (curRaw) {
      try {
        const cur = JSON.parse(curRaw) as UserRecord;
        if (this.normalize(cur.email) === e) {
          localStorage.removeItem(this.loggedKey);
          this._isLoggedIn$.next(false);
        }
      } catch {}
    }

    return { success: true, message: 'User removed.' };
  }
}








