import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { ExamAccessComponent } from './exam-access/exam-access.component';
import { ExamSessionComponent } from './exam-session/exam-session.component';
import { ExamResultComponent } from './exam-result/exam-result.component';
import { StudentGuard } from '../guards/student.guard';

const routes: Routes = [
  {
    path: ':id',
    component: ExamAccessComponent,
    canActivate: [StudentGuard]
  },
  {
    path: ':id/session',
    component: ExamSessionComponent,
    canActivate: [StudentGuard]
  },
  {
    path: 'result/:id',
    component: ExamResultComponent,
    canActivate: [StudentGuard]
  }
];

@NgModule({
  imports: [
    CommonModule,
    RouterModule.forChild(routes),
    FormsModule,
    ReactiveFormsModule,
    HttpClientModule,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSnackBarModule
  ]
})
export class ExamModule { } 