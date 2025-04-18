import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatButtonModule } from '@angular/material/button';

interface WeaknessCategory {
  name: string;
  percentCorrect: number;
  description: string;
  recommendations: string;
}

interface WrongAnswer {
  questionId: string;
  questionText: string;
  correctAnswerText: string;
  studentAnswerText: string;
}

interface EssayAnswer {
  questionId: string;
  questionText: string;
  studentAnswer: string;
}

interface ExamWeakness {
  examId: string;
  examTitle: string;
  completedDate: Date;
  score: number;
  totalQuestions: number;
  correctAnswers: number;
  wrongAnswers: WrongAnswer[];
  essayAnswers: EssayAnswer[];
  weaknessCategories: WeaknessCategory[];
}

interface StudentWeaknessAnalysis {
  studentId: string;
  studentName: string;
  exams: ExamWeakness[];
  topWeaknesses: WeaknessCategory[];
  overallAnalysis: string;
  improvementSuggestions: string;
}

@Component({
  selector: 'app-student-weaknesses',
  standalone: true,
  imports: [
    CommonModule,
    MatProgressSpinnerModule,
    MatCardModule,
    MatIconModule,
    MatExpansionModule,
    MatButtonModule
  ],
  templateUrl: './student-weaknesses.component.html',
  styleUrls: ['./student-weaknesses.component.css']
})
export class StudentWeaknessesComponent implements OnInit {
  analysis: StudentWeaknessAnalysis | null = null;
  loading = true;
  error = '';

  constructor(private http: HttpClient) { }

  ngOnInit(): void {
    this.loadWeaknessAnalysis();
  }

  loadWeaknessAnalysis(): void {
    this.loading = true;
    this.error = '';
    
    this.http.get<StudentWeaknessAnalysis>(`${environment.apiUrl}/StudentAnalysis/weaknesses`)
      .subscribe({
        next: (data) => {
          this.analysis = data;
          this.loading = false;
        },
        error: (err) => {
          console.error('Error loading weakness analysis', err);
          this.error = 'Đã xảy ra lỗi khi tải phân tích điểm yếu';
          this.loading = false;
          
          // Create mock data for testing/development
          this.createMockData();
        }
      });
  }
  
  calculateScorePercentage(exam: ExamWeakness): number {
    if (!exam || exam.totalQuestions === 0) return 0;
    return (exam.correctAnswers / exam.totalQuestions) * 100;
  }
  
  private createMockData(): void {
    this.analysis = {
      studentId: '1',
      studentName: 'Nguyễn Văn A',
      exams: [
        {
          examId: '1',
          examTitle: 'Kiểm tra Toán học cơ bản',
          completedDate: new Date(),
          score: 7.5,
          totalQuestions: 10,
          correctAnswers: 7,
          wrongAnswers: [
            {
              questionId: '1',
              questionText: 'Tính 2 + 2 = ?',
              correctAnswerText: '4',
              studentAnswerText: '5'
            },
            {
              questionId: '2',
              questionText: 'Phương trình x^2 = 4 có bao nhiêu nghiệm?',
              correctAnswerText: '2',
              studentAnswerText: '1'
            }
          ],
          essayAnswers: [],
          weaknessCategories: [
            {
              name: 'Phép tính cơ bản',
              percentCorrect: 75,
              description: 'Còn mắc lỗi với một số phép tính đơn giản',
              recommendations: 'Luyện tập thêm phép tính cơ bản mỗi ngày'
            }
          ]
        }
      ],
      topWeaknesses: [
        {
          name: 'Phép tính cơ bản',
          percentCorrect: 75,
          description: 'Còn mắc lỗi với một số phép tính đơn giản',
          recommendations: 'Luyện tập thêm phép tính cơ bản mỗi ngày'
        }
      ],
      overallAnalysis: 'Học sinh có nền tảng tốt về toán học, nhưng đôi khi mắc lỗi với một số phép tính cơ bản. Cần tập trung luyện tập thêm để củng cố kiến thức.',
      improvementSuggestions: 'Dành 15 phút mỗi ngày để luyện tập phép tính cơ bản và ôn lại các khái niệm cơ bản về số học.'
    };
  }
} 