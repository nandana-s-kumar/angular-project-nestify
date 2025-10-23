import { Component, OnInit } from '@angular/core';
import { Router} from '@angular/router';
import { AuthService,UserRecord } from 'src/app/core/services/auth.service';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css']
})
export class ProfileComponent implements OnInit{
user: UserRecord | null = null;
  editMode = false;
  // bound form fields
  name = '';
  password = '';
  passwordConfirm = '';

  loading = false;
  message = '';
  error = '';

  constructor(private auth: AuthService, private router: Router) {}

  ngOnInit(): void {
    this.loadUser();
    // react to login changes (optional) - if user logs out elsewhere, redirect
    this.auth.isLoggedIn$.subscribe(logged => {
      if (!logged) {
        // redirect to login if not authenticated
        this.router.navigate(['/login']);
      } else {
        this.loadUser();
      }
    });
  }

  loadUser() {
    this.user = this.auth.currentUser();
    if (this.user) {
      this.name = this.user.name;
      this.password = ''; // don't prefill
      this.passwordConfirm = '';
    } else {
      // not logged in: send to login
      this.router.navigate(['/login']);
    }
  }

  enableEdit() {
    this.editMode = true;
    this.message = '';
    this.error = '';
  }

  cancelEdit() {
    this.editMode = false;
    this.loadUser();
  }

  saveProfile() {
    this.error = '';
    this.message = '';

    if (!this.name || this.name.trim().length === 0) {
      this.error = 'Name cannot be empty.';
      return;
    }

    if (this.password) {
      if (this.password.length < 6) {
        this.error = 'Password must be at least 6 characters.';
        return;
      }
      if (this.password !== this.passwordConfirm) {
        this.error = 'Password and confirm do not match.';
        return;
      }
    }

    this.loading = true;
    const res = this.auth.updateProfile({ name: this.name.trim(), password: this.password || undefined });
    this.loading = false;

    if (res.success) {
      this.message = res.message;
      this.editMode = false;
      this.loadUser();
    } else {
      this.error = res.message;
    }
  }

  logout() {
    this.auth.logout();
    this.router.navigate(['/login']);
  }

  deleteAccount() {
    const ok = confirm('Are you sure you want to delete your account? This action cannot be undone.');
    if (!ok) return;
    const res = this.auth.deleteAccount();
    if (res.success) {
      alert('Account deleted.');
      this.router.navigate(['/signup']);
    } else {
      alert('Could not delete account: ' + res.message);
    }
  }
}

