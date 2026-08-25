import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap } from 'rxjs';
import { AuthResponse, Role } from '../models';
import { API_BASE } from './api.service';

const STORAGE_KEY = 'hms_session';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);

  session = signal<AuthResponse | null>(this.read());

  private read(): AuthResponse | null {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) as AuthResponse : null;
  }

  private store(res: AuthResponse): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(res));
    this.session.set(res);
  }

  login(email: string, password: string) {
    return this.http.post<AuthResponse>(API_BASE + '/auth/login', { email, password })
      .pipe(tap(res => this.store(res)));
  }

  register(payload: unknown) {
    return this.http.post<AuthResponse>(API_BASE + '/auth/register', payload)
      .pipe(tap(res => this.store(res)));
  }

  logout(): void {
    localStorage.removeItem(STORAGE_KEY);
    this.session.set(null);
    this.router.navigate(['/']);
  }

  get token(): string | null {
    return this.session()?.token ?? null;
  }

  isLoggedIn(): boolean {
    return !!this.session();
  }

  hasRole(role: Role): boolean {
    return this.session()?.role === role;
  }
}
