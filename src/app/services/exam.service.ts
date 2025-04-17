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
}

export interface UpdateExamDto {
  title?: string;
  description?: string;
  duration?: number;
  accessType?: 'public' | 'class' | 'selected';
  classId?: string;
  selectedStudentIds?: string[];
}

export interface PublishExamDto {
  publishDate?: Date;
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
} 