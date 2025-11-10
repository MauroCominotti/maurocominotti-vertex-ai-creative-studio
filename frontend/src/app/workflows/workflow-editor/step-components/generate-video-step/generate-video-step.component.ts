import {Component, EventEmitter, Input, OnInit, Output} from '@angular/core';
import {FormBuilder, FormGroup} from '@angular/forms';

@Component({
  selector: 'app-generate-video-step',
  templateUrl: './generate-video-step.component.html',
  styleUrls: ['./generate-video-step.component.scss'],
})
export class GenerateVideoStepComponent implements OnInit {
  @Input() stepForm!: FormGroup;
  @Input() stepIndex!: number;
  @Input() availableOutputs: any[] = [];
  @Input() mode: 'create' | 'edit' | 'run' = 'create';
  @Output() delete = new EventEmitter<void>();

  isCollapsed = true;
  inputModes: {[key: string]: 'fixed' | 'linked'} = {
    prompt: 'fixed',
    input_image: 'fixed',
  };

  constructor(private fb: FormBuilder) {}

  ngOnInit(): void {
    const inputs = this.stepForm.get('inputs') as FormGroup;
    if (!inputs.contains('prompt'))
      inputs.addControl('prompt', this.fb.control(''));
    if (!inputs.contains('input_image'))
      inputs.addControl('input_image', this.fb.control(''));

    const settings = this.stepForm.get('settings') as FormGroup;
    if (!settings.contains('model'))
      settings.addControl('model', this.fb.control('veo-3.0-generate-001'));
    if (!settings.contains('aspect_ratio'))
      settings.addControl('aspect_ratio', this.fb.control('16:9'));

    const outputs = this.stepForm.get('outputs') as FormGroup;
    if (!outputs.contains('generated_video'))
      outputs.addControl('generated_video', this.fb.control({type: 'video'}));
  }

  toggleInputMode(inputName: string, mode: 'fixed' | 'linked') {
    this.inputModes[inputName] = mode;
    this.stepForm
      .get('inputs')
      ?.get(inputName)
      ?.setValue(mode === 'fixed' ? '' : null);
  }
}
