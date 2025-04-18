import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ExamService, ExamSession, ExamQuestion, ExamAnswer } from '../../services/exam.service';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { MatRadioModule } from '@angular/material/radio';
import { FormsModule } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { interval, Subscription } from 'rxjs';

@Component({
  selector: 'app-exam-session',
  templateUrl: './exam-session.component.html',
  styleUrls: ['./exam-session.component.css'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatDividerModule,
    MatRadioModule,
    MatSnackBarModule,
    MatDialogModule
  ]
})
export class ExamSessionComponent implements OnInit, OnDestroy {
  examId: string = '';
  isLoading: boolean = true;
  examSession: ExamSession | null = null;
  currentQuestionIndex: number = 0;
  currentQuestion: ExamQuestion | null = null;
  studentAnswers: { [questionId: string]: ExamAnswer } = {};
  saveInProgress: boolean = false;
  submitInProgress: boolean = false;
  error: string | null = null;
  
  // Timer related
  timerSubscription?: Subscription;
  remainingTimeInSeconds: number = 0;
  formattedTime: string = '';
  
  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private examService: ExamService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog
  ) { }

  ngOnInit(): void {
    this.examId = this.route.snapshot.paramMap.get('id') || '';
    this.loadExamSession();
  }
  
  ngOnDestroy(): void {
    if (this.timerSubscription) {
      this.timerSubscription.unsubscribe();
    }
  }
  
  loadExamSession(): void {
    this.isLoading = true;
    this.error = null;
    
    this.examService.startExamSession(this.examId).subscribe({
      next: (session) => {
        this.examSession = session;
        this.setupAnswers();
        this.setCurrentQuestion(0);
        this.startTimer();
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error loading exam session:', err);
        this.error = err.error?.message || 'Có lỗi xảy ra khi tải bài kiểm tra. Vui lòng thử lại sau.';
        this.isLoading = false;
      }
    });
  }
  
  setupAnswers(): void {
    if (!this.examSession) return;
    
    // Initialize answers object with current answers from the server
    this.studentAnswers = {};
    this.examSession.studentAnswers.forEach(answer => {
      this.studentAnswers[answer.questionId] = { ...answer };
    });
    
    // Make sure we have an answer object for each question
    this.examSession.questions.forEach(question => {
      if (!this.studentAnswers[question.id]) {
        this.studentAnswers[question.id] = {
          questionId: question.id,
          selectedOptions: [],
          essayAnswer: ''
        };
      }
    });
  }
  
  setCurrentQuestion(index: number): void {
    if (!this.examSession || this.examSession.questions.length === 0) return;
    
    if (index >= 0 && index < this.examSession.questions.length) {
      this.currentQuestionIndex = index;
      this.currentQuestion = this.examSession.questions[index];
    }
  }
  
  startTimer(): void {
    if (!this.examSession) return;
    
    this.remainingTimeInSeconds = this.examSession.remainingTime * 60;
    this.updateFormattedTime();
    
    this.timerSubscription = interval(1000).subscribe(() => {
      this.remainingTimeInSeconds--;
      this.updateFormattedTime();
      
      // Auto-save every 2 minutes (120 seconds)
      if (this.remainingTimeInSeconds > 0 && this.remainingTimeInSeconds % 120 === 0) {
        this.saveAnswers();
      }
      
      // Auto-submit when time is up
      if (this.remainingTimeInSeconds <= 0) {
        this.submitExam();
      }
    });
  }
  
  updateFormattedTime(): void {
    const minutes = Math.floor(this.remainingTimeInSeconds / 60);
    const seconds = this.remainingTimeInSeconds % 60;
    this.formattedTime = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  
  onSelectOption(questionId: string, optionId: number): void {
    if (!this.studentAnswers[questionId]) {
      this.studentAnswers[questionId] = {
        questionId,
        selectedOptions: [],
        essayAnswer: ''
      };
    }
    
    const question = this.examSession?.questions.find(q => q.id === questionId);
    if (!question) return;
    
    // For single choice questions, replace the selection
    if (question.type === 'single') {
      this.studentAnswers[questionId].selectedOptions = [optionId];
    } 
    // For multiple choice questions, toggle the selection
    else if (question.type === 'multiple') {
      const index = this.studentAnswers[questionId].selectedOptions.indexOf(optionId);
      if (index > -1) {
        this.studentAnswers[questionId].selectedOptions.splice(index, 1);
      } else {
        this.studentAnswers[questionId].selectedOptions.push(optionId);
      }
    }
  }
  
  onEssayAnswerChange(questionId: string, answer: string): void {
    if (!this.studentAnswers[questionId]) {
      this.studentAnswers[questionId] = {
        questionId,
        selectedOptions: [],
        essayAnswer: answer
      };
    } else {
      this.studentAnswers[questionId].essayAnswer = answer;
    }
  }
  
  prevQuestion(): void {
    if (this.currentQuestionIndex > 0) {
      this.setCurrentQuestion(this.currentQuestionIndex - 1);
    }
  }
  
  nextQuestion(): void {
    if (this.examSession && this.currentQuestionIndex < this.examSession.questions.length - 1) {
      this.setCurrentQuestion(this.currentQuestionIndex + 1);
    }
  }
  
  navigateToQuestion(index: number): void {
    this.setCurrentQuestion(index);
  }
  
  saveAnswers(): void {
    if (!this.examSession || this.saveInProgress) return;
    
    this.saveInProgress = true;
    
    const answers: ExamAnswer[] = Object.values(this.studentAnswers);
    
    this.examService.saveExamAnswers(this.examId, {
      attemptId: this.examSession.attemptId,
      answers
    }).subscribe({
      next: () => {
        this.snackBar.open('Đã lưu câu trả lời thành công', 'Đóng', {
          duration: 3000
        });
        this.saveInProgress = false;
      },
      error: (err) => {
        console.error('Error saving answers:', err);
        this.snackBar.open('Lỗi khi lưu câu trả lời. Vui lòng thử lại.', 'Đóng', {
          duration: 3000
        });
        this.saveInProgress = false;
      }
    });
  }
  
  submitExam(): void {
    if (!this.examSession || this.submitInProgress) return;
    
    // First save the current answers
    const answers: ExamAnswer[] = Object.values(this.studentAnswers);
    
    this.submitInProgress = true;
    
    // First save
    this.examService.saveExamAnswers(this.examId, {
      attemptId: this.examSession.attemptId,
      answers
    }).subscribe({
      next: () => {
        // Then submit
        this.examService.submitExam(this.examId, this.examSession!.attemptId).subscribe({
          next: (result) => {
            this.submitInProgress = false;
            // Hiển thị thông báo thành công
            this.snackBar.open('Đã nộp bài thành công!', 'Đóng', {
              duration: 3000,
              verticalPosition: 'top'
            });
            // Chuyển hướng đến trang kết quả
            this.router.navigate(['/exam/result', result.id]);
          },
          error: (err) => {
            console.error('Error submitting exam:', err);
            this.snackBar.open('Lỗi khi nộp bài. Vui lòng thử lại.', 'Đóng', {
              duration: 3000
            });
            this.submitInProgress = false;
          }
        });
      },
      error: (err) => {
        console.error('Error saving answers before submit:', err);
        this.snackBar.open('Lỗi khi lưu câu trả lời trước khi nộp bài.', 'Đóng', {
          duration: 3000
        });
        this.submitInProgress = false;
      }
    });
  }
  
  isAnswered(questionId: string): boolean {
    const answer = this.studentAnswers[questionId];
    if (!answer) return false;
    
    const question = this.examSession?.questions.find(q => q.id === questionId);
    if (!question) return false;
    
    if (question.type === 'essay') {
      return !!answer.essayAnswer && answer.essayAnswer.trim().length > 0;
    } else {
      return answer.selectedOptions.length > 0;
    }
  }
  
  isOptionSelected(questionId: string, optionId: number): boolean {
    return this.studentAnswers[questionId]?.selectedOptions.includes(optionId) || false;
  }
  
  cancelExam(): void {
    if (confirm('Bạn có chắc chắn muốn hủy bài thi? Tất cả nội dung đã làm sẽ bị mất.')) {
      this.router.navigate(['/dashboard']);
    }
  }
  
  getNumberOfAnsweredQuestions(): number {
    return Object.values(this.studentAnswers).filter(answer => {
      if (answer.selectedOptions.length > 0) return true;
      if (answer.essayAnswer && answer.essayAnswer.trim().length > 0) return true;
      return false;
    }).length;
  }
} 