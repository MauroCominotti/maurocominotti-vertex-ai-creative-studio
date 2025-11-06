import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EditImageStepComponent } from './edit-image-step.component';

describe('EditImageStepComponent', () => {
  let component: EditImageStepComponent;
  let fixture: ComponentFixture<EditImageStepComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [EditImageStepComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EditImageStepComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
