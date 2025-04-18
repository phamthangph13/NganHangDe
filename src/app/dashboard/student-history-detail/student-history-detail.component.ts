import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { ExamService, ExamHistoryDTO } from '../../services/exam.service';
import { catchError } from 'rxjs/operators';
import { of } from 'rxjs';

@Component({
  selector: 'app-student-history-detail',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './student-history-detail.component.html',
  styleUrl: './student-history-detail.component.css'
})
export class StudentHistoryDetailComponent implements OnInit {
  studentId: string = '';
  studentName: string = '';
  examHistory: ExamHistoryDTO[] = [];
  loading = true;
  error: string | null = null;
  
  constructor(
    private examService: ExamService,
    private router: Router,
    private route: ActivatedRoute
  ) { }

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.studentId = params['id'];
      if (this.studentId) {
        this.loadExamHistory();
      } else {
        this.error = 'Không tìm thấy mã học sinh';
        this.loading = false;
      }
    });

    // Student name should be provided in query params in a real app
    this.route.queryParams.subscribe(params => {
      this.studentName = params['name'] || 'Học sinh';
    });
  }

  loadExamHistory(): void {
    this.loading = true;
    this.error = null;
    
    this.examService.getStudentExamHistoryById(this.studentId)
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
    this.router.navigate(['/dashboard/student-result', attemptId]);
  }

  goBack(): void {
    this.router.navigate(['/dashboard/teacher']);
  }
}
