import { Injectable } from '@angular/core';
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor,
  HttpErrorResponse
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';
import { Router } from '@angular/router';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    // Skip adding token for authentication requests themselves
    if (request.url.includes('/login') || request.url.includes('/register') || 
        request.url.includes('/forgot-password') || request.url.includes('/reset-password')) {
      return next.handle(request);
    }
    
    // Get the token from the auth service
    const token = this.authService.getToken();
    
    // If token exists, clone the request and add the authorization header
    if (token) {
      // For multipart form data, we need to handle it differently to avoid overriding Content-Type
      let authRequest: HttpRequest<unknown>;
      
      console.log('Request method:', request.method, 'URL:', request.url);
      
      if (request.body instanceof FormData) {
        console.log('Request body is FormData');
        authRequest = request.clone({
          setHeaders: {
            Authorization: `Bearer ${token}`
          }
        });
        console.log('Added Authorization header to FormData request');
      } else {
        console.log('Request body is JSON');
        authRequest = request.clone({
          setHeaders: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        console.log('Added Authorization and Content-Type headers to regular request');
      }
      
      return next.handle(authRequest).pipe(
        tap(event => {
          if (event.type === 0) { // HttpEventType.Sent
            console.log('Request sent with auth token:', authRequest.url);
          }
        }),
        catchError((error: HttpErrorResponse) => {
          console.error('HTTP error:', error.status, error.message, error);
          
          // If we get a 401 Unauthorized error, logout and redirect to login page
          if (error.status === 401) {
            console.error('Unauthorized access, token may be invalid or expired');
            this.authService.logout();
            this.router.navigate(['/auth/login']);
          }
          
          // If we get a 403 Forbidden error, handle it
          if (error.status === 403) {
            console.error('Forbidden access. User role may not have permission for this operation.');
            console.error('User role:', this.authService.getCurrentUser()?.role);
          }
          
          return throwError(() => error);
        })
      );
    }
    
    // If no token, proceed with the original request
    console.log('Request without auth token:', request.url);
    return next.handle(request);
  }
} 