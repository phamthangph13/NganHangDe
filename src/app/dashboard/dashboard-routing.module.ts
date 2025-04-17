import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { DashboardLayoutComponent } from './dashboard-layout/dashboard-layout.component';
import { StudentDashboardComponent } from './student-dashboard/student-dashboard.component';
import { TeacherDashboardComponent } from './teacher-dashboard/teacher-dashboard.component';
import { ExamManagementComponent } from './exam-management/exam-management.component';
import { ClassManagementComponent } from './class-management/class-management.component';
import { QuestionSetsComponent } from './question-sets/question-sets.component';
import { SubjectManagementComponent } from './subject-management/subject-management.component';
import { StudentClassesComponent } from './student-classes/student-classes.component';
import { ClassDetailsComponent } from './class-details/class-details.component';
import { AuthGuard } from '../guards/auth.guard';

const routes: Routes = [
  {
    path: '',
    component: DashboardLayoutComponent,
    canActivate: [AuthGuard],
    children: [
      { path: '', redirectTo: 'student', pathMatch: 'full' },
      { 
        path: 'student', 
        component: StudentDashboardComponent,
        canActivate: [AuthGuard],
        data: { role: 'student' }
      },
      { 
        path: 'teacher', 
        component: TeacherDashboardComponent,
        canActivate: [AuthGuard],
        data: { role: 'teacher' }
      },
      {
        path: 'exams',
        component: ExamManagementComponent,
        canActivate: [AuthGuard],
        data: { role: 'teacher' }
      },
      {
        path: 'classes',
        component: ClassManagementComponent,
        canActivate: [AuthGuard],
        data: { role: 'teacher' }
      },
      {
        path: 'classes/:id',
        component: ClassDetailsComponent,
        canActivate: [AuthGuard],
        data: { role: 'teacher' }
      },
      {
        path: 'student-classes',
        component: StudentClassesComponent,
        canActivate: [AuthGuard],
        data: { role: 'student' }
      },
      {
        path: 'question-sets',
        component: QuestionSetsComponent,
        canActivate: [AuthGuard],
        data: { role: 'teacher' }
      },
      {
        path: 'subjects',
        component: SubjectManagementComponent,
        canActivate: [AuthGuard],
        data: { role: 'teacher' }
      },
      {
        path: 'Teacher',
        redirectTo: 'teacher',
        pathMatch: 'full'
      },
      {
        path: 'Student',
        redirectTo: 'student',
        pathMatch: 'full'
      }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class DashboardRoutingModule { }
