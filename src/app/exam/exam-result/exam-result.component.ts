import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { ExamService, StudentResultDetail } from '../../services/exam.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-exam-result',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatDividerModule,
    MatProgressBarModule,
    MatSnackBarModule
  ],
  templateUrl: './exam-result.component.html',
  styleUrl: './exam-result.component.css'
})
export class ExamResultComponent implements OnInit {
  resultId: string = '';
  result: StudentResultDetail | null = null;
  loading: boolean = true;
  error: string | null = null;
  
  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private examService: ExamService,
    private authService: AuthService,
    private snackBar: MatSnackBar
  ) { }
  
  ngOnInit(): void {
    this.resultId = this.route.snapshot.paramMap.get('id') || '';
    if (!this.resultId) {
      this.error = 'Không tìm thấy mã kết quả bài thi';
      this.loading = false;
      return;
    }
    
    this.loadResult();
  }
  
  private loadResult(): void {
    this.loading = true;
    this.error = null;
    
    this.examService.getStudentResultDetail(this.resultId).subscribe({
      next: (resultDetail) => {
        this.result = resultDetail;
        this.loading = false;
        // Hiển thị thông báo
        this.snackBar.open('Bạn đã hoàn thành bài thi thành công!', 'Đóng', {
          duration: 5000,
          verticalPosition: 'top'
        });
      },
      error: (err) => {
        console.error('Error loading result:', err);
        this.error = 'Không thể tải kết quả bài thi. Vui lòng thử lại sau.';
        this.loading = false;
      }
    });
  }
  
  getScoreClass(): string {
    if (!this.result?.score) return '';
    
    if (this.result.score >= 8) return 'excellent-score';
    if (this.result.score >= 6.5) return 'good-score';
    if (this.result.score >= 5) return 'average-score';
    return 'poor-score';
  }
  
  calculateScorePercentage(): number {
    if (!this.result) return 0;
    return (this.result.correctAnswers / this.result.totalQuestions) * 100;
  }
  
  backToDashboard(): void {
    this.router.navigate(['/dashboard/student']);
  }
}
