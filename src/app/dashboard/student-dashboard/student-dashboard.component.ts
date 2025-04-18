import { Component, OnInit, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { AuthService, User } from '../../services/auth.service';
import { ExamService, ExamHistoryDTO } from '../../services/exam.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { catchError } from 'rxjs/operators';
import { of } from 'rxjs';

// Các interface cho dữ liệu mock
interface ExamMock {
  id: number;
  title: string;
  subject: string;
  questions: number;
  duration: number;
  dueDate?: string;
  status?: string;
  score?: number;
}

interface SubjectStat {
  subject: string;
  avgScore: number;
  completedExams: number;
}

interface ClassMock {
  id: string;
  name: string;
  grade: number;
  joinDate: string;
}

@Component({
  selector: 'app-student-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './student-dashboard.component.html',
  styleUrl: './student-dashboard.component.css'
})
export class StudentDashboardComponent implements OnInit, AfterViewInit {
  currentUser: User | null = null;
  upcomingExams: ExamMock[] = [];
  recentExams: ExamMock[] = [];
  subjectStats: SubjectStat[] = [];
  studentClasses: ClassMock[] = [];
  calculateAvgScore: number = 0;
  
  // Dữ liệu lịch sử thi thật
  examHistory: ExamHistoryDTO[] = [];
  historyLoading = false;
  historyError: string | null = null;
  
  @ViewChild('historySection') historySection!: ElementRef;
  
  constructor(
    private authService: AuthService,
    private examService: ExamService,
    private router: Router,
    private snackBar: MatSnackBar,
    private route: ActivatedRoute
  ) { }

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    this.loadMockData();
    this.calculateAverage();
    this.loadExamHistory();
  }
  
  ngAfterViewInit(): void {
    // Xử lý fragment để cuộn đến phần tương ứng sau khi view đã được khởi tạo
    this.route.fragment.subscribe(fragment => {
      if (fragment === 'history') {
        setTimeout(() => {
          const element = document.getElementById('history');
          if (element) {
            console.log('Scrolling to history section');
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
          } else {
            console.log('History element not found');
          }
        }, 500);
      }
    });
  }

  private calculateAverage(): void {
    if (this.recentExams.length === 0) {
      this.calculateAvgScore = 0;
      return;
    }
    
    const sum = this.recentExams.reduce((total, exam) => {
      return total + (exam.score || 0);
    }, 0);
    
    this.calculateAvgScore = sum / this.recentExams.length;
  }

  private loadMockData(): void {
    // Mock upcoming exams
    this.upcomingExams = [
      { 
        id: 1, 
        title: 'Kiểm tra giữa kỳ', 
        subject: 'Toán học',
        questions: 30,
        duration: 45,
        dueDate: '2025-04-20',
        status: 'coming'
      },
      { 
        id: 2, 
        title: 'Bài kiểm tra 15 phút', 
        subject: 'Vật lý',
        questions: 10,
        duration: 15,
        dueDate: '2025-04-18',
        status: 'coming'
      },
      { 
        id: 3, 
        title: 'Bài tập về nhà', 
        subject: 'Hóa học',
        questions: 20,
        duration: 30,
        dueDate: '2025-04-17',
        status: 'available'
      }
    ];
    
    // Mock recent exams
    this.recentExams = [
      { 
        id: 4, 
        title: 'Bài kiểm tra cuối kỳ', 
        subject: 'Ngữ văn',
        questions: 5,
        duration: 60,
        status: 'completed',
        score: 8.5
      },
      { 
        id: 5, 
        title: 'Kiểm tra 1 tiết', 
        subject: 'Tiếng Anh',
        questions: 40,
        duration: 45,
        status: 'completed',
        score: 7.0
      },
      { 
        id: 6, 
        title: 'Bài kiểm tra 15 phút', 
        subject: 'Sinh học',
        questions: 10,
        duration: 15,
        status: 'completed',
        score: 9.0
      }
    ];
    
    // Mock subject statistics
    this.subjectStats = [
      { subject: 'Toán học', avgScore: 7.5, completedExams: 5 },
      { subject: 'Ngữ văn', avgScore: 8.2, completedExams: 4 },
      { subject: 'Tiếng Anh', avgScore: 7.0, completedExams: 6 },
      { subject: 'Vật lý', avgScore: 6.5, completedExams: 3 }
    ];

    // Mock student classes
    this.studentClasses = [
      { id: '1', name: 'Lớp Toán nâng cao', grade: 12, joinDate: '2024-03-15' },
      { id: '2', name: 'Lớp Tiếng Anh giao tiếp', grade: 11, joinDate: '2024-02-20' }
    ];
  }

  loadExamHistory(): void {
    this.historyLoading = true;
    this.historyError = null;
    
    this.examService.getStudentExamHistory()
      .pipe(
        catchError(error => {
          console.error('Error loading exam history:', error);
          this.historyError = 'Không thể tải lịch sử làm bài. Vui lòng thử lại sau.';
          return of([]);
        })
      )
      .subscribe(history => {
        this.examHistory = history.sort((a, b) => 
          new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
        );
        this.historyLoading = false;
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

  scrollToHistory(): void {
    const element = document.getElementById('history');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }
}
