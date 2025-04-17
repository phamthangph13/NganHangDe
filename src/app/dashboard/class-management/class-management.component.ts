import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

interface ClassGroup {
  id: number;
  name: string;
  grade: string;
  createdAt: Date;
}

@Component({
  selector: 'app-class-management',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './class-management.component.html',
  styleUrls: ['./class-management.component.css']
})
export class ClassManagementComponent implements OnInit {
  classes: ClassGroup[] = [];
  classForm: FormGroup;
  isEditing = false;
  currentClassId: number | null = null;
  showForm = false;
  searchText = '';
  
  // For demo purposes - in a real app, this would come from an API
  demoClasses: ClassGroup[] = [
    { id: 1, name: '10A1', grade: '10', createdAt: new Date('2023-08-15') },
    { id: 2, name: '10A2', grade: '10', createdAt: new Date('2023-08-15') },
    { id: 3, name: '11B1', grade: '11', createdAt: new Date('2022-08-10') },
    { id: 4, name: '11B2', grade: '11', createdAt: new Date('2022-08-10') },
    { id: 5, name: '12C1', grade: '12', createdAt: new Date('2021-08-12') },
    { id: 6, name: '12C2', grade: '12', createdAt: new Date('2021-08-12') }
  ];

  constructor(private fb: FormBuilder) {
    this.classForm = this.fb.group({
      name: ['', [Validators.required]],
      grade: ['', [Validators.required]]
    });
  }

  ngOnInit(): void {
    // Load classes (for demo, we're using the dummy data)
    this.classes = [...this.demoClasses];
  }

  get filteredClasses(): ClassGroup[] {
    return this.classes.filter(cls => 
      cls.name.toLowerCase().includes(this.searchText.toLowerCase()) ||
      cls.grade.toLowerCase().includes(this.searchText.toLowerCase())
    );
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
      grade: ''
    });
  }

  editClass(cls: ClassGroup): void {
    this.isEditing = true;
    this.currentClassId = cls.id;
    this.classForm.setValue({
      name: cls.name,
      grade: cls.grade
    });
    this.showForm = true;
  }

  deleteClass(id: number): void {
    if (confirm('Bạn có chắc chắn muốn xóa lớp học này?')) {
      this.classes = this.classes.filter(cls => cls.id !== id);
    }
  }

  onSubmit(): void {
    if (this.classForm.valid) {
      const formValue = this.classForm.value;
      
      if (this.isEditing && this.currentClassId) {
        // Update existing class
        this.classes = this.classes.map(cls => 
          cls.id === this.currentClassId ? 
          { ...cls, ...formValue } : 
          cls
        );
      } else {
        // Add new class
        const newClass: ClassGroup = {
          id: Math.max(0, ...this.classes.map(c => c.id)) + 1,
          name: formValue.name,
          grade: formValue.grade,
          createdAt: new Date()
        };
        
        this.classes.push(newClass);
      }
      
      this.resetForm();
      this.showForm = false;
    }
  }
}
