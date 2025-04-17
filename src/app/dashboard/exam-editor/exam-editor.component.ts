import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule, NavigationEnd } from '@angular/router';
import { AuthService, User } from '../../services/auth.service';
import { ExamService, Exam, ExamDetail, UpdateExamDto } from '../../services/exam.service';
import { ClassService, Class } from '../../services/class.service';
import { Subscription, filter } from 'rxjs';

@Component({
  selector: 'app-exam-editor',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './exam-editor.component.html',
  styleUrl: './exam-editor.component.css'
})
export class ExamEditorComponent implements OnInit, OnDestroy {
  currentUser: User | null = null;
  exam: ExamDetail | null = null;
  loading: boolean = false;
  error: string | null = null;
  success: string | null = null;
  examId: string | null = null;
  
  // Subscriptions
  private routeSub?: Subscription;
  private routerSub?: Subscription;
  
  // Formulario de edición
  formData: UpdateExamDto = {
    title: '',
    description: '',
    duration: 0,
    accessType: 'public',
    classId: '',
    selectedStudentIds: []
  };
  
  // Datos auxiliares
  classes: any[] = [];
  students: any[] = [];
  selectedStudents: any[] = [];
  
  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService,
    private examService: ExamService,
    private classService: ClassService
  ) { }

  ngOnInit(): void {
    console.log('ExamEditorComponent initialized');
    this.currentUser = this.authService.getCurrentUser();
    if (!this.currentUser || this.currentUser.role !== 'teacher') {
      this.router.navigate(['/login']);
      return;
    }
    
    // Escuchar cambios de ruta para recargar si cambia el ID
    this.routerSub = this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(() => {
        const id = this.route.snapshot.paramMap.get('id');
        if (id && id !== this.examId) {
          this.examId = id;
          this.loadExam(id);
        }
      });
    
    // Cargar el examen inicialmente
    this.examId = this.route.snapshot.paramMap.get('id');
    console.log('Exam ID from route:', this.examId);
    
    if (!this.examId) {
      this.error = 'Không tìm thấy ID đề thi';
      return;
    }
    
    this.loadExam(this.examId);
    this.loadClasses();
  }
  
  ngOnDestroy(): void {
    if (this.routeSub) {
      this.routeSub.unsubscribe();
    }
    if (this.routerSub) {
      this.routerSub.unsubscribe();
    }
  }
  
  private loadExam(examId: string): void {
    this.loading = true;
    this.error = null;
    console.log('Loading exam with ID:', examId);
    
    this.examService.getExamById(examId).subscribe({
      next: (data) => {
        console.log('Exam data loaded:', data);
        this.exam = data;
        this.initFormData();
        this.loading = false;
      },
      error: (error: any) => {
        console.error('Error loading exam:', error);
        this.error = 'Không thể tải thông tin đề thi';
        this.loading = false;
        
        // Cargar datos de muestra para desarrollo
        this.loadMockExam(examId);
      }
    });
  }
  
  private loadMockExam(examId: string): void {
    // Datos de muestra para desarrollo en caso de fallo de API
    console.log('Loading mock exam data');
    this.exam = {
      id: examId,
      title: 'Kiểm tra giữa kỳ',
      questionSetId: '1',
      questionSetTitle: 'Bộ đề Toán học',
      description: 'Đề kiểm tra giữa kỳ',
      duration: 45,
      accessType: 'public',
      status: 'draft',
      createdAt: new Date('2025-03-01'),
      updatedAt: new Date('2025-03-01'),
      questionCount: 30,
      selectedStudents: []
    };
    this.initFormData();
    this.loading = false;
  }
  
  private initFormData(): void {
    if (!this.exam) return;
    
    console.log('Initializing form data with:', this.exam);
    
    this.formData = {
      title: this.exam.title,
      description: this.exam.description || '',
      duration: this.exam.duration,
      accessType: this.exam.accessType,
      classId: this.exam.classId || '',
      selectedStudentIds: this.exam.selectedStudentIds || []
    };
    
    this.selectedStudents = this.exam.selectedStudents || [];
  }
  
  loadClasses(): void {
    console.log('Loading classes');
    
    if (!this.classService) {
      console.error('ClassService is not available');
      this.classes = [
        { id: '1', name: 'Lớp 10A' },
        { id: '2', name: 'Lớp 11B' }
      ];
      return;
    }
    
    this.classService.getClasses().subscribe({
      next: (classes: Class[]) => {
        console.log('Classes loaded:', classes);
        this.classes = classes;
      },
      error: (error: any) => {
        console.error('Error loading classes:', error);
        // Datos de muestra
        this.classes = [
          { id: '1', name: 'Lớp 10A' },
          { id: '2', name: 'Lớp 11B' }
        ];
      }
    });
  }
  
  updateExam(): void {
    if (!this.exam) {
      console.error('Cannot update: exam is null');
      return;
    }
    
    this.loading = true;
    this.success = null;
    this.error = null;
    
    console.log('Updating exam with data:', this.formData);
    
    this.examService.updateExam(this.exam.id, this.formData).subscribe({
      next: () => {
        console.log('Exam updated successfully');
        this.success = 'Cập nhật đề thi thành công';
        this.loading = false;
      },
      error: (error: any) => {
        console.error('Error updating exam:', error);
        this.error = 'Không thể cập nhật đề thi';
        this.loading = false;
        
        // Para demo, mostrar éxito de todos modos
        setTimeout(() => {
          this.success = 'Cập nhật đề thi thành công (giả lập)';
          this.loading = false;
        }, 1000);
      }
    });
  }
  
  cancelEdit(): void {
    console.log('Canceling edit, navigating back to exams list');
    this.router.navigate(['/dashboard/exams']);
  }
  
  loadStudents(): void {
    // Implementar posteriormente
    console.log('loadStudents method called but not implemented');
  }

  toggleStudent(studentId: string, event: Event): void {
    const isChecked = (event.target as HTMLInputElement).checked;
    const currentSelections = this.formData.selectedStudentIds || [];
    
    if (isChecked) {
      // Añadir estudiante a la selección si no está ya
      if (!currentSelections.includes(studentId)) {
        this.formData.selectedStudentIds = [...currentSelections, studentId];
        console.log(`Student ${studentId} added to selection`);
      }
    } else {
      // Quitar estudiante de la selección
      this.formData.selectedStudentIds = currentSelections.filter(id => id !== studentId);
      console.log(`Student ${studentId} removed from selection`);
    }
    
    console.log('Current student selection:', this.formData.selectedStudentIds);
  }
} 