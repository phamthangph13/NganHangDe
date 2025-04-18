import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { DashboardLayoutComponent } from './dashboard-layout/dashboard-layout.component';
import { StudentDashboardComponent } from './student-dashboard/student-dashboard.component';
import { TeacherDashboardComponent } from './teacher-dashboard/teacher-dashboard.component';
import { ExamManagementComponent } from './exam-management/exam-management.component';
import { ExamCreatorComponent } from './exam-creator/exam-creator.component';
import { ExamEditorComponent } from './exam-editor/exam-editor.component';
import { ExamResultsComponent } from './exam-results/exam-results.component';
import { StudentResultComponent } from './student-result/student-result.component';
import { ClassManagementComponent } from './class-management/class-management.component';
import { QuestionSetsComponent } from './question-sets/question-sets.component';
import { SubjectManagementComponent } from './subject-management/subject-management.component';
import { StudentClassesComponent } from './student-classes/student-classes.component';
import { ClassDetailsComponent } from './class-details/class-details.component';
import { StudentExamsComponent } from './student-exams/student-exams.component';
import { StudentHistoryComponent } from './student-history/student-history.component';
import { StudentHistoryDetailComponent } from './student-history-detail/student-history-detail.component';
import { StudentWeaknessesComponent } from './student-weaknesses/student-weaknesses.component';
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
        path: 'student-exams',
        component: StudentExamsComponent,
        canActivate: [AuthGuard],
        data: { role: 'student' }
      },
      {
        path: 'student-history',
        component: StudentHistoryComponent,
        canActivate: [AuthGuard],
        data: { role: 'student' }
      },
      {
        path: 'student-weaknesses',
        component: StudentWeaknessesComponent,
        canActivate: [AuthGuard],
        data: { role: 'student' }
      },
      {
        path: 'student-history/:id',
        component: StudentHistoryDetailComponent,
        canActivate: [AuthGuard],
        data: { role: 'teacher' }
      },
      {
        path: 'exam-creator',
        component: ExamCreatorComponent,
        canActivate: [AuthGuard],
        data: { role: 'teacher' }
      },
      {
        path: 'exam-editor/:id',
        component: ExamEditorComponent,
        canActivate: [AuthGuard],
        data: { role: 'teacher' }
      },
      {
        path: 'exam-results/:id',
        component: ExamResultsComponent,
        canActivate: [AuthGuard],
        data: { role: 'teacher' }
      },
      {
        path: 'student-result/:id',
        component: StudentResultComponent,
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
