import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';
import { PopupService } from './popup.service';

export const authGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.isLoggedIn()) { return true; }
  inject(PopupService).error('Please log in to continue.', 'Login required');
  return router.createUrlTree(['/login'], { queryParams: { redirect: state.url } });
};

export const adminGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.hasRole('ADMIN')) { return true; }
  inject(PopupService).error('Administrator access is required for that page.', 'Access denied');
  return router.createUrlTree(['/login']);
};
