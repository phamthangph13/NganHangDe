import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Subject } from '../../services/models/subject.model';
import { SubjectService } from '../../services/subject.service';
import { HttpErrorResponse } from '@angular/common/http';

@Component({
  selector: 'app-subject-management',
  templateUrl: './subject-management.component.html',
  styleUrls: ['./subject-management.component.css'],
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule]
})
export class SubjectManagementComponent implements OnInit {
  subjects: Subject[] = [];
  subjectForm: FormGroup;
  isLoading = false;
  isEditing = false;
  currentSubjectId: string | null = null;
  errorMessage: string | null = null;
  successMessage: string | null = null;
  
  // Thêm biến để theo dõi môn học đang được xóa
  subjectToDelete: Subject | null = null;
  showDeleteModal = false;
  
  // Sử dụng inject để sửa lỗi dependency injection
  private subjectService = inject(SubjectService);
  private fb = inject(FormBuilder);

  // Thêm hằng số cho thời gian hiển thị thông báo
  private readonly MESSAGE_TIMEOUT = 3000; // 3 giây

  constructor() {
    this.subjectForm = this.fb.group({
      name: ['', [Validators.required]],
      code: ['', [Validators.required]],
      description: [''],
      gradeLevel: [1, [Validators.required, Validators.min(1), Validators.max(12)]]
    });
  }

  ngOnInit(): void {
    this.loadSubjects();
  }

  loadSubjects(): void {
    this.isLoading = true;
    this.subjectService.getSubjects().subscribe({
      next: (data: Subject[]) => {
        this.subjects = data;
        this.isLoading = false;
      },
      error: (error: Error) => {
        this.errorMessage = 'Lỗi khi tải danh sách môn học: ' + error.message;
        this.isLoading = false;
      }
    });
  }

  onSubmit(): void {
    if (this.subjectForm.invalid) return;

    const subjectData = this.subjectForm.value;
    this.isLoading = true;

    if (this.isEditing && this.currentSubjectId) {
      this.subjectService.updateSubject(this.currentSubjectId, subjectData).subscribe({
        next: () => {
          this.successMessage = 'Cập nhật môn học thành công';
          this.resetForm();
          this.loadSubjects();
          this.autoHideMessage();
        },
        error: (error: HttpErrorResponse) => {
          this.handleApiError(error, 'updating');
        }
      });
    } else {
      this.subjectService.createSubject(subjectData).subscribe({
        next: () => {
          this.successMessage = 'Thêm môn học thành công';
          this.resetForm();
          this.loadSubjects();
          this.autoHideMessage();
        },
        error: (error: HttpErrorResponse) => {
          this.handleApiError(error, 'creating');
        }
      });
    }
  }

  handleApiError(error: HttpErrorResponse, action: string): void {
    this.isLoading = false;
    if (error.error && typeof error.error === 'object' && 'message' in error.error) {
      if (error.error.message === 'Subject code already exists') {
        this.errorMessage = 'Mã môn học đã tồn tại, vui lòng sử dụng mã khác';
      } else {
        this.errorMessage = `Lỗi khi ${this.getVietnameseAction(action)} môn học: ${error.error.message}`;
      }
    } else {
      this.errorMessage = `Lỗi khi ${this.getVietnameseAction(action)} môn học: ${error.message}`;
    }
  }

  getVietnameseAction(action: string): string {
    switch (action) {
      case 'updating': return 'cập nhật';
      case 'creating': return 'thêm mới';
      case 'deleting': return 'xóa';
      case 'loading': return 'tải';
      default: return action;
    }
  }

  editSubject(subject: Subject): void {
    // Check if the subject exists and has required properties
    if (!subject || typeof subject !== 'object') {
      this.errorMessage = 'Không thể chỉnh sửa: Dữ liệu môn học không hợp lệ';
      return;
    }

    // Safely access ID - try both _id and id, as the backend might return either format
    const subjectId = subject._id || (subject as any).id;
    
    if (!subjectId) {
      this.errorMessage = 'Không thể chỉnh sửa: Môn học không có ID';
      return;
    }

    this.isEditing = true;
    this.currentSubjectId = subjectId;
    this.subjectForm.patchValue({
      name: subject.name || '',
      code: subject.code || '',
      description: subject.description || '',
      gradeLevel: subject.gradeLevel || 1
    });
  }

  deleteSubject(subject: Subject): void {
    // Check if the subject exists and has required properties
    if (!subject || typeof subject !== 'object') {
      this.errorMessage = 'Không thể xóa: Dữ liệu môn học không hợp lệ';
      return;
    }

    // Set the subject to delete and show the modal
    this.subjectToDelete = subject;
    this.showDeleteModal = true;
    document.body.classList.add('modal-open');
  }
  
  confirmDelete(): void {
    if (!this.subjectToDelete) {
      this.showDeleteModal = false;
      document.body.classList.remove('modal-open');
      return;
    }
    
    // Safely access ID - try both _id and id, as the backend might return either format
    const subjectId = this.subjectToDelete._id || (this.subjectToDelete as any).id;
    
    if (!subjectId) {
      this.errorMessage = 'Không thể xóa: Môn học không có ID';
      this.showDeleteModal = false;
      document.body.classList.remove('modal-open');
      return;
    }

    this.isLoading = true;
    this.subjectService.deleteSubject(subjectId).subscribe({
      next: () => {
        this.successMessage = 'Xóa môn học thành công';
        this.loadSubjects();
        this.showDeleteModal = false;
        this.subjectToDelete = null;
        document.body.classList.remove('modal-open');
        this.autoHideMessage();
      },
      error: (error: HttpErrorResponse) => {
        this.handleApiError(error, 'deleting');
        this.showDeleteModal = false;
        this.subjectToDelete = null;
        document.body.classList.remove('modal-open');
      }
    });
  }
  
  cancelDelete(): void {
    this.showDeleteModal = false;
    this.subjectToDelete = null;
    document.body.classList.remove('modal-open');
  }

  resetForm(): void {
    this.isEditing = false;
    this.currentSubjectId = null;
    this.subjectForm.reset({
      name: '',
      code: '',
      description: '',
      gradeLevel: 1
    });
    this.errorMessage = null;
    this.successMessage = null;
    this.isLoading = false;
  }

  clearMessages(): void {
    this.errorMessage = null;
    this.successMessage = null;
  }

  /**
   * Tự động ẩn thông báo sau một khoảng thời gian
   */
  private autoHideMessage(): void {
    setTimeout(() => {
      this.successMessage = null;
      this.errorMessage = null;
    }, this.MESSAGE_TIMEOUT);
  }
} 