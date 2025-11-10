import {Component, EventEmitter, Input, OnInit, Output} from '@angular/core';
import {FormBuilder, FormGroup} from '@angular/forms';

@Component({
  selector: 'app-generate-text-step',
  templateUrl: './generate-text-step.component.html',
  styleUrls: ['./generate-text-step.component.scss'],
})
export class GenerateTextStepComponent implements OnInit {
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
      settings.addControl('model', this.fb.control('gemini-2.5-pro'));
    if (!settings.contains('temperature'))
      settings.addControl('temperature', this.fb.control(0.7));

    const outputs = this.stepForm.get('outputs') as FormGroup;
    if (!outputs.contains('generated_text'))
      outputs.addControl('generated_text', this.fb.control({type: 'text'}));
  }

  toggleInputMode(inputName: string, mode: 'fixed' | 'linked') {
    this.inputModes[inputName] = mode;
    this.stepForm
      .get('inputs')
      ?.get(inputName)
      ?.setValue(mode === 'fixed' ? '' : null);
  }
}
