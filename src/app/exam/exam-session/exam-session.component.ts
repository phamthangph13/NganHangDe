import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ExamService } from '../../services/exam.service';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { MatRadioModule } from '@angular/material/radio';
import { FormsModule } from '@angular/forms';

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
    MatRadioModule
  ]
})
export class ExamSessionComponent implements OnInit {
  examId: string = '';
  isLoading: boolean = true;
  selectedAnswer: string = '';
  
  constructor(
    private route: ActivatedRoute,
    private examService: ExamService
  ) { }

  ngOnInit(): void {
    this.examId = this.route.snapshot.paramMap.get('id') || '';
    
    // Mô phỏng tải dữ liệu bài thi
    setTimeout(() => {
      this.isLoading = false;
    }, 1000);
  }
} 