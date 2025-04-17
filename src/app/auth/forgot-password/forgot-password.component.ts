import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, CommonModule],
  templateUrl: './forgot-password.component.html',
  styleUrl: './forgot-password.component.css'
})
export class ForgotPasswordComponent {
  forgotPasswordForm!: FormGroup;
  submitted = false;
  isLoading = false;
  error = '';
  successMessage = '';

  constructor(
    private fb: FormBuilder,
    private authService: AuthService
  ) {
    this.forgotPasswordForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]]
    });
  }

  onSubmit() {
    if (this.forgotPasswordForm.valid) {
      this.isLoading = true;
      this.error = '';
      
      const email = this.forgotPasswordForm.value.email;
      
      this.authService.forgotPassword(email).subscribe({
        next: (response) => {
          this.isLoading = false;
          this.submitted = true;
          // Always show success even if email doesn't exist (for security)
          this.successMessage = 'Hướng dẫn đặt lại mật khẩu đã được gửi tới email của bạn nếu tài khoản tồn tại.';
        },
        error: (err) => {
          this.isLoading = false;
          // Don't show detailed errors for security reasons
          this.successMessage = 'Hướng dẫn đặt lại mật khẩu đã được gửi tới email của bạn nếu tài khoản tồn tại.';
          this.submitted = true;
        }
      });
    }
  }
}
