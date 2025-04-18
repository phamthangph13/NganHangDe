import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ClassService, Class, CreateClassDTO, UpdateClassDTO, ClassAccessType } from '../../services/class.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-class-management',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './class-management.component.html',
  styleUrls: ['./class-management.component.css']
})
export class ClassManagementComponent implements OnInit {
  classes: Class[] = [];
  classForm: FormGroup;
  isEditing = false;
  currentClassId: string | null = null;
  showForm = false;
  searchText = '';
  isLoading = false;
  error: string | null = null;
  success: string | null = null;
  
  // Array of available grades (1-12)
  grades = Array.from({ length: 12 }, (_, i) => i + 1);
  
  // Access types for the form
  accessTypes = ClassAccessType;

  constructor(
    private fb: FormBuilder,
    private classService: ClassService,
    private router: Router
  ) {
    this.classForm = this.fb.group({
      name: ['', [Validators.required]],
      grade: ['', [Validators.required]],
      accessType: [ClassAccessType.Direct]
    });
  }

  ngOnInit(): void {
    this.loadClasses();
  }

  loadClasses(): void {
    this.isLoading = true;
    this.error = null;
    
    this.classService.getClasses().subscribe({
      next: (data) => {
        this.classes = data;
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error loading classes:', err);
        this.error = 'Không thể tải danh sách lớp học. Vui lòng thử lại sau.';
        this.isLoading = false;
      }
    });
  }

  get filteredClasses(): Class[] {
    if (!this.searchText || this.searchText.trim() === '') {
      return this.classes.slice();
    } else {
      return this.classes.filter(cls => 
        cls.name.toLowerCase().includes(this.searchText.toLowerCase()) ||
        (cls.grade !== undefined && cls.grade.toString().includes(this.searchText.toLowerCase()))
      );
    }
  }

  toggleForm(): void {
    this.showForm = !this.showForm;
    if (!this.showForm) {
      this.resetForm();
    }
  }

  resetForm(): void {
    this.isEditing = false;
    this.currentClassId = null;
    this.classForm.reset({
      name: '',
      grade: '',
      accessType: ClassAccessType.Direct
    });
  }

  editClass(cls: Class): void {
    this.isEditing = true;
    this.currentClassId = cls.id;
    this.classForm.setValue({
      name: cls.name,
      grade: cls.grade ?? '',
      accessType: cls.accessType ?? ClassAccessType.Direct
    });
    this.showForm = true;
  }

  deleteClass(id: string): void {
    if (confirm('Bạn có chắc chắn muốn xóa lớp học này?')) {
      this.isLoading = true;
      
      this.classService.deleteClass(id).subscribe({
        next: () => {
          this.classes = this.classes.filter(cls => cls.id !== id);
          this.isLoading = false;
          this.success = 'Đã xóa lớp học thành công';
        },
        error: (err) => {
          console.error('Error deleting class:', err);
          this.error = 'Không thể xóa lớp học. Vui lòng thử lại sau.';
          this.isLoading = false;
          this.loadClasses(); // Reload to ensure data consistency
        }
      });
    }
  }

  copyClassCode(classCode: string): void {
    navigator.clipboard.writeText(classCode)
      .then(() => {
        this.success = 'Đã sao chép mã lớp vào clipboard';
        setTimeout(() => this.success = null, 3000);
      })
      .catch(err => {
        console.error('Could not copy text: ', err);
        this.error = 'Không thể sao chép mã lớp. Vui lòng thử lại.';
      });
  }

  regenerateClassCode(id: string): void {
    if (confirm('Việc tạo mã lớp mới sẽ vô hiệu hóa mã lớp cũ. Bạn có chắc chắn muốn tiếp tục?')) {
      this.isLoading = true;
      this.classService.regenerateClassCode(id).subscribe({
        next: (response) => {
          // Update class code in the local array
          const classIndex = this.classes.findIndex(c => c.id === id);
          if (classIndex !== -1) {
            this.classes[classIndex].classCode = response.classCode;
          }
          this.success = response.message;
          this.isLoading = false;
        },
        error: (err) => {
          console.error('Error regenerating class code:', err);
          this.error = 'Không thể tạo mã lớp mới. Vui lòng thử lại sau.';
          this.isLoading = false;
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

  viewClassDetails(id: string): void {
    this.router.navigate(['/dashboard/classes', id]);
  }

  onSubmit(): void {
    if (this.classForm.valid) {
      const formValue = this.classForm.value;
      this.isLoading = true;
      
      if (this.isEditing && this.currentClassId) {
        // Update existing class
        const updateData: UpdateClassDTO = {
          name: formValue.name,
          grade: +formValue.grade,
          accessType: +formValue.accessType
        };
        
        this.classService.updateClass(this.currentClassId, updateData).subscribe({
          next: () => {
            this.loadClasses(); // Reload classes after update
            this.resetForm();
            this.showForm = false;
            this.isLoading = false;
            this.success = 'Cập nhật lớp học thành công';
          },
          error: (err) => {
            console.error('Error updating class:', err);
            this.error = 'Không thể cập nhật lớp học. Vui lòng thử lại sau.';
            this.isLoading = false;
          }
        });
      } else {
        // Add new class
        const newClass: CreateClassDTO = {
          name: formValue.name,
          grade: +formValue.grade,
          accessType: +formValue.accessType
        };
        
        this.classService.createClass(newClass).subscribe({
          next: (createdClass) => {
            this.classes.push(createdClass);
            this.resetForm();
            this.showForm = false;
            this.isLoading = false;
            this.success = 'Tạo lớp học mới thành công';
          },
          error: (err) => {
            console.error('Error creating class:', err);
            this.error = 'Không thể tạo lớp học mới. Vui lòng thử lại sau.';
            this.isLoading = false;
          }
        });
      }
    }
  }
}
