import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AddStepModalComponent } from './add-step-modal.component';

describe('AddStepModalComponent', () => {
  let component: AddStepModalComponent;
  let fixture: ComponentFixture<AddStepModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AddStepModalComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AddStepModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
