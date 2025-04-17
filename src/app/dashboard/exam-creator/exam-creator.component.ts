import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService, User } from '../../services/auth.service';
import { ExamService, CreateExamDto } from '../../services/exam.service';
import { QuestionSetService } from '../../services/question-set.service';
import { ClassService, Class, Student } from '../../services/class.service';

interface QuestionSet {
  id: string;
  title: string;
  subjectId: string;
  questionCount: number;
}

@Component({
  selector: 'app-exam-creator',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './exam-creator.component.html',
  styleUrl: './exam-creator.component.css'
})
export class ExamCreatorComponent implements OnInit {
  currentUser: User | null = null;
  examForm: FormGroup;
  questionSets: QuestionSet[] = [];
  classes: Class[] = [];
  students: Student[] = [];
  loading: boolean = false;
  submitted: boolean = false;
  selectedQuestionSet: QuestionSet | null = null;
  studentLoadError: string | null = null;
  
  constructor(
    private authService: AuthService,
    private examService: ExamService,
    private questionSetService: QuestionSetService,
    private classService: ClassService,
    private formBuilder: FormBuilder,
    private router: Router
  ) {
    this.examForm = this.formBuilder.group({
      title: ['', [Validators.required]],
      questionSetId: ['', [Validators.required]],
      description: [''],
      duration: [45, [Validators.required, Validators.min(1), Validators.max(300)]],
      accessType: ['public', [Validators.required]],
      classId: ['', [Validators.required]],
      selectedStudentIds: [[]]
    });
  }

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    if (!this.currentUser || this.currentUser.role !== 'teacher') {
      this.router.navigate(['/login']);
      return;
    }
    this.loadQuestionSets();
    this.loadClasses();

    // Add validators based on accessType
    this.examForm.get('accessType')?.valueChanges.subscribe(accessType => {
      const classIdControl = this.examForm.get('classId');
      const selectedStudentIdsControl = this.examForm.get('selectedStudentIds');
      
      // Reset error when changing access type
      this.studentLoadError = null;
      
      if (accessType === 'public') {
        // For public mode, class is set automatically in the backend logic
        classIdControl?.clearValidators();
        selectedStudentIdsControl?.clearValidators();
        
        // Auto-select first class when available for backend requirement
        if (this.classes.length > 0) {
          classIdControl?.setValue(this.classes[0].id);
        }
      } else if (accessType === 'class') {
        classIdControl?.setValidators([Validators.required]);
        selectedStudentIdsControl?.clearValidators();
      } else if (accessType === 'selected') {
        classIdControl?.setValidators([Validators.required]);
        selectedStudentIdsControl?.setValidators([Validators.required]);
        
        // If class already selected, load its students automatically
        const currentClassId = classIdControl?.value;
        if (currentClassId) {
          this.loadStudentsForClass(currentClassId);
        } else {
          // Focus the class dropdown field if no class is selected
          setTimeout(() => {
            const classSelectElement = document.getElementById('classId');
            if (classSelectElement) {
              classSelectElement.focus();
              
              // Show a helpful message
              alert('Vui lòng chọn lớp để xem danh sách học sinh');
            }
          }, 100);
        }
      }
      
      classIdControl?.updateValueAndValidity();
      selectedStudentIdsControl?.updateValueAndValidity();

      // Clear selected students when changing access type or class
      if (accessType !== 'selected') {
        this.examForm.get('selectedStudentIds')?.setValue([]);
      }
    });
    
    // Load students when class changes
    this.examForm.get('classId')?.valueChanges.subscribe(classId => {
      // Always clear the student selection first
      this.examForm.get('selectedStudentIds')?.setValue([]);
      
      // No need to load students for 'public' access type
      if (this.examForm.get('accessType')?.value !== 'public' && classId) {
        console.log('Class changed, loading students for:', classId);
        this.loadStudentsForClass(classId);
      } else {
        this.students = [];
      }
    });

