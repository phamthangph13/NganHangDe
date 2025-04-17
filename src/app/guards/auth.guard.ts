import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {
  constructor(private authService: AuthService, private router: Router) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): boolean {
    if (this.authService.isAuthenticated()) {
      // Check if route requires specific role
      const requiredRole = route.data['role'] as string;
      if (requiredRole) {
        const currentUser = this.authService.getCurrentUser();
        const userRole = currentUser?.role?.toLowerCase() || '';
        const requiredRoleLower = requiredRole.toLowerCase();
        
        console.log('Route requires role:', requiredRoleLower);
        console.log('User has role:', userRole);
        
        // Compare roles case-insensitively
        if (userRole !== requiredRoleLower) {
          console.log('User does not have required role, redirecting...');
          // Redirect to appropriate dashboard based on user's role
          if (currentUser) {
            const normalizedRole = currentUser.role?.toLowerCase() || 'student';
            this.router.navigate([`/dashboard/${normalizedRole}`]);
          } else {
            this.router.navigate(['/auth/login']);
          }
          return false;
        }
      }
      return true;
    }
    
    // Not logged in, redirect to login page
    this.router.navigate(['/auth/login'], { queryParams: { returnUrl: state.url } });
    return false;
  }
} 