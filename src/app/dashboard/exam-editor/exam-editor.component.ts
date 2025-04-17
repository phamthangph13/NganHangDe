import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService, User } from '../../services/auth.service';
import { ExamService, Exam, ExamDetail, UpdateExamDto } from '../../services/exam.service';
import { QuestionSetService } from '../../services/question-set.service';
import { ClassService, Class } from '../../services/class.service';
import { UserService } from 'src/app/services/user.service';
import { ToastService } from 'src/app/services/toast.service';
import { finalize } from 'rxjs/operators';

interface QuestionSet {
  id: string;
  title: string;
  subjectId: string;
  questionCount: number;
}

interface Student {
  id: string;
  name: string;
  email: string;
}

@Component({
  selector: 'app-exam-editor',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './exam-editor.component.html',
  styleUrl: './exam-editor.component.css'
})
export class ExamEditorComponent implements OnInit {
  currentUser: User | null = null;
  examForm: FormGroup;
  examId: string | null = null;
  exam: ExamDetail | null = null;
  questionSets: QuestionSet[] = [];
  classes: Class[] = [];
  students: User[] = [];
  isLoading = false;
  isSaving = false;
  
  constructor(
    private authService: AuthService,
    private examService: ExamService,
    private questionSetService: QuestionSetService,
    private classService: ClassService,
    private formBuilder: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private userService: UserService,
    private toastService: ToastService
  ) {
    this.examForm = this.createForm();
  }

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    if (!this.currentUser || this.currentUser.role !== 'teacher') {
      this.router.navigate(['/login']);
      return;
    }

    this.examId = this.route.snapshot.paramMap.get('id');
    if (!this.examId) {
      this.router.navigate(['/dashboard/exams']);
      return;
    }

    this.isLoading = true;
    
    // Load exam details
    this.loadExam();
    this.loadClasses();
    this.loadStudents();

    // Listen for access type changes to update validation
    this.examForm.get('accessType')?.valueChanges.subscribe(accessType => {
      this.updateValidators(accessType);
    });
  }

  createForm(): FormGroup {
    return this.formBuilder.group({
      title: ['', [Validators.required, Validators.maxLength(100)]],
      description: ['', Validators.maxLength(500)],
      durationMinutes: [60, [Validators.required, Validators.min(5), Validators.max(300)]],
      accessType: ['public', Validators.required],
      classId: [''],
      selectedStudentIds: [[]],
    });
  }

  updateValidators(accessType: string): void {
    const classIdControl = this.examForm.get('classId');
    const selectedStudentIdsControl = this.examForm.get('selectedStudentIds');
    
    // Reset validators
    classIdControl?.clearValidators();
    selectedStudentIdsControl?.clearValidators();
    
    // Apply new validators based on access type
    if (accessType === 'class') {
      classIdControl?.setValidators([Validators.required]);
    } else if (accessType === 'selected') {
      selectedStudentIdsControl?.setValidators([Validators.required]);
    }
    
    // Update validation status
    classIdControl?.updateValueAndValidity();
    selectedStudentIdsControl?.updateValueAndValidity();
  }

  loadExam(): void {
    this.isLoading = true;
    this.examService.getExamById(this.examId).pipe(
      finalize(() => this.isLoading = false)
    ).subscribe({
      next: (data) => {
        this.exam = data;
        
        // Populate form with exam data
        this.examForm.patchValue({
          title: data.title,
          description: data.description,
          durationMinutes: data.durationMinutes,
          accessType: data.accessType,
          classId: data.classId,
          selectedStudentIds: data.selectedStudentIds || []
        });
        
        if (data.classId) {
          this.loadStudentsForClass(data.classId);
        }
      },
      error: (error) => {
        this.toastService.showError('Failed to load exam data');
        console.error('Error loading exam', error);
        this.router.navigate(['/dashboard/exams']);
      }
    });
  }

  loadClasses(): void {
    this.isLoading = true;
    this.classService.getClasses().subscribe({
      next: (data) => {
        this.classes = data;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading classes:', error);
        this.isLoading = false;
        // Mock data for development
        this.classes = [
          { id: '1', name: 'Lớp 10A', grade: 10, classCode: 'ABC123', createdAt: new Date(), studentCount: 30 },
          { id: '2', name: 'Lớp 11B', grade: 11, classCode: 'DEF456', createdAt: new Date(), studentCount: 28 }
        ];
      }
    });
  }

  loadStudents(): void {
    this.isLoading = true;
    this.userService.getStudents().subscribe(students => {
      this.students = students;
      this.isLoading = false;
    });
  }

  loadStudentsForClass(classId: string): void {
    this.isLoading = true;
    // In a real application, use a proper API endpoint to get students for a class
    setTimeout(() => {
      // Mock data for development
      this.students = [
        { id: '1', name: 'Nguyễn Văn A', email: 'nguyenvana@example.com' },
        { id: '2', name: 'Trần Thị B', email: 'tranthib@example.com' },
        { id: '3', name: 'Lê Văn C', email: 'levanc@example.com' },
        { id: '4', name: 'Phạm Thị D', email: 'phamthid@example.com' },
        { id: '5', name: 'Hoàng Văn E', email: 'hoangvane@example.com' }
      ];
      this.isLoading = false;
      
      // If editing an exam with selected students, restore the selection
      if (this.exam?.accessType === 'selected' && this.exam?.selectedStudentIds?.length) {
        this.examForm.get('selectedStudentIds')?.setValue(this.exam.selectedStudentIds);
      }
    }, 500);
  }

  onSubmit(): void {
    if (this.examForm.invalid) {
      // Mark all fields as touched to trigger validation messages
      Object.keys(this.examForm.controls).forEach(key => {
        this.examForm.get(key)?.markAsTouched();
      });
      return;
    }

    this.isSaving = true;
    const examData: UpdateExamDto = this.examForm.value;
    
    // Clean up data based on access type
    if (examData.accessType !== 'class') {
      examData.classId = undefined;
    }
    if (examData.accessType !== 'selected') {
      examData.selectedStudentIds = undefined;
    }

    const saveObservable = this.examId
      ? this.examService.updateExam(this.examId, examData)
      : this.examService.createExam(examData);

    saveObservable.pipe(
      finalize(() => this.isSaving = false)
    ).subscribe({
      next: () => {
        this.toastService.showSuccess(`Exam ${this.examId ? 'updated' : 'created'} successfully`);
        this.router.navigate(['/dashboard/exams']);
      },
      error: (error) => {
        this.toastService.showError(`Failed to ${this.examId ? 'update' : 'create'} exam`);
        console.error('Error saving exam', error);
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

  onCancel(): void {
    this.router.navigate(['/dashboard/exams']);
  }
} 