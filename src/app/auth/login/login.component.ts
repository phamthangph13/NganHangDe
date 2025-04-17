import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, CommonModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {
  loginForm: FormGroup;
  showPassword = false;
  isLoading = false;
  error = '';
  returnUrl: string = '';

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required]],
      password: ['', [Validators.required]],
      rememberMe: [true]
    });

    // Get return url from route parameters or default to dashboard
    this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/dashboard';
  }

  toggleShowPassword() {
    this.showPassword = !this.showPassword;
  }

  onSubmit() {
    if (this.loginForm.valid) {
      this.isLoading = true;
      this.error = '';
      
      const { email, password, rememberMe } = this.loginForm.value;
      
      this.authService.login(email, password, rememberMe).subscribe({
        next: (user) => {
          this.isLoading = false;
          if (user) {
            // Force role to lowercase for route matching
            const role = (user.role || 'student').toLowerCase();
            console.log('User role after login (normalized):', role);
            
            // Navigate to the appropriate dashboard
            const redirectUrl = this.returnUrl || `/dashboard/${role}`;
            console.log('Redirecting to:', redirectUrl);
            this.router.navigate([redirectUrl]);
          }
        },
        error: (err) => {
          console.error('Login error:', err);
          this.isLoading = false;
          this.error = err.message || 'Không thể đăng nhập. Vui lòng kiểm tra thông tin đăng nhập.';
        }
      });
    }
  }
}
