import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService, User } from '../../services/auth.service';

interface Exam {
  id: number;
  title: string;
  subject: string;
  questions: number;
  duration: number;
  publishDate: string;
  status: 'published' | 'draft' | 'closed';
  attempts?: number;
  avgScore?: number;
}

@Component({
  selector: 'app-exam-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './exam-management.component.html',
  styleUrl: './exam-management.component.css'
})
export class ExamManagementComponent implements OnInit {
  currentUser: User | null = null;
  exams: Exam[] = [];
  filterSubject: string = '';
  filterStatus: string = '';
  subjects: string[] = ['Toán học', 'Vật lý', 'Hóa học', 'Sinh học', 'Ngữ văn', 'Tiếng Anh', 'Lịch sử', 'Địa lý'];
  
  constructor(private authService: AuthService, private router: Router) { }

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    if (!this.currentUser || this.currentUser.role !== 'teacher') {
      this.router.navigate(['/login']);
      return;
    }
    this.loadMockExams();
  }

  private loadMockExams(): void {
    this.exams = [
      {
        id: 1,
        title: 'Kiểm tra giữa kỳ',
        subject: 'Toán học',
        questions: 30,
        duration: 45,
        publishDate: '2025-03-15',
        status: 'published',
        attempts: 25,
        avgScore: 7.5
      },
      {
        id: 2,
        title: 'Bài kiểm tra 15 phút',
        subject: 'Vật lý',
        questions: 10,
        duration: 15,
        publishDate: '2025-03-18',
        status: 'published',
        attempts: 28,
        avgScore: 8.2
      },
      {
        id: 3,
        title: 'Bài tập về nhà',
        subject: 'Hóa học',
        questions: 20,
        duration: 30,
        publishDate: '2025-03-20',
        status: 'draft'
      },
      {
        id: 4,
        title: 'Kiểm tra cuối kỳ',
        subject: 'Ngữ văn',
        questions: 10,
        duration: 90,
        publishDate: '2025-02-10',
        status: 'closed',
        attempts: 30,
        avgScore: 6.8
      },
      {
        id: 5,
        title: 'Kiểm tra 1 tiết',
        subject: 'Tiếng Anh',
        questions: 40,
        duration: 45,
        publishDate: '2025-01-25',
        status: 'closed',
        attempts: 32,
        avgScore: 7.6
      }
    ];
  }

  getFilteredExams(): Exam[] {
    return this.exams.filter(exam => {
      return (this.filterSubject === '' || exam.subject === this.filterSubject) &&
             (this.filterStatus === '' || exam.status === this.filterStatus);
    });
  }

  createNewExam(): void {
    // Navigate to exam creator page
    // this.router.navigate(['/dashboard/exam-creator']);
    alert('Chức năng tạo đề thi mới sẽ được phát triển trong phiên bản tiếp theo!');
  }
  
  editExam(examId: number): void {
    // Navigate to edit exam page with id
    // this.router.navigate(['/dashboard/exam-editor', examId]);
    alert(`Chức năng chỉnh sửa đề thi ${examId} sẽ được phát triển trong phiên bản tiếp theo!`);
  }
  
  deleteExam(examId: number): void {
    if (confirm('Bạn có chắc chắn muốn xóa đề thi này không?')) {
      this.exams = this.exams.filter(exam => exam.id !== examId);
    }
  }
  
  viewResults(examId: number): void {
    // Navigate to results page for exam
    // this.router.navigate(['/dashboard/exam-results', examId]);
    alert(`Chức năng xem kết quả đề thi ${examId} sẽ được phát triển trong phiên bản tiếp theo!`);
  }
  
  publishExam(examId: number): void {
    const exam = this.exams.find(e => e.id === examId);
    if (exam && exam.status === 'draft') {
      exam.status = 'published';
      exam.publishDate = new Date().toISOString().split('T')[0];
    }
  }
  
  closeExam(examId: number): void {
    const exam = this.exams.find(e => e.id === examId);
    if (exam && exam.status === 'published') {
      exam.status = 'closed';
    }
  }
}
