import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { ClassService, EnrollmentStatus } from '../../services/class.service';

interface ClassInfo {
  id: string;
  name: string;
  grade: number;
  joinDate: Date;
  teacherName: string;
  status?: EnrollmentStatus;
}

interface ClassDetails {
  id: string;
  name: string;
  grade: number;
  classCode: string;
  createdAt: Date;
  accessType?: number;
  students?: any[];
}

@Component({
  selector: 'app-student-classes',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './student-classes.component.html',
  styleUrl: './student-classes.component.css'
})
export class StudentClassesComponent implements OnInit {
  classes: ClassInfo[] = [];
  loading = false;
  error = '';
  success = '';
  classCode = '';
  leavingClassId: string | null = null;
  
  // Modal variables
  selectedClass: ClassDetails | null = null;
  showClassDetailsModal = false;
  loadingDetails = false;
  
  // Enum để sử dụng trong template
  EnrollmentStatus = EnrollmentStatus;

  constructor(
    private http: HttpClient, 
    private router: Router,
    private classService: ClassService
  ) {}

  ngOnInit(): void {
    this.getStudentClasses();
  }

  getStudentClasses(): void {
    this.loading = true;
    this.http.get<ClassInfo[]>(`${environment.apiUrl}/classes/student`)
      .subscribe({
        next: (data) => {
          this.classes = data;
          this.loading = false;
        },
        error: (err) => {
          this.error = 'Không thể tải danh sách lớp học. Vui lòng thử lại sau.';
          this.loading = false;
          console.error(err);
        }
      });
  }

  joinClass(): void {
    if (!this.classCode.trim()) {
      this.error = 'Vui lòng nhập mã lớp học';
      return;
    }

    this.loading = true;
    this.error = '';
    this.success = '';

    this.classService.joinClass(this.classCode).subscribe({
      next: (response: any) => {
        this.success = response.message || 'Tham gia lớp học thành công!';
        this.classCode = '';
        this.loading = false;
        this.getStudentClasses(); // Refresh class list
      },
      error: (err: any) => {
        this.error = err.error?.message || 'Không thể tham gia lớp học. Vui lòng kiểm tra lại mã lớp.';
        this.loading = false;
        console.error(err);
      }
    });
  }

  leaveClass(classId: string): void {
    if (confirm('Bạn có chắc chắn muốn rời khỏi lớp học này?')) {
      this.leavingClassId = classId;
      this.error = '';
      this.success = '';

      this.http.delete(`${environment.apiUrl}/classes/leave/${classId}`)
        .subscribe({
          next: () => {
            this.success = 'Đã rời khỏi lớp học thành công!';
            this.leavingClassId = null;
            this.getStudentClasses(); // Refresh class list
          },
          error: (err) => {
            this.error = err.error?.message || 'Không thể rời khỏi lớp học. Vui lòng thử lại sau.';
            this.leavingClassId = null;
            console.error(err);
          }
        });
    }
  }
  
  viewClassDetails(classId: string): void {
    this.loadingDetails = true;
    this.selectedClass = null;
    this.showClassDetailsModal = true;
    
    this.classService.getClassById(classId).subscribe({
      next: (data: any) => {
        this.selectedClass = data;
        this.loadingDetails = false;
      },
      error: (err) => {
        this.error = 'Không thể tải chi tiết lớp học. Vui lòng thử lại sau.';
        this.loadingDetails = false;
        this.showClassDetailsModal = false;
        console.error('Error loading class details:', err);
      }
    });
  }
  
  closeClassDetailsModal(): void {
    this.showClassDetailsModal = false;
    this.selectedClass = null;
  }
  
  copyClassCode(code: string): void {
    navigator.clipboard.writeText(code)
      .then(() => {
        this.success = 'Đã sao chép mã lớp vào clipboard';
        setTimeout(() => {
          this.success = '';
        }, 3000);
      })
      .catch(err => {
        console.error('Không thể sao chép: ', err);
        this.error = 'Không thể sao chép mã lớp. Vui lòng thử lại.';
      });
  }
  
  getStatusText(status?: EnrollmentStatus): string {
    if (status === EnrollmentStatus.Pending) {
      return 'Đang chờ phê duyệt';
    } else if (status === EnrollmentStatus.Rejected) {
      return 'Đã bị từ chối';
    } else {
      return 'Đã tham gia';
    }
  }
  
  getStatusClass(status?: EnrollmentStatus): string {
    if (status === EnrollmentStatus.Pending) {
      return 'status-pending';
    } else if (status === EnrollmentStatus.Rejected) {
      return 'status-rejected';
    } else {
      return 'status-approved';
    }
  }

  formatDate(date: string | Date): string {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleDateString('vi-VN');
  }
}