import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ClassManagementComponent } from './class-management.component';

describe('ClassManagementComponent', () => {
  let component: ClassManagementComponent;
  let fixture: ComponentFixture<ClassManagementComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ClassManagementComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ClassManagementComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
