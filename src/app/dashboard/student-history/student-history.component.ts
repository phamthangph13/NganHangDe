import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { ExamService, ExamHistoryDTO } from '../../services/exam.service';
import { catchError } from 'rxjs/operators';
import { of } from 'rxjs';

@Component({
  selector: 'app-student-history',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './student-history.component.html',
  styleUrl: './student-history.component.css'
})
export class StudentHistoryComponent implements OnInit {
  examHistory: ExamHistoryDTO[] = [];
  loading = true;
  error: string | null = null;
  
  constructor(
    private examService: ExamService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.loadExamHistory();
  }

  loadExamHistory(): void {
    this.loading = true;
    this.error = null;
    
    this.examService.getStudentExamHistory()
      .pipe(
        catchError(error => {
          console.error('Error loading exam history:', error);
          this.error = 'Không thể tải lịch sử làm bài. Vui lòng thử lại sau.';
          return of([]);
        })
      )
      .subscribe(history => {
        this.examHistory = history.sort((a, b) => 
          new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
        );
        this.loading = false;
      });
  }
  
  getStatusClass(status: string): string {
    switch (status) {
      case 'completed':
      case 'Đã hoàn thành':
        return 'status-completed';
      case 'in_progress':
        return 'status-in-progress';
      case 'abandoned':
        return 'status-abandoned';
      default:
        return '';
    }
  }
  
  getScoreClass(score: number | null): string {
    if (score === null) return '';
    
    if (score >= 8) return 'score-excellent';
    if (score >= 6.5) return 'score-good';
    if (score >= 5) return 'score-average';
    return 'score-poor';
  }
  
  viewExamResult(attemptId: string): void {
    this.router.navigate(['/exam/result', attemptId]);
  }
} 