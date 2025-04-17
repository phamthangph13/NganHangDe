import { ComponentFixture, TestBed } from '@angular/core/testing';

import { QuestionSetsComponent } from './question-sets.component';

describe('QuestionSetsComponent', () => {
  let component: QuestionSetsComponent;
  let fixture: ComponentFixture<QuestionSetsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [QuestionSetsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(QuestionSetsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
