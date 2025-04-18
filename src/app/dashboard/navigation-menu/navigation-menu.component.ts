import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatToolbarModule } from '@angular/material/toolbar';
import { AuthService, User } from '../../services/auth.service';

@Component({
  selector: 'app-navigation-menu',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatToolbarModule
  ],
  templateUrl: './navigation-menu.component.html',
  styleUrl: './navigation-menu.component.css'
})
export class NavigationMenuComponent implements OnInit {
  currentUser: User | null = null;
  isStudent = false;
  isTeacher = false;

  constructor(
    private authService: AuthService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.loadUserData();
  }

  private loadUserData(): void {
    this.currentUser = this.authService.getCurrentUser();
    this.isStudent = this.authService.hasRole('Student');
    this.isTeacher = this.authService.hasRole('Teacher');
    console.log('Navigation - Current user:', this.currentUser);
    console.log('Navigation - Is student:', this.isStudent);
    console.log('Navigation - Is teacher:', this.isTeacher);
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/auth/login']);
  }

  refreshAuth(): void {
    // Force token validation by checking authentication
    const isAuthenticated = this.authService.isAuthenticated();
    console.log('Manual auth check - Is authenticated:', isAuthenticated);
    
    if (!isAuthenticated) {
      this.authService.logout();
      this.router.navigate(['/auth/login']);
    } else {
      this.loadUserData();
    }
  }
}