    // Update selected question set when changed
    this.examForm.get('questionSetId')?.valueChanges.subscribe(questionSetId => {
      this.selectedQuestionSet = this.questionSets.find(qs => qs.id === questionSetId) || null;
    });
  }

  loadQuestionSets(): void {
    this.loading = true;
    this.questionSetService.getQuestionSets().subscribe({
      next: (data) => {
        this.questionSets = data.map(qs => ({
          id: qs.id,
          title: qs.title,
          subjectId: qs.subjectId,
          questionCount: qs.questionCount || 0
        }));
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading question sets:', error);
        this.loading = false;
        this.questionSets = [];
      }
    });
  }

  loadClasses(): void {
    this.loading = true;
    this.classService.getClasses().subscribe({
      next: (data) => {
        this.classes = data;
        
        // Auto-select first class for public access type if it exists
        if (this.classes.length > 0 && this.examForm.get('accessType')?.value === 'public') {
          this.examForm.get('classId')?.setValue(this.classes[0].id);
        }
        
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading classes:', error);
        this.loading = false;
        this.classes = [];
      }
    });
  }

  loadStudentsForClass(classId: string): void {
    if (!classId) {
      this.students = [];
      this.studentLoadError = null;
      return;
    }
    
    // Xóa lỗi cũ khi thử tải lại
    this.studentLoadError = null;
    this.loading = true;
    console.log('Loading students for class:', classId);
    
    this.classService.getClassStudents(classId).subscribe({
      next: (data: Student[]) => {
        this.students = data;
        console.log(`Loaded ${this.students.length} students for class ${classId}`);
        
        // Clear selected students when loading new student list
        this.examForm.get('selectedStudentIds')?.setValue([]);
        
        this.loading = false;
      },
      error: (error: any) => {
        console.error('Error loading students for class:', error);
        this.students = [];
        this.loading = false;
        
        // Hiển thị thông báo lỗi user-friendly
        const errorMessage = this.getErrorMessage(error);
        
        // Chỉ hiển thị alert nếu đang ở chế độ "selected" để tránh phiền nhiễu
        if (this.examForm.get('accessType')?.value === 'selected') {
          // Thay vì alert, chúng ta có thể sử dụng biến để hiển thị lỗi trong template
          this.studentLoadError = errorMessage;
        }
      }
    });
  }
  
  // Hàm trích xuất thông báo lỗi từ response
  private getErrorMessage(error: any): string {
    // Đối với lỗi 404, đưa ra thông báo cụ thể hơn
    if (error.status === 404) {
      return 'Không thể tải danh sách học sinh. Lớp học không tồn tại hoặc không có học sinh nào.';
    }
    
    if (error.error?.message) {
      return error.error.message;
    } else if (error.message) {
      return error.message;
    } else if (typeof error.error === 'string') {
      return error.error;
    } else {
      return 'Không thể tải danh sách học sinh. Vui lòng thử lại sau.';
    }
  }

  onSubmit(): void {
    this.submitted = true;
    
    if (this.examForm.invalid) {
      console.log('Form is invalid:', this.examForm.errors);
      console.log('Title errors:', this.examForm.get('title')?.errors);
      console.log('QuestionSetId errors:', this.examForm.get('questionSetId')?.errors);
      console.log('Duration errors:', this.examForm.get('duration')?.errors);
      console.log('AccessType errors:', this.examForm.get('accessType')?.errors);
      if (this.examForm.get('accessType')?.value !== 'public') {
        console.log('ClassId errors:', this.examForm.get('classId')?.errors);
      }
      if (this.examForm.get('accessType')?.value === 'selected') {
        console.log('SelectedStudentIds errors:', this.examForm.get('selectedStudentIds')?.errors);
      }
      return;
    }
    
    const formValues = this.examForm.value;
    const examData: CreateExamDto = {
      title: formValues.title,
      questionSetId: formValues.questionSetId,
      description: formValues.description || '',
      duration: Number(formValues.duration),
      accessType: formValues.accessType,
      classId: formValues.classId || undefined,
      selectedStudentIds: formValues.accessType === 'selected' ? formValues.selectedStudentIds : undefined
    };
    
    // Xử lý trường hợp chọn "tất cả học sinh"
    // Nếu trong mảng selectedStudentIds có phần tử bắt đầu bằng 'all_students_', chuyển từ chế độ 'selected' sang 'class'
    if (examData.accessType === 'selected' && examData.selectedStudentIds) {
      const allStudentsPattern = 'all_students_';
      if (examData.selectedStudentIds.some(id => typeof id === 'string' && id.startsWith(allStudentsPattern))) {
        // Chuyển sang chế độ accessType = 'class'
        examData.accessType = 'class';
        // Xóa selectedStudentIds không cần thiết
        delete examData.selectedStudentIds;
      }
    }
    
    // Always ensure classId is included for API requirements,
    // especially for public exams which might have cleared validators
    if (!examData.classId && this.classes.length > 0) {
      examData.classId = this.classes[0].id;
    }
    
    // Remove undefined fields
    if (examData.classId === undefined) {
      delete examData.classId;
    }
    
    if (examData.selectedStudentIds === undefined) {
      delete examData.selectedStudentIds;
    }
    
    // Ensure the array is not empty
    if (examData.selectedStudentIds && examData.selectedStudentIds.length === 0) {
      delete examData.selectedStudentIds;
    }
    
    console.log('Sending exam data to API:', examData);
    
    this.loading = true;
    this.examService.createExam(examData).subscribe({
      next: (createdExam) => {
        console.log('Exam created successfully:', createdExam);
        this.loading = false;
        this.router.navigate(['/dashboard/exams']);
      },
      error: (error) => {
        console.error('Error creating exam:', error);
        
        // Extract and log server error details
        if (error.error) {
          console.error('Server error details:', error.error);
          if (error.error.message) {
            console.error('Server error message:', error.error.message);
          }
          if (error.error.errors) {
            console.error('Server validation errors:', error.error.errors);
          }
        }
        
        // Log request details that were sent
        console.log('Request URL:', `${this.examService.getApiUrl()}`);
        console.log('Request method:', 'POST');
        console.log('Request payload:', examData);
        
        this.loading = false;
      }
    });
  }

  get f() {
    return this.examForm.controls;
  }

  toggleSelectAllStudents(event: Event): void {
    const isChecked = (event.target as HTMLInputElement).checked;
    
    if (isChecked) {
      // Select all students
      const allStudentIds = this.students.map(student => student.id);
      this.examForm.get('selectedStudentIds')?.setValue(allStudentIds);
    } else {
      // Deselect all students
      this.examForm.get('selectedStudentIds')?.setValue([]);
    }
  }

  onStudentSelectionChange(event: Event, studentId: string): void {
    const isChecked = (event.target as HTMLInputElement).checked;
    const currentSelections = this.examForm.get('selectedStudentIds')?.value || [];
    
    if (isChecked) {
      // Add student to selection
      this.examForm.get('selectedStudentIds')?.setValue([...currentSelections, studentId]);
    } else {
      // Remove student from selection
      this.examForm.get('selectedStudentIds')?.setValue(currentSelections.filter((id: string) => id !== studentId));
    }
  }

  isStudentSelected(studentId: string): boolean {
    const selectedIds = this.examForm.get('selectedStudentIds')?.value || [];
    return selectedIds.includes(studentId);
  }

  isAllStudentsSelected(): boolean {
    const selectedIds = this.examForm.get('selectedStudentIds')?.value || [];
    return selectedIds.length === this.students.length && this.students.length > 0;
  }

  cancel(): void {
    this.router.navigate(['/dashboard/exams']);
  }

  // Phương thức để tiếp tục khi không thể tải danh sách học sinh
  continueWithAllStudents(): void {
    // Lấy lớp hiện tại
    const classId = this.examForm.get('classId')?.value;
    if (!classId) return;
    
    // Tìm thông tin lớp
    const selectedClass = this.classes.find(c => c.id === classId);
    if (!selectedClass) return;
    
    // Tạo một ID giả cho tất cả học sinh của lớp
    const allStudentsId = `all_students_${classId}`;
    
    // Đặt ID này làm giá trị cho trường selectedStudentIds
    this.examForm.get('selectedStudentIds')?.setValue([allStudentsId]);
    
    // Xóa thông báo lỗi
    this.studentLoadError = null;
    
    // Thông báo cho người dùng
    alert(`Bạn đã chọn tất cả học sinh của lớp ${selectedClass.name}.`);
  }
} 