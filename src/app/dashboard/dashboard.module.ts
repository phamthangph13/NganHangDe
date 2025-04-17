import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { DashboardRoutingModule } from './dashboard-routing.module';
import { DashboardLayoutComponent } from './dashboard-layout/dashboard-layout.component';
import { StudentDashboardComponent } from './student-dashboard/student-dashboard.component';
import { TeacherDashboardComponent } from './teacher-dashboard/teacher-dashboard.component';
import { ExamManagementComponent } from './exam-management/exam-management.component';
import { ExamCreatorComponent } from './exam-creator/exam-creator.component';
import { ClassManagementComponent } from './class-management/class-management.component';
import { QuestionSetsComponent } from './question-sets/question-sets.component';
import { SubjectManagementComponent } from './subject-management/subject-management.component';
import { StudentClassesComponent } from './student-classes/student-classes.component';
import { ClassDetailsComponent } from './class-details/class-details.component';
import { RouterModule } from '@angular/router';
import { HTTP_INTERCEPTORS } from '@angular/common/http';
import { AuthInterceptor } from '../interceptors/auth.interceptor';

@NgModule({
  declarations: [],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    DashboardRoutingModule,
    RouterModule,
    // Import standalone components
    DashboardLayoutComponent,
    StudentDashboardComponent,
    TeacherDashboardComponent,
    ExamManagementComponent,
    ExamCreatorComponent,
    ClassManagementComponent,
    QuestionSetsComponent,
    SubjectManagementComponent,
    StudentClassesComponent,
    ClassDetailsComponent
  ],
  providers: [
    { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true }
  ]
})
export class DashboardModule { }
