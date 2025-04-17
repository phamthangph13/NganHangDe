import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExamManagementComponent } from './exam-management.component';

describe('ExamManagementComponent', () => {
  let component: ExamManagementComponent;
  let fixture: ComponentFixture<ExamManagementComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExamManagementComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ExamManagementComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
