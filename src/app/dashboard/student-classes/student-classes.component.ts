import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

interface ClassInfo {
  id: string;
  name: string;
  grade: number;
  joinDate: Date;
  teacherName: string;
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

  constructor(private http: HttpClient) {}

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

    this.http.post(`${environment.apiUrl}/classes/join`, { classCode: this.classCode })
      .subscribe({
        next: () => {
          this.success = 'Tham gia lớp học thành công!';
          this.classCode = '';
          this.loading = false;
          this.getStudentClasses(); // Refresh class list
        },
        error: (err) => {
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

  formatDate(date: string | Date): string {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleDateString('vi-VN');
  }
} 