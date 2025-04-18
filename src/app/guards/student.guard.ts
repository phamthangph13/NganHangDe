import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router } from '@angular/router';
import { Observable } from 'rxjs';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class StudentGuard implements CanActivate {
  constructor(private authService: AuthService, private router: Router) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> | Promise<boolean> | boolean {
    console.log('StudentGuard: Checking authentication...');
    
    // Check if the user is logged in
    const isAuth = this.authService.isAuthenticated();
    console.log('StudentGuard: Is authenticated:', isAuth);
    
    if (!isAuth) {
      console.log('StudentGuard: Not authenticated, redirecting to login');
      this.router.navigate(['/auth/login'], { queryParams: { returnUrl: state.url } });
      return false;
    }

    // Check if the user has the role "Student"
    const user = this.authService.getCurrentUser();
    const hasRole = this.authService.hasRole('Student');
    console.log('StudentGuard: Current user:', user);
    console.log('StudentGuard: Has Student role:', hasRole);
    
    if (!hasRole) {
      console.log('StudentGuard: Not a student, redirecting to dashboard');
      this.router.navigate(['/dashboard']);
      return false;
    }

    console.log('StudentGuard: Access granted');
    return true;
  }
} 