import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Class {
  id: string;
  name: string;
  grade: number;
  classCode: string;
  createdAt: Date;
  studentCount?: number;
}

export interface CreateClassDTO {
  name: string;
  grade: number;
}

export interface UpdateClassDTO {
  name: string;
  grade: number;
}

export interface ClassCodeResponse {
  classCode: string;
  message: string;
}

export interface Student {
  id: string;
  name: string;
  email: string;
}

@Injectable({
  providedIn: 'root'
})
export class ClassService {
  private apiUrl = `${environment.apiUrl}/classes`;

  constructor(private http: HttpClient) { }

  getClasses(): Observable<Class[]> {
    return this.http.get<Class[]>(this.apiUrl);
  }

  getClassesByGrade(grade: number): Observable<Class[]> {
    return this.http.get<Class[]>(`${this.apiUrl}/grade/${grade}`);
  }

  getClass(id: string): Observable<Class> {
    return this.http.get<Class>(`${this.apiUrl}/${id}`);
  }

  createClass(createClassDTO: CreateClassDTO): Observable<Class> {
    return this.http.post<Class>(this.apiUrl, createClassDTO);
  }

  updateClass(id: string, updateClassDTO: UpdateClassDTO): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/${id}`, updateClassDTO);
  }

  deleteClass(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  regenerateClassCode(id: string): Observable<ClassCodeResponse> {
    return this.http.post<ClassCodeResponse>(`${this.apiUrl}/${id}/regenerate-code`, {});
  }

  // Kiểm tra xem học sinh có thuộc lớp này không
  isStudentInClass(classId: string, studentId: string): Observable<boolean> {
    return this.http.get<boolean>(`${environment.apiUrl}/classes/${classId}/students/check/${studentId}`);
  }

  getClassStudents(classId: string): Observable<Student[]> {
    // Thử các endpoint khác nhau khi endpoint trước không hoạt động
    
    // Sử dụng endpoint dựa trên cấu trúc dữ liệu trong DB 
    // Thử endpoint /class-students với tham số classId
    return this.http.get<Student[]>(`${environment.apiUrl}/class-students?classId=${classId}`);
    
    // Các endpoints đã thử trước đó không hoạt động:
    // Option 1: dashboard/classes path
    // return this.http.get<Student[]>(`${environment.apiUrl}/dashboard/classes/${classId}/students`);
    
    // Option 2: classes với students trong path
    // return this.http.get<Student[]>(`${this.apiUrl}/${classId}/students`);
    
    // Option 3: Dashboard API 
    // return this.http.get<Student[]>(`${environment.apiUrl}/dashboard/students?classId=${classId}`);
    
    // Option 4: Endpoint students với parameter
    // return this.http.get<Student[]>(`${environment.apiUrl}/students?classId=${classId}`);
  }
} 