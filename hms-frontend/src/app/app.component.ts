import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from './services/auth.service';
import { PopupComponent } from './components/popup.component';
import { LogoComponent } from './components/logo.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, FormsModule, PopupComponent, LogoComponent],
  template: `
    <header class="site-header">
      <div class="container header-bar">
        <a routerLink="/" class="brand" aria-label="City Care Hospital home">
          <app-logo></app-logo>
        </a>

        <nav class="header-nav" aria-label="Main">
          <a routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }"
             class="navlink" title="Go to the home page">
            <svg class="nav-icon" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 3 2.5 11.2h2.6V21h5.1v-5.9h3.6V21h5.1v-9.8h2.6z"/>
            </svg>
            Home
          </a>

          @if (!auth.isLoggedIn()) {
            <a routerLink="/login" routerLinkActive="active" class="navlink">Login</a>
            <a routerLink="/register" routerLinkActive="active" class="navlink">Register</a>
          }

          @if (auth.hasRole('PATIENT')) {
            <a routerLink="/dashboard" routerLinkActive="active" class="navlink">Profile</a>
            <a routerLink="/dashboard" [fragment]="'appointments'" class="navlink">Appointments</a>
            <a routerLink="/book" routerLinkActive="active" class="navlink">Book</a>
          }

          @if (auth.hasRole('ADMIN')) {
            <a routerLink="/admin" routerLinkActive="active" class="navlink">Admin</a>
          }

          <span class="nav-search">
            <input type="search" name="search" aria-label="Search doctors"
                   placeholder="Search doctor / specialty"
                   [(ngModel)]="term" (keyup.enter)="search()">
            <button type="button" (click)="search()" aria-label="Search">
              <svg class="nav-icon" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M10 2a8 8 0 1 0 4.9 14.3l5.4 5.4 1.7-1.7-5.4-5.4A8 8 0 0 0 10 2m0 2.4a5.6 5.6 0 1 1 0 11.2 5.6 5.6 0 0 1 0-11.2"/>
              </svg>
            </button>
          </span>

          @if (auth.isLoggedIn()) {
            <span class="nav-user" title="Signed in as {{ auth.session()?.email }}">
              {{ auth.session()?.fullName }}
            </span>
            <button type="button" class="danger nav-logout" (click)="auth.logout()">Logout</button>
          }
        </nav>
      </div>
    </header>

    <main class="container">
      <router-outlet></router-outlet>
    </main>

    <footer class="site-footer no-print">
      <div class="container footer-grid">
        <div class="footer-brand">
          <app-logo [size]="34"></app-logo>
          <p class="footer-tagline">
            Outpatient consultation, diagnostics and day-care procedures for South Mumbai since 1998.
          </p>
        </div>

        <div class="footer-col">
          <h4>Visit us</h4>
          <address>
            104, 1st Floor, Sujata Chambers,<br>
            Katha Bazaar, Masjid Station (W),<br>
            Mumbai 400009
          </address>
        </div>

        <div class="footer-col">
          <h4>Contact</h4>
          <ul>
            <li>Reception: +91 22 4971 3052</li>
            <li>Email: care&#64;citycare.local</li>
            <li>Emergency: 24x7 walk-in</li>
          </ul>
        </div>

        <div class="footer-col">
          <h4>Opening hours</h4>
          <ul>
            <li>Mon - Fri: 08:00 - 20:00</li>
            <li>Saturday: 08:00 - 14:00</li>
            <li>Sunday: emergency only</li>
          </ul>
        </div>
      </div>

      <div class="container footer-bottom">
        <span>&copy; {{ year }} City Care Hospital. All rights reserved.</span>
        <span>Patient records are handled in line with hospital privacy policy.</span>
      </div>
    </footer>

    <app-popup></app-popup>
  `
})
export class AppComponent {
  auth = inject(AuthService);
  private router = inject(Router);
  term = '';
  year = new Date().getFullYear();

  search(): void {
    this.router.navigate(['/'], { queryParams: this.term ? { q: this.term } : {} });
  }
}
