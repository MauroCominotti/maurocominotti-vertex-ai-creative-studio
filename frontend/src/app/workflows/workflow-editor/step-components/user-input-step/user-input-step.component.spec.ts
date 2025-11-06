import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UserInputStepComponent } from './user-input-step.component';

describe('UserInputStepComponent', () => {
  let component: UserInputStepComponent;
  let fixture: ComponentFixture<UserInputStepComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [UserInputStepComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(UserInputStepComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
