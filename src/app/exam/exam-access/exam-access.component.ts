import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ExamService } from '../../services/exam.service';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { Subject } from 'rxjs';
import { takeUntil, finalize } from 'rxjs/operators';

@Component({
  selector: 'app-exam-access',
  templateUrl: './exam-access.component.html',
  styleUrls: ['./exam-access.component.css'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatProgressBarModule
  ]
})
export class ExamAccessComponent implements OnInit, OnDestroy {
  examId: string = '';
  isLoading: boolean = true;
  hasAccess: boolean = false;
  accessMessage: string = '';
  examTitle: string = '';
  examDuration: number = 0;
  requirePassword: boolean = false;
  passwordForm: FormGroup;
  isSubmitting: boolean = false;
  maxPasswordAttempts: number = 3;
  currentAttempt: number = 0;
  private destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private examService: ExamService,
    private fb: FormBuilder,
    private snackBar: MatSnackBar
  ) {
    this.passwordForm = this.fb.group({
      password: ['', [Validators.required, Validators.minLength(3)]]
    });
  }

  ngOnInit(): void {
    this.examId = this.route.snapshot.paramMap.get('id') || '';
    if (!this.examId) {
      this.showError('Mã bài kiểm tra không hợp lệ');
      this.navigateToDashboard();
      return;
    }

    this.validateExamAccess();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  validateExamAccess(): void {
    this.isLoading = true;
    this.examService.validateExamAccess(this.examId)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.isLoading = false)
      )
      .subscribe({
        next: (response) => {
          this.hasAccess = response.canAccess;
          this.accessMessage = response.message;
          
          if (response.canAccess && response.exam) {
            this.examTitle = response.exam.title;
            this.examDuration = response.exam.duration;
            this.requirePassword = response.exam.requirePassword;
            
            // If no password required, proceed directly to exam
            if (!this.requirePassword) {
              setTimeout(() => this.startExam(), 1500);
            }
          }
        },
        error: (error) => {
          this.hasAccess = false;
          this.accessMessage = 'Lỗi xác thực quyền truy cập: ' + (error.message || 'Lỗi không xác định');
          this.showError(this.accessMessage);
        }
      });
  }

  submitPassword(): void {
    if (this.passwordForm.invalid) {
      return;
    }

    const password = this.passwordForm.get('password')?.value;
    this.isSubmitting = true;
    this.currentAttempt++;

    this.examService.validateExamPassword(this.examId, password)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.isSubmitting = false)
      )
      .subscribe({
        next: (isValid) => {
          if (isValid) {
            this.showSuccess('Mật khẩu chính xác! Đang chuyển hướng đến bài kiểm tra...');
            setTimeout(() => this.startExam(), 1000);
          } else {
            const remainingAttempts = this.maxPasswordAttempts - this.currentAttempt;
            if (remainingAttempts <= 0) {
              this.showError('Bạn đã nhập sai mật khẩu quá nhiều lần. Vui lòng liên hệ giáo viên để được hỗ trợ.');
              setTimeout(() => this.navigateToDashboard(), 3000);
            } else {
              this.showError(`Mật khẩu không chính xác. Bạn còn ${remainingAttempts} lần thử.`);
              this.passwordForm.reset();
              this.passwordForm.get('password')?.markAsPristine();
            }
          }
        },
        error: (error) => {
          this.showError('Lỗi xác thực mật khẩu: ' + (error.message || 'Lỗi không xác định'));
        }
      });
  }

  startExam(): void {
    this.router.navigate([`/exam/${this.examId}/session`]);
  }

  goBack(): void {
    this.navigateToDashboard();
  }

  navigateToDashboard(): void {
    this.router.navigate(['/dashboard']);
  }

  private showError(message: string): void {
    this.snackBar.open(message, 'Đóng', {
      duration: 5000,
      horizontalPosition: 'center',
      verticalPosition: 'bottom',
      panelClass: ['error-snackbar']
    });
  }

  private showSuccess(message: string): void {
    this.snackBar.open(message, 'Đóng', {
      duration: 3000,
      horizontalPosition: 'center',
      verticalPosition: 'bottom',
      panelClass: ['success-snackbar']
    });
  }
} 