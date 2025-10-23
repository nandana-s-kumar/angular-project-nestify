import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { AuthService } from 'src/app/core/services/auth.service';

@Injectable({ providedIn: 'root' })
export class AdminGuard implements CanActivate {
  constructor(private auth: AuthService, private router: Router) {}

  canActivate(): boolean | UrlTree {
    // 1) logged in?
    if (!this.auth.isAuthenticated()) {
      // redirect to login, preserve returnUrl
      return this.router.parseUrl('/auth/login?returnUrl=/admin');
    }

    // 2) admin?
    if (this.auth.isAdmin()) {
      return true;
    }

    // not admin: optionally send to homepage or show "not authorized"
    // we redirect to home and optionally add a query param to show message
    return this.router.parseUrl('/?notAuthorized=true');
  }
}
