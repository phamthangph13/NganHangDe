import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';
import { RouterModule } from '@angular/router';
import { AuthInterceptor } from '../interceptors/auth.interceptor';

import { DashboardRoutingModule } from './dashboard-routing.module';
import { DashboardLayoutComponent } from './dashboard-layout/dashboard-layout.component';
import { StudentDashboardComponent } from './student-dashboard/student-dashboard.component';
import { TeacherDashboardComponent } from './teacher-dashboard/teacher-dashboard.component';
import { StudentHistoryComponent } from './student-history/student-history.component';
import { StudentWeaknessesComponent } from './student-weaknesses/student-weaknesses.component';

@NgModule({
  declarations: [
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    HttpClientModule,
    RouterModule,
    DashboardRoutingModule,
    StudentHistoryComponent,
    StudentWeaknessesComponent
  ],
  providers: [
    { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true }
  ]
})
export class DashboardModule { }
