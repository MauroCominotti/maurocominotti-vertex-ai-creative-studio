import {Component, EventEmitter, Input, OnInit, Output} from '@angular/core';
import {FormBuilder, FormGroup, FormGroupDirective} from '@angular/forms';

@Component({
  selector: 'app-virtual-try-on-step',
  templateUrl: './virtual-try-on-step.component.html',
  styleUrls: ['./virtual-try-on-step.component.scss'],
})
export class VirtualTryOnStepComponent implements OnInit {
  @Input() stepForm!: FormGroup; // PASSED FROM PARENT
  @Input() stepIndex!: number;
  @Input() availableOutputs: any[] = [];
  @Output() delete = new EventEmitter<void>();

  // Local UI state to track if an input is in 'fixed' or 'linked' mode
  inputModes: {[key: string]: 'fixed' | 'linked'} = {
    model_image: 'fixed',
    garment_image: 'fixed',
  };

  constructor(private fb: FormBuilder) {}

  ngOnInit(): void {
    const inputs = this.stepForm.get('inputs') as FormGroup;

    // FIX: Use 'this.fb.control' directly, NOT 'this.rootFormGroup.form.fb.control'
    if (!inputs.contains('model_image'))
      inputs.addControl('model_image', this.fb.control(''));
    if (!inputs.contains('garment_image'))
      inputs.addControl('garment_image', this.fb.control(''));

    const settings = this.stepForm.get('settings') as FormGroup;
    if (!settings.contains('seed'))
      settings.addControl('seed', this.fb.control(1234));
    if (!settings.contains('aspect_ratio'))
      settings.addControl('aspect_ratio', this.fb.control('1:1'));

    const outputs = this.stepForm.get('outputs') as FormGroup;
    if (!outputs.contains('generated_image')) {
      outputs.addControl('generated_image', this.fb.control({type: 'image'}));
    }
  }

  // Helper to toggle input mode and reset value to avoid type mismatches
  toggleInputMode(inputName: string, mode: 'fixed' | 'linked') {
    this.inputModes[inputName] = mode;
    const control = this.stepForm.get('inputs')?.get(inputName);
    control?.setValue(mode === 'fixed' ? '' : null); // Reset value on mode switch
  }

  // Helper for the template to know if current value is an object (linked) or string (fixed)
  isLinked(inputName: string): boolean {
    const val = this.stepForm.get('inputs')?.get(inputName)?.value;
    return val && typeof val === 'object' && 'step' in val;
  }
}
