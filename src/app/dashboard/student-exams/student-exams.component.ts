import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';
import { ExamService, Exam } from '../../services/exam.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-student-exams',
  standalone: true,
  imports: [
    CommonModule, 
    RouterModule, 
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatProgressBarModule,
    MatTooltipModule,
    MatDividerModule
  ],
  templateUrl: './student-exams.component.html',
  styleUrl: './student-exams.component.css'
})
export class StudentExamsComponent implements OnInit {
  availableExams: Exam[] = [];
  loading = true;
  error: string | null = null;
  
  constructor(
    private examService: ExamService,
    private authService: AuthService,
    private router: Router
  ) {}
  
  ngOnInit(): void {
    // Verify authentication before loading exams
    if (!this.authService.isAuthenticated()) {
      console.log('StudentExams: User not authenticated, redirecting to login');
      this.router.navigate(['/auth/login']);
      return;
    }
    
    this.loadAvailableExams();
  }
  
  public loadAvailableExams(): void {
    this.loading = true;
    this.error = null;
    
    this.examService.getStudentAvailableExams().subscribe({
      next: (exams) => {
        console.log('Loaded available exams:', exams);
        this.availableExams = exams;
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading available exams:', err);
        this.error = 'Không thể tải danh sách đề thi. Vui lòng thử lại sau.';
        this.loading = false;
      }
    });
  }
  
  // Direct navigation with authentication check
  startExam(examId: string): void {
    if (!this.authService.isAuthenticated()) {
      console.log('Not authenticated, redirecting to login');
      this.router.navigate(['/auth/login'], { 
        queryParams: { returnUrl: `/exam/${examId}` } 
      });
      return;
    }
    
    console.log(`Navigating to exam ${examId}`);
    this.router.navigate(['/exam', examId]);
  }
}
