import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { PopupService } from '../services/popup.service';
import { readError } from '../services/error.util';
import { checkEmail } from '../services/validators';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, RouterLink],
  template: `
    <h1>Login</h1>

    <label for="email">Email</label>
    <input id="email" name="email" type="email" maxlength="120" [(ngModel)]="email">

    <label for="password">Password</label>
    <input id="password" name="password" type="password" maxlength="50" [(ngModel)]="password"
           (keyup.enter)="submit()">

    <p>
      <button type="button" class="primary" (click)="submit()" [disabled]="busy() || !email || !password">
        {{ busy() ? 'Signing in...' : 'Login' }}
      </button>
    </p>
    <p class="muted">No account? <a routerLink="/register">Register as a patient</a>.</p>
    <p class="muted">Demo admin: admin&#64;hms.local / Admin&#64;123</p>
  `
})
export class LoginComponent {
  private auth = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private popup = inject(PopupService);

  email = '';
  password = '';
  busy = signal(false);

  submit(): void {
    const emailError = checkEmail(this.email);
    if (emailError) { this.popup.error(emailError, 'Please fix the form'); return; }
    if (!this.password) { this.popup.error('Password is required', 'Please fix the form'); return; }

    this.busy.set(true);
    this.auth.login(this.email, this.password).subscribe({
      next: () => {
        this.busy.set(false);
        this.email = ''; this.password = '';
        const redirect = this.route.snapshot.queryParams['redirect'] as string | undefined;
        this.router.navigateByUrl(redirect ?? '/');
      },
      error: err => {
        this.busy.set(false);
        this.password = '';                       // never leave a rejected password in the field
        this.popup.error(readError(err), 'Login failed');
      }
    });
  }
}
