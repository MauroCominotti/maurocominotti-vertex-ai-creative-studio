import {Component, EventEmitter, Input, OnInit, Output} from '@angular/core';
import {FormBuilder, FormGroup} from '@angular/forms';

@Component({
  selector: 'app-generate-image-step',
  templateUrl: './generate-image-step.component.html',
  styleUrls: ['./generate-image-step.component.scss'],
})
export class GenerateImageStepComponent implements OnInit {
  @Input() stepForm!: FormGroup;
  @Input() stepIndex!: number;
  @Input() availableOutputs: any[] = [];
  @Input() mode: 'create' | 'edit' | 'run' = 'create';
  @Output() delete = new EventEmitter<void>();

  isCollapsed = true;
  inputModes: {[key: string]: 'fixed' | 'linked'} = {prompt: 'fixed'};

  constructor(private fb: FormBuilder) {}

  ngOnInit(): void {
    const inputs = this.stepForm.get('inputs') as FormGroup;
    if (!inputs.contains('prompt'))
      inputs.addControl('prompt', this.fb.control(''));

    const settings = this.stepForm.get('settings') as FormGroup;
    if (!settings.contains('model'))
      settings.addControl('model', this.fb.control('imagen-3.0-generate-001'));
    if (!settings.contains('aspect_ratio'))
      settings.addControl('aspect_ratio', this.fb.control('1:1'));
    if (!settings.contains('brand_guidelines'))
      settings.addControl('brand_guidelines', this.fb.control(true));
    if (!settings.contains('save_output_to_gallery'))
      settings.addControl('save_output_to_gallery', this.fb.control(false));

    const outputs = this.stepForm.get('outputs') as FormGroup;
    if (!outputs.contains('generated_image'))
      outputs.addControl('generated_image', this.fb.control({type: 'image'}));
  }

  toggleInputMode(inputName: string, mode: 'fixed' | 'linked') {
    this.inputModes[inputName] = mode;
    this.stepForm
      .get('inputs')
      ?.get(inputName)
      ?.setValue(mode === 'fixed' ? '' : null);
  }
}
