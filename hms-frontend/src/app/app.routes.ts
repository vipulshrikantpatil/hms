import { Routes } from '@angular/router';
import { adminGuard, authGuard } from './services/guards';

export const routes: Routes = [
  { path: '', loadComponent: () => import('./pages/landing.component').then(m => m.LandingComponent) },
  { path: 'login', loadComponent: () => import('./pages/login.component').then(m => m.LoginComponent) },
  { path: 'register', loadComponent: () => import('./pages/register.component').then(m => m.RegisterComponent) },
  {
    path: 'dashboard', canActivate: [authGuard],
    loadComponent: () => import('./pages/patient-dashboard.component').then(m => m.PatientDashboardComponent)
  },
  {
    path: 'book', canActivate: [authGuard],
    loadComponent: () => import('./pages/book.component').then(m => m.BookComponent)
  },
  {
    path: 'payment/:id', canActivate: [authGuard],
    loadComponent: () => import('./pages/payment.component').then(m => m.PaymentComponent)
  },
  {
    path: 'admin', canActivate: [adminGuard],
    loadComponent: () => import('./pages/admin-dashboard.component').then(m => m.AdminDashboardComponent)
  },
  { path: '**', redirectTo: '' }
];
