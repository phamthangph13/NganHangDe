import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService, User } from '../../services/auth.service';
import { ExamService, Exam } from '../../services/exam.service';

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
  loading: boolean = false;
  successMessage: string | null = null;
  createdExamLink: string | null = null;
  requiresPassword: boolean = false;
  
  constructor(
    private authService: AuthService, 
    private examService: ExamService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    if (!this.currentUser || this.currentUser.role !== 'teacher') {
      this.router.navigate(['/login']);
      return;
    }
    
    // Kiểm tra xem có tin nhắn thành công từ việc tạo đề thi không
    // Ưu tiên kiểm tra từ localStorage trước
    if (localStorage.getItem('examCreationSuccess') === 'true') {
      this.successMessage = localStorage.getItem('successMessage') || 'Đề thi đã được tạo thành công!';
      this.createdExamLink = localStorage.getItem('examLink') || null;
      this.requiresPassword = localStorage.getItem('requirePassword') === 'true';
      
      // Xóa dữ liệu sau khi đã sử dụng
      localStorage.removeItem('examCreationSuccess');
      localStorage.removeItem('examLink');
      localStorage.removeItem('requirePassword');
      localStorage.removeItem('successMessage');
      
      // Auto-dismiss the message after 10 seconds
      setTimeout(() => {
        this.successMessage = null;
      }, 10000);
    }
    // Nếu không có từ localStorage, thử kiểm tra từ router state
    else {
      // Check if we have a success message from exam creation
      const navigation = this.router.getCurrentNavigation();
      if (navigation?.extras.state) {
        const state = navigation.extras.state as {
          message: string;
          examLink: string;
          requirePassword: boolean;
        };
        
        if (state.message) {
          this.successMessage = state.message;
          
          // Auto-dismiss the message after 10 seconds
          setTimeout(() => {
            this.successMessage = null;
          }, 10000);
        }
        
        if (state.examLink) {
          this.createdExamLink = state.examLink;
          this.requiresPassword = state.requirePassword || false;
        }
      }
    }
    
    this.loadExams();
  }

  private loadExams(): void {
    this.loading = true;
    this.examService.getTeacherExams().subscribe({
      next: (data) => {
        this.exams = data;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading exams:', error);
        this.loading = false;
        // If API fails, load mock data for development
        this.loadMockExams();
      }
    });
  }

  private loadMockExams(): void {
    // Keeping mock data for fallback
    this.exams = [
      {
        id: '1',
        title: 'Kiểm tra giữa kỳ',
        questionSetId: '1',
        questionSetTitle: 'Bộ đề Toán học',
        description: 'Đề kiểm tra giữa kỳ',
        duration: 45,
        accessType: 'public',
        status: 'published',
        publishDate: new Date('2025-03-15'),
        createdAt: new Date('2025-03-01'),
        updatedAt: new Date('2025-03-01'),
        questionCount: 30,
        attemptCount: 25,
        averageScore: 7.5
      },
      {
        id: '2',
        title: 'Bài kiểm tra 15 phút',
        questionSetId: '2',
        questionSetTitle: 'Bộ đề Vật lý',
        description: 'Đề kiểm tra ngắn',
        duration: 15,
        accessType: 'class',
        classId: '1',
        className: 'Lớp 10A',
        status: 'published',
        publishDate: new Date('2025-03-18'),
        createdAt: new Date('2025-03-10'),
        updatedAt: new Date('2025-03-10'),
        questionCount: 10,
        attemptCount: 28,
        averageScore: 8.2
      },
      {
        id: '3',
        title: 'Bài tập về nhà',
        questionSetId: '3',
        questionSetTitle: 'Bộ đề Hóa học',
        description: 'Bài tập về nhà hàng tuần',
        duration: 30,
        accessType: 'selected',
        classId: '2',
        className: 'Lớp 11B',
        selectedStudentIds: ['1', '2', '3'],
        status: 'draft',
        createdAt: new Date('2025-03-18'),
        updatedAt: new Date('2025-03-18'),
        questionCount: 20
      }
    ];
  }

  getFilteredExams(): Exam[] {
    return this.exams.filter(exam => {
      return (this.filterSubject === '' || exam.questionSetTitle.includes(this.filterSubject)) &&
             (this.filterStatus === '' || exam.status === this.filterStatus);
    });
  }

  createNewExam(): void {
    this.router.navigate(['/dashboard/exam-creator']);
  }
  
  editExam(examId: string): void {
    console.log('Navigating to exam editor with ID:', examId);
    
    // Navegar por URL para asegurar que se force una recarga del componente
    const url = this.router.serializeUrl(
      this.router.createUrlTree(['/dashboard/exam-editor', examId])
    );
    
    // Alternativa 1: Usar navigateByUrl
    this.router.navigateByUrl(url);
    
    // Alternativa 2: Si la anterior no funciona, probar esta
    // window.location.href = url;
  }
  
  deleteExam(examId: string): void {
    if (confirm('Bạn có chắc chắn muốn xóa đề thi này không?')) {
      this.loading = true;
      this.examService.deleteExam(examId).subscribe({
        next: () => {
          this.exams = this.exams.filter(exam => exam.id !== examId);
          this.loading = false;
        },
        error: (error) => {
          console.error('Error deleting exam:', error);
          this.loading = false;
          // For demo purposes, remove from local array anyway
          this.exams = this.exams.filter(exam => exam.id !== examId);
        }
      });
    }
  }
  
  viewResults(examId: string): void {
    this.router.navigate(['/dashboard/exam-results', examId]);
  }
  
  publishExam(examId: string): void {
    this.loading = true;
    this.examService.publishExam(examId).subscribe({
      next: () => {
        const exam = this.exams.find(e => e.id === examId);
        if (exam) {
          exam.status = 'published';
          exam.publishDate = new Date();
        }
        this.loading = false;
      },
      error: (error) => {
        console.error('Error publishing exam:', error);
        this.loading = false;
        // For demo purposes, update status anyway
        const exam = this.exams.find(e => e.id === examId);
        if (exam) {
          exam.status = 'published';
          exam.publishDate = new Date();
        }
      }
    });
  }
  
  closeExam(examId: string): void {
    this.loading = true;
    this.examService.closeExam(examId).subscribe({
      next: () => {
        const exam = this.exams.find(e => e.id === examId);
        if (exam) {
          exam.status = 'closed';
        }
        this.loading = false;
      },
      error: (error) => {
        console.error('Error closing exam:', error);
        this.loading = false;
        // For demo purposes, update status anyway
        const exam = this.exams.find(e => e.id === examId);
        if (exam) {
          exam.status = 'closed';
        }
      }
    });
  }

  getFullExamLink(): string {
    if (!this.createdExamLink) return '';
    
    // Create a full URL based on the current host
    const baseUrl = window.location.origin;
    return `${baseUrl}${this.createdExamLink}`;
  }
  
  copyExamLink(inputElement: HTMLInputElement): void {
    inputElement.select();
    document.execCommand('copy');
    
    // Show temporary "copied" message
    const originalText = inputElement.nextElementSibling?.textContent;
    if (inputElement.nextElementSibling) {
      inputElement.nextElementSibling.textContent = ' Đã sao chép!';
      
      setTimeout(() => {
        if (inputElement.nextElementSibling && originalText) {
          inputElement.nextElementSibling.textContent = originalText;
        }
      }, 1500);
    }
  }

  // Lấy phần hiển thị ngắn gọn của link bài thi
  getExamLinkPrefix(examId: string): string {
    return `/exam/${examId}`;
  }
  
  // Tạo và sao chép URL đầy đủ cho bài thi
  copyExamUrl(examId: string): void {
    const baseUrl = window.location.origin;
    const examUrl = `${baseUrl}/exam/${examId}`;
    
    // Tạo textarea tạm thời để sao chép
    const tempTextarea = document.createElement('textarea');
    tempTextarea.value = examUrl;
    document.body.appendChild(tempTextarea);
    tempTextarea.select();
    document.execCommand('copy');
    document.body.removeChild(tempTextarea);
    
    // Hiển thị thông báo đã sao chép
    this.showCopyTooltip();
  }
  
  // Hiển thị thông báo đã sao chép
  private showCopyTooltip(): void {
    const tooltip = document.createElement('div');
    tooltip.textContent = 'Đã sao chép!';
    tooltip.className = 'copy-tooltip';
    tooltip.style.position = 'fixed';
    tooltip.style.top = '50%';
    tooltip.style.left = '50%';
    tooltip.style.transform = 'translate(-50%, -50%)';
    tooltip.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    tooltip.style.color = 'white';
    tooltip.style.padding = '8px 16px';
    tooltip.style.borderRadius = '4px';
    tooltip.style.zIndex = '9999';
    
    document.body.appendChild(tooltip);
    
    setTimeout(() => {
      document.body.removeChild(tooltip);
    }, 1500);
  }
}
