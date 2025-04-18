import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService, User } from '../../services/auth.service';
import { ExamService, StudentResultDetail } from '../../services/exam.service';

@Component({
  selector: 'app-student-result',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './student-result.component.html',
  styleUrl: './student-result.component.css'
})
export class StudentResultComponent implements OnInit {
  currentUser: User | null = null;
  resultDetail: StudentResultDetail | null = null;
  loading: boolean = false;
  error: string | null = null;
  
  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService,
    private examService: ExamService
  ) { }

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    if (!this.currentUser) {
      this.router.navigate(['/login']);
      return;
    }
    
    const resultId = this.route.snapshot.paramMap.get('id');
    if (!resultId) {
      this.error = 'Không tìm thấy ID kết quả';
      return;
    }
    
    this.loadStudentResult(resultId);
  }
  
  private loadStudentResult(resultId: string): void {
    this.loading = true;
    this.examService.getStudentResultDetail(resultId).subscribe({
      next: (data) => {
        this.resultDetail = data;
        this.loading = false;
      },
      error: (error: any) => {
        console.error('Error loading student result:', error);
        this.error = 'Không thể tải kết quả chi tiết';
        this.loading = false;
        // Load mock data for development
        this.loadMockResult(resultId);
      }
    });
  }
  
  private loadMockResult(resultId: string): void {
    // Mock data for development
    this.resultDetail = {
      id: resultId,
      studentId: '1',
      studentName: 'Nguyễn Văn A',
      examId: '1',
      score: 8.0,
      totalQuestions: 10,
      correctAnswers: 8,
      startTime: new Date('2025-04-01T09:00:00'),
      endTime: new Date('2025-04-01T09:45:00'),
      duration: 45,
      completed: true,
      answers: [
        {
          questionId: '1',
          questionText: 'Câu hỏi 1: Thủ đô của Việt Nam là gì?',
          correctOptionId: '1',
          selectedOptionId: '1',
          isCorrect: true,
          options: [
            { id: '1', text: 'Hà Nội' },
            { id: '2', text: 'Hồ Chí Minh' },
            { id: '3', text: 'Đà Nẵng' },
            { id: '4', text: 'Huế' }
          ]
        },
        {
          questionId: '2',
          questionText: 'Câu hỏi 2: Sông nào dài nhất Việt Nam?',
          correctOptionId: '2',
          selectedOptionId: '1',
          isCorrect: false,
          options: [
            { id: '1', text: 'Sông Hồng' },
            { id: '2', text: 'Sông Cửu Long' },
            { id: '3', text: 'Sông Đà' },
            { id: '4', text: 'Sông Hương' }
          ]
        },
        {
          questionId: '3',
          questionText: 'Câu hỏi 3: Việt Nam có bao nhiêu tỉnh thành?',
          correctOptionId: '3',
          selectedOptionId: '3',
          isCorrect: true,
          options: [
            { id: '1', text: '54' },
            { id: '2', text: '60' },
            { id: '3', text: '63' },
            { id: '4', text: '65' }
          ]
        }
      ]
    };
  }
  
  getOptionClass(option: { id: string, text: string }, answer: any): string {
    if (answer.correctOptionId === option.id) {
      return 'correct-option';
    } else if (answer.selectedOptionId === option.id && !answer.isCorrect) {
      return 'incorrect-option';
    }
    return '';
  }
  
  getOptionIcon(option: { id: string, text: string }, answer: any): string {
    if (answer.correctOptionId === option.id) {
      return 'fas fa-check-circle';
    } else if (answer.selectedOptionId === option.id && !answer.isCorrect) {
      return 'fas fa-times-circle';
    }
    return '';
  }
  
  backToResults(): void {
    this.router.navigate(['/dashboard/student']);
  }
} 