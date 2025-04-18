import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { ClassService, ClassAccessType, EnrollmentStatus } from '../../services/class.service';

interface ClassDetail {
  id: string;
  name: string;
  grade: number;
  classCode: string;
  createdAt: Date;
  teacherId: string;
  accessType: ClassAccessType;
  students: StudentEnrollment[];
}

interface StudentEnrollment {
  id: string;
  name: string;
  email: string;
  joinDate: Date;
  status: EnrollmentStatus;
}

interface ClassCodeResponse {
  classCode: string;
  message: string;
}

interface DialogData {
  title: string;
  message: string;
  confirmButton: string;
  cancelButton: string;
}

@Component({
  selector: 'app-class-details',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './class-details.component.html',
  styleUrl: './class-details.component.css'
})
export class ClassDetailsComponent implements OnInit {
  classId: string = '';
  classDetail: ClassDetail | null = null;
  pendingStudents: StudentEnrollment[] = [];
  loading: boolean = true;
  error: string | null = null;
  success: string | null = null;
  
  // Make enums available to template
  accessTypes = ClassAccessType;
  enrollmentStatus = EnrollmentStatus;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient,
    private classService: ClassService
  ) { }

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.classId = id;
        this.loadClassDetails();
        this.loadPendingStudents();
      } else {
        this.router.navigate(['/dashboard/classes']);
      }
    });
  }

  loadClassDetails(): void {
    this.loading = true;
    this.error = null;

    this.classService.getClassById(this.classId).subscribe({
      next: (data) => {
        this.classDetail = data as ClassDetail;
        this.loading = false;
      },
      error: (error) => {
        this.error = 'Không thể tải chi tiết lớp học. Vui lòng thử lại.';
        this.loading = false;
        console.error('Error loading class details:', error);
      }
    });
  }
  
  loadPendingStudents(): void {
    this.classService.getPendingStudents(this.classId).subscribe({
      next: (students) => {
        this.pendingStudents = students as StudentEnrollment[];
        
        // Đảm bảo rằng những học sinh trong pendingStudents không xuất hiện trong classDetail.students
        if (this.classDetail && this.classDetail.students && this.pendingStudents.length > 0) {
          const pendingIds = this.pendingStudents.map(s => s.id);
          this.classDetail.students = this.classDetail.students.filter(s => !pendingIds.includes(s.id));
        }
      },
      error: (error) => {
        console.error('Error loading pending students:', error);
      }
    });
  }

  copyClassCode(): void {
    if (this.classDetail && this.classDetail.classCode) {
      navigator.clipboard.writeText(this.classDetail.classCode)
        .then(() => {
          this.success = 'Đã sao chép mã lớp vào clipboard';
          setTimeout(() => this.success = null, 3000);
        })
        .catch(err => {
          console.error('Could not copy text: ', err);
          this.error = 'Không thể sao chép mã lớp. Vui lòng thử lại.';
        });
    }
  }

  regenerateClassCode(): void {
    if (confirm('Việc tạo mã lớp mới sẽ vô hiệu hóa mã lớp cũ. Bạn có chắc chắn muốn tiếp tục?')) {
      this.loading = true;
      this.classService.regenerateClassCode(this.classId).subscribe({
        next: (response) => {
          if (this.classDetail) {
            this.classDetail.classCode = response.classCode;
          }
          this.success = response.message;
          this.loading = false;
        },
        error: (error) => {
          this.error = 'Không thể tạo mã lớp mới. Vui lòng thử lại sau.';
          this.loading = false;
          console.error('Error regenerating class code:', error);
        }
      });
    }
  }

  approveStudent(studentId: string, approve: boolean): void {
    this.loading = true;
    this.classService.approveStudent(this.classId, studentId, approve).subscribe({
      next: () => {
        // Tìm học sinh trong danh sách chờ duyệt
        const pendingStudent = this.pendingStudents.find(s => s.id === studentId);
        
        // Xóa học sinh khỏi danh sách chờ duyệt
        this.pendingStudents = this.pendingStudents.filter(s => s.id !== studentId);
        
        // Nếu duyệt và có thông tin học sinh
        if (approve && pendingStudent && this.classDetail) {
          // Cập nhật trạng thái thành đã duyệt và thêm vào danh sách học sinh chính
          const approvedStudent = {...pendingStudent};
          approvedStudent.status = EnrollmentStatus.Approved;
          this.classDetail.students.push(approvedStudent);
        }
        
        this.success = approve 
          ? 'Đã phê duyệt yêu cầu tham gia lớp học' 
          : 'Đã từ chối yêu cầu tham gia lớp học';
        this.loading = false;
        
        setTimeout(() => {
          this.success = null;
        }, 3000);
      },
      error: (error) => {
        this.error = 'Không thể xử lý yêu cầu. Vui lòng thử lại.';
        this.loading = false;
        console.error('Error approving/rejecting student:', error);
      }
    });
  }

  removeStudent(studentId: string): void {
    if (confirm('Bạn có chắc chắn muốn xóa học sinh này khỏi lớp học?')) {
      this.loading = true;
      this.http.delete(`${environment.apiUrl}/classes/${this.classId}/students/${studentId}`).subscribe({
        next: () => {
          if (this.classDetail) {
            this.classDetail.students = this.classDetail.students.filter(
              student => student.id !== studentId
            );
          }
          this.success = 'Đã xóa học sinh khỏi lớp học';
          this.loading = false;
          
          setTimeout(() => {
            this.success = null;
          }, 3000);
        },
        error: (error) => {
          this.error = 'Không thể xóa học sinh. Vui lòng thử lại.';
          this.loading = false;
          console.error('Error removing student:', error);
        }
      });
    }
  }

  getAccessTypeLabel(accessType: ClassAccessType | undefined): string {
    if (accessType === ClassAccessType.Approval) {
      return 'Yêu cầu phê duyệt';
    }
    return 'Truy cập trực tiếp';
  }

  goBack(): void {
    this.router.navigate(['/dashboard/classes']);
  }

  formatDate(date: string | Date): string {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleDateString('vi-VN');
  }
} 