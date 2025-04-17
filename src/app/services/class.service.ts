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
} 