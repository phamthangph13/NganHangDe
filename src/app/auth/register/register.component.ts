import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService, RegisterDto } from '../../services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, CommonModule],
  templateUrl: './register.component.html',
  styleUrl: './register.component.css'
})
export class RegisterComponent implements OnInit {
  registerForm!: FormGroup;
  showPassword = false;
  userType: 'student' | 'teacher' = 'student';
  isLoading = false;
  error = '';
  successMessage = '';

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit() {
    this.initForm();
  }

  initForm() {
    // Create base form fields
    this.registerForm = this.fb.group({
      firstName: ['', [Validators.required]],
      lastName: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      agreement: [false, [Validators.requiredTrue]]
    });

    // Add role-specific form fields
    this.addRoleSpecificControls();
  }

  changeUserType(type: 'student' | 'teacher') {
    this.userType = type;
    this.addRoleSpecificControls();
  }

  addRoleSpecificControls() {
    // Remove existing role-specific controls
    if (this.registerForm.get('schoolName')) {
      this.registerForm.removeControl('schoolName');
    }
    if (this.registerForm.get('grade')) {
      this.registerForm.removeControl('grade');
    }

    // Add new role-specific controls
    if (this.userType === 'teacher') {
      this.registerForm.addControl('schoolName', this.fb.control('', [Validators.required]));
    } else {
      this.registerForm.addControl('grade', this.fb.control('', [Validators.required]));
    }
  }

  toggleShowPassword() {
    this.showPassword = !this.showPassword;
  }

  onSubmit() {
    if (this.registerForm.valid) {
      this.isLoading = true;
      this.error = '';
      this.successMessage = '';
      
      const formValue = this.registerForm.value;
      
      const registerData: RegisterDto = {
        email: formValue.email,
        password: formValue.password,
        firstName: formValue.firstName,
        lastName: formValue.lastName,
        role: this.userType.charAt(0).toUpperCase() + this.userType.slice(1) // Capitalize first letter
      };
      
      this.authService.register(registerData).subscribe({
        next: (response) => {
          this.isLoading = false;
          if (response.success) {
            this.successMessage = 'Đăng ký thành công! Vui lòng kiểm tra email để xác thực tài khoản.';
            // Optionally redirect to login page after a delay
            setTimeout(() => {
              this.router.navigate(['/auth/login']);
            }, 2000);
          } else {
            this.error = response.message || 'Đăng ký không thành công';
          }
        },
        error: (err) => {
          this.isLoading = false;
          this.error = err.message || 'Có lỗi xảy ra. Vui lòng thử lại.';
        }
      });
    }
  }
}
