import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService, User } from '../../services/auth.service';

interface Exam {
  id: number;
  title: string;
  subject: string;
  questions: number;
  duration: number;
  publishDate: string;
  status: 'draft' | 'published' | 'closed';
  attempts?: number;
  avgScore?: number;
}

interface Student {
  id: number;
  name: string;
  email: string;
  grade: string;
  examsCompleted: number;
  avgScore: number;
}

@Component({
  selector: 'app-teacher-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './teacher-dashboard.component.html',
  styleUrl: './teacher-dashboard.component.css'
})
export class TeacherDashboardComponent implements OnInit {
  currentUser: User | null = null;
  recentExams: Exam[] = [];
  topStudents: Student[] = [];
  totalExams = 0;
  totalStudents = 0;
  avgScore = 0;
  
  constructor(private authService: AuthService) { }

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    this.loadMockData();
  }

  private loadMockData(): void {
    // Mock recent exams
    this.recentExams = [
      { 
        id: 1, 
        title: 'Kiểm tra giữa kỳ', 
        subject: 'Toán học',
        questions: 30,
        duration: 45,
        publishDate: '2025-04-15',
        status: 'published',
        attempts: 25,
        avgScore: 7.5
      },
      { 
        id: 2, 
        title: 'Bài kiểm tra 15 phút', 
        subject: 'Vật lý',
        questions: 10,
        duration: 15,
        publishDate: '2025-04-10',
        status: 'closed',
        attempts: 28,
        avgScore: 8.2
      },
      { 
        id: 3, 
        title: 'Bài tập về nhà', 
        subject: 'Hóa học',
        questions: 20,
        duration: 30,
        publishDate: '2025-04-18',
        status: 'draft'
      }
    ];
    
    // Mock top students
    this.topStudents = [
      { 
        id: 1, 
        name: 'Nguyễn Văn A', 
        email: 'nguyenvana@example.com',
        grade: '12A1',
        examsCompleted: 10,
        avgScore: 9.2
      },
      { 
        id: 2, 
        name: 'Trần Thị B', 
        email: 'tranthib@example.com',
        grade: '12A2',
        examsCompleted: 9,
        avgScore: 8.7
      },
      { 
        id: 3, 
        name: 'Lê Văn C', 
        email: 'levanc@example.com',
        grade: '12A1',
        examsCompleted: 8,
        avgScore: 8.5
      },
      { 
        id: 4, 
        name: 'Phạm Thị D', 
        email: 'phamthid@example.com',
        grade: '12A3',
        examsCompleted: 7,
        avgScore: 8.3
      }
    ];
    
    // Calculate totals
    this.totalExams = this.recentExams.length;
    this.totalStudents = this.topStudents.length;
    
    // Calculate average score
    const examScores = this.recentExams
      .filter(exam => exam.avgScore !== undefined)
      .map(exam => exam.avgScore as number);
      
    if (examScores.length > 0) {
      this.avgScore = examScores.reduce((sum, score) => sum + score, 0) / examScores.length;
    }
  }
}
