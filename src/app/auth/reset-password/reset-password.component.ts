import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService, ResetPasswordDto } from '../../services/auth.service';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './reset-password.component.html',
  styleUrls: ['./reset-password.component.css']
})
export class ResetPasswordComponent implements OnInit {
  resetPasswordForm!: FormGroup;
  showPassword = false;
  isLoading = false;
  error = '';
  successMessage = '';
  submitted = false;
  token: string = '';
  email: string = '';

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService
  ) {}

  ngOnInit() {
    // Get token and email from query params
    this.route.queryParams.subscribe(params => {
      this.token = params['token'] || '';
      this.email = params['email'] || '';
      
      if (!this.token || !this.email) {
        this.error = 'Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn';
      }
    });

    this.resetPasswordForm = this.fb.group({
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]]
    }, { 
      validators: this.passwordMatchValidator 
    });
  }

  passwordMatchValidator(formGroup: FormGroup) {
    const password = formGroup.get('password')?.value;
    const confirmPassword = formGroup.get('confirmPassword')?.value;
    
    if (password !== confirmPassword) {
      formGroup.get('confirmPassword')?.setErrors({ passwordMismatch: true });
      return { passwordMismatch: true };
    } else {
      formGroup.get('confirmPassword')?.setErrors(null);
      return null;
    }
  }

  toggleShowPassword() {
    this.showPassword = !this.showPassword;
  }

  onSubmit() {
    if (this.resetPasswordForm.valid && this.token && this.email) {
      this.isLoading = true;
      this.error = '';
      
      const resetData: ResetPasswordDto = {
        token: this.token,
        email: this.email,
        password: this.resetPasswordForm.value.password
      };
      
      this.authService.resetPassword(resetData).subscribe({
        next: (response) => {
          this.isLoading = false;
          if (response.success) {
            this.submitted = true;
            this.successMessage = 'Đặt lại mật khẩu thành công! Bạn có thể đăng nhập với mật khẩu mới.';
            // Redirect to login after 3 seconds
            setTimeout(() => {
              this.router.navigate(['/auth/login']);
            }, 3000);
          } else {
            this.error = response.message || 'Đặt lại mật khẩu không thành công.';
          }
        },
        error: (err) => {
          this.isLoading = false;
          this.error = err.message || 'Đã xảy ra lỗi. Vui lòng thử lại hoặc yêu cầu liên kết đặt lại mật khẩu mới.';
        }
      });
    }
  }
}
