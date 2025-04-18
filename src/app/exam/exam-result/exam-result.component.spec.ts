import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExamResultComponent } from './exam-result.component';

describe('ExamResultComponent', () => {
  let component: ExamResultComponent;
  let fixture: ComponentFixture<ExamResultComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExamResultComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ExamResultComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
