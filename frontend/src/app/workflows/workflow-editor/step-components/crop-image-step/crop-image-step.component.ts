import {Component, EventEmitter, Input, OnInit, Output} from '@angular/core';
import {FormBuilder, FormGroup} from '@angular/forms';

@Component({
  selector: 'app-crop-image-step',
  templateUrl: './crop-image-step.component.html',
  styleUrls: ['./crop-image-step.component.scss'],
})
export class CropImageStepComponent implements OnInit {
  @Input() stepForm!: FormGroup;
  @Input() stepIndex!: number;
  @Input() availableOutputs: any[] = [];
  @Input() mode: 'create' | 'edit' | 'run' = 'create';
  @Output() delete = new EventEmitter<void>();

  isCollapsed = true;
  inputModes: {[key: string]: 'fixed' | 'linked'} = {input_image: 'fixed'};

  constructor(private fb: FormBuilder) {}

  ngOnInit(): void {
    const inputs = this.stepForm.get('inputs') as FormGroup;
    if (!inputs.contains('input_image'))
      inputs.addControl('input_image', this.fb.control(''));

    const settings = this.stepForm.get('settings') as FormGroup;
    if (!settings.contains('crop_aspect_ratio'))
      settings.addControl('crop_aspect_ratio', this.fb.control('1:1'));
    if (!settings.contains('fill_aspect_ratio'))
      settings.addControl('fill_aspect_ratio', this.fb.control(false));
    if (!settings.contains('background_color'))
      settings.addControl('background_color', this.fb.control('#FFFFFF'));

    const outputs = this.stepForm.get('outputs') as FormGroup;
    if (!outputs.contains('cropped_image'))
      outputs.addControl('cropped_image', this.fb.control({type: 'image'}));
  }

  toggleInputMode(inputName: string, mode: 'fixed' | 'linked') {
    this.inputModes[inputName] = mode;
    this.stepForm
      .get('inputs')
      ?.get(inputName)
      ?.setValue(mode === 'fixed' ? '' : null);
  }
}
