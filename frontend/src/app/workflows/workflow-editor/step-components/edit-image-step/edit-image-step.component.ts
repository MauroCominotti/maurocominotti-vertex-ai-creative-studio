import {Component, EventEmitter, Input, OnInit, Output} from '@angular/core';
import {FormBuilder, FormGroup} from '@angular/forms';

@Component({
  selector: 'app-edit-image-step',
  templateUrl: './edit-image-step.component.html',
  styleUrls: ['./edit-image-step.component.scss'],
})
export class EditImageStepComponent implements OnInit {
  @Input() stepForm!: FormGroup;
  @Input() stepIndex!: number;
  @Input() availableOutputs: any[] = [];
  @Input() mode: 'create' | 'edit' | 'run' = 'create';
  @Output() delete = new EventEmitter<void>();

  isCollapsed = true;
  inputModes: {[key: string]: 'fixed' | 'linked'} = {
    input_images: 'fixed',
    prompt: 'fixed',
  };

  constructor(private fb: FormBuilder) {}

  ngOnInit(): void {
    const inputs = this.stepForm.get('inputs') as FormGroup;
    if (!inputs.contains('input_images'))
      inputs.addControl('input_images', this.fb.control(''));
    if (!inputs.contains('prompt'))
      inputs.addControl('prompt', this.fb.control(''));

    const settings = this.stepForm.get('settings') as FormGroup;
    if (!settings.contains('model'))
      settings.addControl('model', this.fb.control('imagen-3.0-generate-001'));
    if (!settings.contains('brand_guidelines'))
      settings.addControl('brand_guidelines', this.fb.control(true));

    const outputs = this.stepForm.get('outputs') as FormGroup;
    if (!outputs.contains('edited_image'))
      outputs.addControl('edited_image', this.fb.control({type: 'image'}));
  }

  toggleInputMode(inputName: string, mode: 'fixed' | 'linked') {
    this.inputModes[inputName] = mode;
    this.stepForm
      .get('inputs')
      ?.get(inputName)
      ?.setValue(mode === 'fixed' ? '' : null);
  }
}
