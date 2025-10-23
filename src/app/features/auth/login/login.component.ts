import { Component } from '@angular/core';
import { NgForm } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from 'src/app/core/services/auth.service';
import { ToastService } from 'src/app/core/services/toast.services';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  email = '';
  password = '';
  loginAsAdmin = false;

  loading = false;
  error = '';
  success = '';

  private returnUrl = '/';
  private readonly ADMIN_ROUTE = '/admin/dashboard';

  constructor(
    private auth: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private toast: ToastService
  ) {
    const qReturn = this.route.snapshot.queryParams['returnUrl'];
    if (qReturn && !/\/?auth\/?login/i.test(String(qReturn))) this.returnUrl = String(qReturn);
  }

  private safeToastSuccess(msg: string) {
    const t = this.toast as any;
    if (!t) return;
    if (typeof t.success === 'function') t.success(msg);
    else if (typeof t.showSuccess === 'function') t.showSuccess(msg);
    else if (typeof t.show === 'function') t.show(msg);
  }

  private safeToastError(msg: string) {
    const t = this.toast as any;
    if (!t) return;
    if (typeof t.error === 'function') t.error(msg);
    else if (typeof t.showError === 'function') t.showError(msg);
    else if (typeof t.show === 'function') t.show(msg);
  }

  onSubmit(form: NgForm | null) {
    this.error = '';
    this.success = '';
    if (!form) {
      if (!this.email || !this.password) {
        this.error = 'Please provide email and password.';
        return;
      }
    }

    if (form && form.invalid) {
      form.control.markAllAsTouched();
      this.error = 'Please fix the errors and try again.';
      return;
    }

    this.loading = true;
    try {
      const res = this.auth.login((this.email || '').trim(), this.password || '');
      this.loading = false;

      console.log('login() returned:', res);

      if (!res || !res.success) {
        this.error = (res && (res as any).message) ? (res as any).message : 'Invalid credentials';
        this.safeToastError(this.error);
        return;
      }

      // read stored user from service (guaranteed persisted by service.login)
      const stored = this.auth.currentUser();
      console.log('stored currentUser after login:', stored);

      // sanity: if stored is null something else overwrote storage
      if (!stored) {
        this.error = 'Login did not persist user. Please try again.';
        this.safeToastError(this.error);
        return;
      }

      // successful login
      this.success = res.message || 'Welcome back!';
      this.safeToastSuccess(this.success);

      // Force admins into admin dashboard
      if (stored.role === 'admin') {
        this.router.navigate(['/dashboard']).catch(e => console.error('Admin navigation failed', e));
        return;
      }

      // If non-admin attempted admin login, reject
      if (this.loginAsAdmin && stored.role !== 'admin') {
        this.auth.logout();
        this.error = 'Admin access required. Please use an admin account.';
        this.safeToastError(this.error);
        return;
      }

      // normal user navigation
      this.router.navigateByUrl(this.returnUrl || '/').catch(e => console.error('Navigation failed', e));
    } catch (err) {
      this.loading = false;
      console.error('Login exception', err);
      this.error = 'An error occurred during login.';
      this.safeToastError(this.error);
    }
  }
  
}
