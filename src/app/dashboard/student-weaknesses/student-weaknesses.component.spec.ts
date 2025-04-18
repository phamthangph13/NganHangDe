import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { StudentWeaknessesComponent } from './student-weaknesses.component';

describe('StudentWeaknessesComponent', () => {
  let component: StudentWeaknessesComponent;
  let fixture: ComponentFixture<StudentWeaknessesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ StudentWeaknessesComponent ],
      imports: [ HttpClientTestingModule ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(StudentWeaknessesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
}); 