import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-student-weaknesses',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './student-weaknesses.component.html',
  styleUrls: ['./student-weaknesses.component.css']
})
export class StudentWeaknessesComponent implements OnInit {
  examHistory: any[] = [];
  loading = true;
  error = '';

  constructor(private http: HttpClient) { }

  ngOnInit(): void {
    this.loadExamHistory();
  }

  loadExamHistory(): void {
    this.loading = true;
    this.http.get<any[]>(`${environment.apiUrl}/api/exam-history/student`)
      .subscribe({
        next: (data) => {
          this.examHistory = data;
          this.loading = false;
        },
        error: (err) => {
          console.error('Error loading exam history', err);
          this.error = 'Đã xảy ra lỗi khi tải dữ liệu bài thi';
          this.loading = false;
        }
      });
  }
} 