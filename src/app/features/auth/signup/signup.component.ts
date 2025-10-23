import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from 'src/app/core/services/auth.service';
@Component({
  selector: 'app-signup',
  templateUrl: './signup.component.html',
  styleUrls: ['./signup.component.css']
})
export class SignupComponent {
form: FormGroup;
  loading = false;
  error = '';
  success = '';

  constructor(
    private fb: FormBuilder,
    private auth :AuthService,
    private router: Router
  ) {
    this.form = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirm: ['', [Validators.required]]
    }, { validators: this.passwordsMatch });
  }

  // custom validator for matching passwords
  private passwordsMatch(group: AbstractControl | null) {
    if (!group) return null;
    const pwd = group.get('password')?.value;
    const conf = group.get('confirm')?.value;
    return pwd === conf ? null : { mismatch: true };
  }

  // helper getters for template (optional)
  get name() { return this.form.get('name'); }
  get email() { return this.form.get('email'); }
  get password() { return this.form.get('password'); }
  get confirm() { return this.form.get('confirm'); }

  onSubmit() {
    this.error = '';
    this.success = '';

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.error = '';
      return;
    }

    this.loading = true;
    const name = this.name?.value || '';
    const email = this.email?.value || '';
    const password = this.password?.value || '';

    // call AuthService (stub or real)
    const res = this.auth.signup(name, email, password);
    this.loading = false;

   // in SignupComponent after calling auth.signup(...)
if (res.success) {
  // show explicit message so user knows they must wait
  this.success = 'Account created. An administrator will review and activate your account shortly.';
  // don't auto-login — remain on signup (or redirect to login)
  setTimeout(() => this.router.navigate(['/login']), 1200);
} else {
  this.error = res.message || 'Signup failed.';
}

  }
}
