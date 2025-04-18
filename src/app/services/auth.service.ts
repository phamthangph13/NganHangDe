import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of, throwError, switchMap, map, tap } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Router } from '@angular/router';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';

export interface User {
  id?: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role?: string;
  name?: string; // For backward compatibility
}

export interface RegisterDto {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role?: string;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface ForgotPasswordDto {
  email: string;
}

export interface ResetPasswordDto {
  token: string;
  email: string;
  password: string;
}

export interface AuthResponseDto {
  success: boolean;
  message: string;
  token?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly API_URL = 'http://localhost:5296/api/Auth';
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor(
    private router: Router,
    private http: HttpClient
  ) {
    // Check if user is logged in from localStorage
    const storedUser = localStorage.getItem('currentUser');
    const token = localStorage.getItem('auth_token');
    
    if (storedUser && token) {
      this.currentUserSubject.next(JSON.parse(storedUser));
    }
  }

  register(registerData: RegisterDto): Observable<AuthResponseDto> {
    return this.http.post<AuthResponseDto>(`${this.API_URL}/register`, registerData)
      .pipe(
        catchError(this.handleError)
      );
  }

  login(email: string, password: string, rememberMe: boolean = false): Observable<User> {
    const loginData: LoginDto = { email, password };
    console.log('Login attempt with data:', loginData);
    
    return this.http.post<AuthResponseDto>(`${this.API_URL}/login`, loginData)
      .pipe(
        switchMap(response => {
          if (response.success && response.token) {
            console.log('Login response:', response);
            // Store token
            this.storeToken(response.token, rememberMe);
            
            // Get user from API
            return this.getCurrentUserFromApi().pipe(
              tap(user => {
                // Store user
                this.storeUser(user, rememberMe);
                console.log('User role after login (normalized):', user.role);
              })
            );
          } else {
            throw new Error(response.message || 'Login failed');
          }
        }),
        catchError(error => {
          // Handle specific error messages
          if (error.error && error.error.message) {
            return throwError(() => new Error(error.error.message));
          }
          return this.handleError(error);
        })
      );
  }

  private storeToken(token: string, rememberMe: boolean): void {
    if (rememberMe) {
      localStorage.setItem('auth_token', token);
    } else {
      sessionStorage.setItem('auth_token', token);
    }
  }

  private storeUser(user: User, rememberMe: boolean): void {
    // Ensure the user has role and handle case sensitivity
    if (user && !user.firstName && !user.lastName && user.name) {
      // Handle legacy data format if needed
      const nameParts = user.name.split(' ');
      user.firstName = nameParts[0] || '';
      user.lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';
    }
    
    // Force role to lowercase for consistent routing
    const userToStore = {
      ...user,
      name: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
      role: user.role ? user.role.toLowerCase() : 'student'
    };
    
    console.log('Storing user with role:', userToStore.role);
    
    if (rememberMe) {
      localStorage.setItem('currentUser', JSON.stringify(userToStore));
    } else {
      sessionStorage.setItem('currentUser', JSON.stringify(userToStore));
    }
    
    this.currentUserSubject.next(userToStore);
  }

  logout(): void {
    // Remove user from storage
    localStorage.removeItem('currentUser');
    localStorage.removeItem('auth_token');
    sessionStorage.removeItem('currentUser');
    sessionStorage.removeItem('auth_token');
    this.currentUserSubject.next(null);
    this.router.navigate(['/auth/login']);
  }

  forgotPassword(email: string): Observable<AuthResponseDto> {
    const forgotPasswordData: ForgotPasswordDto = { email };
    return this.http.post<AuthResponseDto>(`${this.API_URL}/forgot-password`, forgotPasswordData)
      .pipe(
        catchError(this.handleError)
      );
  }

  resetPassword(resetData: ResetPasswordDto): Observable<AuthResponseDto> {
    return this.http.post<AuthResponseDto>(`${this.API_URL}/reset-password`, resetData)
      .pipe(
        catchError(this.handleError)
      );
  }

  verifyEmail(email: string, token: string): Observable<AuthResponseDto> {
    return this.http.get<AuthResponseDto>(`${this.API_URL}/verify-email?email=${email}&token=${token}`)
      .pipe(
        catchError(this.handleError)
      );
  }

  getCurrentUserFromApi(): Observable<User> {
    return this.http.get<User>(`${this.API_URL}/me`)
      .pipe(
        map(user => {
          // Make sure we normalize the response
          if (user && user.role) {
            // Force role to lowercase for consistent routing
            const normalizedUser = {
              ...user,
              role: user.role.toLowerCase()
            };
            return normalizedUser;
          }
          return user;
        }),
        catchError(this.handleError)
      );
  }

  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  getToken(): string | null {
    return localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
  }

  isAuthenticated(): boolean {
    const hasToken = !!this.getToken();
    const hasUser = !!this.currentUserSubject.value;
    console.log('Auth check - Has token:', hasToken, 'Has user:', hasUser);
    return hasToken && hasUser;
  }

  hasRole(role: string): boolean {
    const user = this.currentUserSubject.value;
    const userRole = user?.role?.toLowerCase() || '';
    const requiredRole = role.toLowerCase();
    
    console.log('Role check - Required role:', requiredRole, 'User role:', userRole);
    
    if (!user || !user.role) {
      console.log('Role check failed - No user or role information');
      return false;
    }
    
    // Make comparison case-insensitive
    return userRole === requiredRole;
  }

  private handleError(error: HttpErrorResponse): Observable<never> {
    let errorMessage = 'An unknown error occurred';
    
    if (error.error instanceof ErrorEvent) {
      // Client-side error
      errorMessage = `Error: ${error.error.message}`;
    } else {
      // Server-side error
      errorMessage = error.error?.message || `Error Code: ${error.status}, Message: ${error.message}`;
    }
    
    return throwError(() => new Error(errorMessage));
  }
}
