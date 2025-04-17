import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService, User } from '../../services/auth.service';

interface Exam {
  id: number;
  title: string;
  subject: string;
  questions: number;
  duration: number;
  dueDate?: string;
  status?: 'coming' | 'completed' | 'available';
  score?: number;
}

interface SubjectStat {
  subject: string;
  avgScore: number;
  completedExams: number;
}

@Component({
  selector: 'app-student-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './student-dashboard.component.html',
  styleUrl: './student-dashboard.component.css'
})
export class StudentDashboardComponent implements OnInit {
  currentUser: User | null = null;
  upcomingExams: Exam[] = [];
  recentExams: Exam[] = [];
  subjectStats: SubjectStat[] = [];
  calculateAvgScore: number = 0;
  
  constructor(private authService: AuthService) { }

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    this.loadMockData();
    this.calculateAverage();
  }

  private calculateAverage(): void {
    if (this.recentExams.length === 0) {
      this.calculateAvgScore = 0;
      return;
    }
    
    const sum = this.recentExams.reduce((total, exam) => {
      return total + (exam.score || 0);
    }, 0);
    
    this.calculateAvgScore = sum / this.recentExams.length;
  }

  private loadMockData(): void {
    // Mock upcoming exams
    this.upcomingExams = [
      { 
        id: 1, 
        title: 'Kiểm tra giữa kỳ', 
        subject: 'Toán học',
        questions: 30,
        duration: 45,
        dueDate: '2025-04-20',
        status: 'coming'
      },
      { 
        id: 2, 
        title: 'Bài kiểm tra 15 phút', 
        subject: 'Vật lý',
        questions: 10,
        duration: 15,
        dueDate: '2025-04-18',
        status: 'coming'
      },
      { 
        id: 3, 
        title: 'Bài tập về nhà', 
        subject: 'Hóa học',
        questions: 20,
        duration: 30,
        dueDate: '2025-04-17',
        status: 'available'
      }
    ];
    
    // Mock recent exams
    this.recentExams = [
      { 
        id: 4, 
        title: 'Bài kiểm tra cuối kỳ', 
        subject: 'Ngữ văn',
        questions: 5,
        duration: 60,
        status: 'completed',
        score: 8.5
      },
      { 
        id: 5, 
        title: 'Kiểm tra 1 tiết', 
        subject: 'Tiếng Anh',
        questions: 40,
        duration: 45,
        status: 'completed',
        score: 7.0
      },
      { 
        id: 6, 
        title: 'Bài kiểm tra 15 phút', 
        subject: 'Sinh học',
        questions: 10,
        duration: 15,
        status: 'completed',
        score: 9.0
      }
    ];
    
    // Mock subject statistics
    this.subjectStats = [
      { subject: 'Toán học', avgScore: 7.5, completedExams: 5 },
      { subject: 'Ngữ văn', avgScore: 8.2, completedExams: 4 },
      { subject: 'Tiếng Anh', avgScore: 7.0, completedExams: 6 },
      { subject: 'Vật lý', avgScore: 6.5, completedExams: 3 }
    ];
  }
}
