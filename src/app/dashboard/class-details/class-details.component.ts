import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

interface ClassDetail {
  id: string;
  name: string;
  grade: number;
  classCode: string;
  createdAt: Date;
  teacherId: string;
  students: StudentEnrollment[];
}

interface StudentEnrollment {
  id: string;
  name: string;
  email: string;
  joinDate: Date;
}

interface ClassCodeResponse {
  code: string;
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
  loading: boolean = true;
  error: string | null = null;
  success: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient
  ) { }

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.classId = id;
        this.loadClassDetails();
      } else {
        this.router.navigate(['/dashboard/classes']);
      }
    });
  }

  loadClassDetails(): void {
    this.loading = true;
    this.error = null;

    this.http.get<ClassDetail>(`${environment.apiUrl}/classes/${this.classId}`).subscribe(
      (data: ClassDetail) => {
        this.classDetail = data;
        this.loading = false;
      },
      (error: any) => {
        this.error = 'Failed to load class details. Please try again.';
        this.loading = false;
        console.error('Error loading class details:', error);
      }
    );
  }

  copyClassCode(): void {
    if (this.classDetail && this.classDetail.classCode) {
      // Simplified clipboard copy without @angular/cdk
      const textArea = document.createElement('textarea');
      textArea.value = this.classDetail.classCode;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      
      // Show simple notification
      this.success = 'Class code copied to clipboard';
      setTimeout(() => {
        this.success = null;
      }, 3000);
    }
  }

  regenerateClassCode(): void {
    if (confirm('Are you sure you want to regenerate the class code? The old code will no longer work.')) {
      this.loading = true;
      this.http.post<ClassCodeResponse>(`${environment.apiUrl}/classes/${this.classId}/regenerate-code`, {}).subscribe(
        (data: ClassCodeResponse) => {
          if (this.classDetail) {
            this.classDetail.classCode = data.code;
          }
          this.success = 'Class code regenerated successfully';
          this.loading = false;
          
          setTimeout(() => {
            this.success = null;
          }, 5000);
        },
        (error: any) => {
          this.error = 'Failed to regenerate class code. Please try again.';
          this.loading = false;
          console.error('Error regenerating class code:', error);
        }
      );
    }
  }

  removeStudent(studentId: string): void {
    if (confirm('Are you sure you want to remove this student from the class?')) {
      this.loading = true;
      this.http.delete(`${environment.apiUrl}/classes/${this.classId}/students/${studentId}`).subscribe(
        () => {
          if (this.classDetail) {
            this.classDetail.students = this.classDetail.students.filter(
              student => student.id !== studentId
            );
          }
          this.success = 'Student removed successfully';
          this.loading = false;
          
          setTimeout(() => {
            this.success = null;
          }, 5000);
        },
        (error: any) => {
          this.error = 'Failed to remove student. Please try again.';
          this.loading = false;
          console.error('Error removing student:', error);
        }
      );
    }
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