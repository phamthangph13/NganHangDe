import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Exam {
  id: string;
  title: string;
  questionSetId: string;
  questionSetTitle: string;
  description: string;
  duration: number;
  accessType: 'public' | 'class' | 'selected';
  classId?: string;
  className?: string;
  selectedStudentIds?: string[];
  status: 'draft' | 'published' | 'closed';
  publishDate?: Date;
  createdAt: Date;
  updatedAt: Date;
  questionCount: number;
  attemptCount?: number;
  averageScore?: number;
  requirePassword?: boolean;
  examLink?: string;
}

export interface ExamDetail extends Exam {
  selectedStudents: {
    id: string;
    name: string;
    email: string;
  }[];
}

export interface CreateExamDto {
  title: string;
  questionSetId: string;
  description?: string;
  duration: number;
  accessType: 'public' | 'class' | 'selected';
  classId?: string;
  selectedStudentIds?: string[];
  requirePassword?: boolean;
  password?: string;
}

export interface UpdateExamDto {
  title?: string;
  description?: string;
  duration?: number;
  accessType?: 'public' | 'class' | 'selected';
  classId?: string;
  selectedStudentIds?: string[];
  requirePassword?: boolean;
  password?: string;
}

export interface PublishExamDto {
  publishDate?: Date;
}

export interface ExamResult {
  id: string;
  studentId: string;
  studentName: string;
  examId: string;
  score: number;
  totalQuestions: number;
  correctAnswers: number;
  startTime: Date;
  endTime: Date | null;
  duration: number;
  completed: boolean;
}

export interface StudentResultDetail extends ExamResult {
  answers: {
    questionId: string;
    questionText: string;
    correctOptionId: string;
    selectedOptionId: string | null;
    isCorrect: boolean;
    options: {
      id: string;
      text: string;
    }[];
  }[];
}

export interface ValidationResultDto {
  canAccess: boolean;
  message: string;
  exam?: {
    id: string;
    title: string;
    duration: number;
    requirePassword: boolean;
  };
}

@Injectable({
  providedIn: 'root'
})
export class ExamService {
  private apiUrl = `${environment.apiUrl}/exams`;

  constructor(private http: HttpClient) { }

  getApiUrl(): string {
    return this.apiUrl;
  }

  getTeacherExams(): Observable<Exam[]> {
    return this.http.get<Exam[]>(this.apiUrl);
  }

  getExamById(id: string): Observable<ExamDetail> {
    return this.http.get<ExamDetail>(`${this.apiUrl}/${id}`);
  }

  createExam(exam: CreateExamDto): Observable<Exam> {
    return this.http.post<Exam>(this.apiUrl, exam);
  }

  updateExam(id: string, exam: UpdateExamDto): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/${id}`, exam);
  }

  deleteExam(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  publishExam(id: string, publishDto?: PublishExamDto): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/${id}/publish`, publishDto || {});
  }

  closeExam(id: string): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/${id}/close`, {});
  }

  getStudentAvailableExams(): Observable<Exam[]> {
    return this.http.get<Exam[]>(`${this.apiUrl}/available`);
  }
  
  getExamResults(examId: string): Observable<ExamResult[]> {
    return this.http.get<ExamResult[]>(`${this.apiUrl}/${examId}/results`);
  }
  
  getStudentResultDetail(resultId: string): Observable<StudentResultDetail> {
    return this.http.get<StudentResultDetail>(`${this.apiUrl}/results/${resultId}`);
  }
  
  validateExamAccess(examId: string): Observable<ValidationResultDto> {
    return this.http.get<ValidationResultDto>(`${this.apiUrl}/validate-access/${examId}`);
  }
  
  validateExamPassword(examId: string, password: string): Observable<boolean> {
    return this.http.post<boolean>(`${this.apiUrl}/${examId}/validate-password`, { password });
  }
} 