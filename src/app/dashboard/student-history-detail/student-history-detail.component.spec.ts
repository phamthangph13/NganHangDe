import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StudentHistoryDetailComponent } from './student-history-detail.component';

describe('StudentHistoryDetailComponent', () => {
  let component: StudentHistoryDetailComponent;
  let fixture: ComponentFixture<StudentHistoryDetailComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StudentHistoryDetailComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(StudentHistoryDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
