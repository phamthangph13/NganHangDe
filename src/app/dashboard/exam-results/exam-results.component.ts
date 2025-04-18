import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService, User } from '../../services/auth.service';
import { ExamService, Exam, ExamResult } from '../../services/exam.service';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-exam-results',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './exam-results.component.html',
  styleUrl: './exam-results.component.css'
})
export class ExamResultsComponent implements OnInit {
  currentUser: User | null = null;
  exam: Exam | null = null;
  examResults: ExamResult[] = [];
  loading: boolean = false;
  error: string | null = null;
  sortField: string = 'score';
  sortDirection: 'asc' | 'desc' = 'desc';
  filterName: string = '';
  
  // Statistic properties
  avgScore: number = 0;
  maxScore: number = 0;
  minScore: number = 0;
  passCount: number = 0;
  failCount: number = 0;
  
  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService,
    private examService: ExamService
  ) { }

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    if (!this.currentUser || this.currentUser.role !== 'teacher') {
      this.router.navigate(['/login']);
      return;
    }
    
    const examId = this.route.snapshot.paramMap.get('id');
    if (!examId) {
      this.error = 'Không tìm thấy ID đề thi';
      return;
    }
    
    this.loadExam(examId);
    
    // Kiểm tra token xác thực
    const token = this.authService.getToken();
    if (!token) {
      this.error = 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
      return;
    }
    
    // Gọi API để lấy kết quả đề thi
    this.loadExamResults(examId);
  }
  
  private loadExam(examId: string): void {
    this.loading = true;
    this.examService.getExamById(examId).subscribe({
      next: (data) => {
        this.exam = data;
        this.loading = false;
      },
      error: (error: any) => {
        console.error('Error loading exam:', error);
        this.error = 'Không thể tải thông tin đề thi';
        this.loading = false;
      }
    });
  }
  
  private loadExamResults(examId: string): void {
    this.loading = true;
    this.examService.getExamResults(examId).subscribe({
      next: (data: ExamResult[]) => {
        this.examResults = data;
        if (this.examResults && this.examResults.length > 0) {
          this.calculateStatistics();
        }
        this.loading = false;
      },
      error: (error: any) => {
        console.error('Error loading exam results:', error);
        if (error.status === 401) {
          this.error = 'Bạn không có quyền xem kết quả đề thi này. Vui lòng đăng nhập lại.';
        } else if (error.status === 404) {
          this.error = 'Không tìm thấy kết quả cho đề thi này.';
        } else {
          this.error = 'Không thể tải kết quả của đề thi. Vui lòng thử lại sau.';
        }
        this.loading = false;
        this.examResults = [];
      }
    });
  }
  
  private calculateStatistics(): void {
    const completedResults = this.examResults.filter(r => r.completed);
    
    if (completedResults.length === 0) {
      this.avgScore = 0;
      this.maxScore = 0;
      this.minScore = 0;
      this.passCount = 0;
      this.failCount = 0;
      return;
    }
    
    // Calculate average score
    this.avgScore = completedResults.reduce((sum, result) => sum + result.score, 0) / completedResults.length;
    
    // Calculate max and min scores
    this.maxScore = Math.max(...completedResults.map(r => r.score));
    this.minScore = Math.min(...completedResults.map(r => r.score));
    
    // Calculate pass/fail counts (assuming 5.0 is passing score)
    this.passCount = completedResults.filter(r => r.score >= 5.0).length;
    this.failCount = completedResults.filter(r => r.score < 5.0).length;
  }
  
  getFilteredResults(): ExamResult[] {
    // Filter by name if filterName is provided
    let filtered = this.examResults;
    if (this.filterName.trim() !== '') {
      const searchTerm = this.filterName.toLowerCase().trim();
      filtered = filtered.filter(r => 
        r.studentName.toLowerCase().includes(searchTerm)
      );
    }
    
    // Sort results
    return this.sortResults(filtered);
  }
  
  private sortResults(results: ExamResult[]): ExamResult[] {
    return [...results].sort((a, b) => {
      let aValue: any = a[this.sortField as keyof ExamResult];
      let bValue: any = b[this.sortField as keyof ExamResult];
      
      // Handle null values for sorting
      if (aValue === null) aValue = 0;
      if (bValue === null) bValue = 0;
      
      // Adjust for dates
      if (aValue instanceof Date && bValue instanceof Date) {
        aValue = aValue.getTime();
        bValue = bValue.getTime();
      }
      
      // For string values
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return this.sortDirection === 'asc' 
          ? aValue.localeCompare(bValue) 
          : bValue.localeCompare(aValue);
      }
      
      // For number values
      return this.sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
    });
  }
  
  setSorting(field: string): void {
    if (this.sortField === field) {
      // Toggle direction if already sorting by this field
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      // Set new field and default to descending for score, otherwise ascending
      this.sortField = field;
      this.sortDirection = field === 'score' ? 'desc' : 'asc';
    }
  }
  
  getSortIcon(field: string): string {
    if (this.sortField !== field) {
      return 'fa-sort';
    }
    return this.sortDirection === 'asc' ? 'fa-sort-up' : 'fa-sort-down';
  }
  
  viewStudentDetail(resultId: string): void {
    this.router.navigate(['/dashboard/student-result', resultId]);
  }
  
  viewStudentHistory(studentId: string, studentName: string): void {
    this.router.navigate(['/dashboard/student-history', studentId], { 
      queryParams: { name: studentName }
    });
  }
  
  exportResults(): void {
    // This would typically generate a CSV or Excel file
    alert('Tính năng xuất kết quả sẽ được triển khai trong phiên bản tiếp theo');
  }
  
  backToExams(): void {
    this.router.navigate(['/dashboard/exams']);
  }
} 