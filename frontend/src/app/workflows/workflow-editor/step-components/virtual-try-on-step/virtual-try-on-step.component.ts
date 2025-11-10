import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';

@Component({
  selector: 'app-virtual-try-on-step',
  templateUrl: './virtual-try-on-step.component.html',
  styleUrls: ['./virtual-try-on-step.component.scss'],
})
export class VirtualTryOnStepComponent implements OnInit {
  @Input() stepForm!: FormGroup;
  @Input() stepIndex!: number;
  @Input() availableOutputs: any[] = [];
  @Input() mode: 'create' | 'edit' | 'run' = 'create';
  @Output() delete = new EventEmitter<void>();

  isCollapsed = true;

  inputModes: { [key: string]: 'fixed' | 'linked' } = {
    model_image: 'fixed',
    top_image: 'fixed',
    bottom_image: 'fixed',
    dress_image: 'fixed',
    shoes_image: 'fixed',
  };

  constructor(private fb: FormBuilder) {}

  ngOnInit(): void {
    const inputs = this.stepForm.get('inputs') as FormGroup;
    ['model_image', 'top_image', 'bottom_image', 'dress_image', 'shoes_image'].forEach(controlName => {
      if (!inputs.contains(controlName)) inputs.addControl(controlName, this.fb.control(''));
    });

    const settings = this.stepForm.get('settings') as FormGroup;
    if (!settings.contains('save_output_to_gallery')) settings.addControl('save_output_to_gallery', this.fb.control(false));

    const outputs = this.stepForm.get('outputs') as FormGroup;
    if (!outputs.contains('generated_image')) {
      outputs.addControl('generated_image', this.fb.control({ type: 'image' }));
    }
  }

  toggleInputMode(inputName: string, mode: 'fixed' | 'linked') {
    this.inputModes[inputName] = mode;
    const control = this.stepForm.get('inputs')?.get(inputName);
    control?.setValue(mode === 'fixed' ? '' : null);
  }
}
