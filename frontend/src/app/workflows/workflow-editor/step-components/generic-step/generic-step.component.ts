
import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { StepConfig } from './step.model';

@Component({
  selector: 'app-generic-step',
  templateUrl: './generic-step.component.html',
  styleUrls: ['./generic-step.component.scss'],
})
export class GenericStepComponent implements OnInit, OnChanges {
  @Input() stepForm!: FormGroup;
  @Input() stepIndex!: number;
  @Input() availableOutputs: any[] = [];
  @Input() mode: 'create' | 'edit' | 'run' = 'create';
  @Input() config!: StepConfig;
  @Output() delete = new EventEmitter<void>();

  isCollapsed = true;
  inputModes: { [key: string]: 'fixed' | 'linked' } = {};
  compatibleOutputs: { [key: string]: any[] } = {};

  constructor(private fb: FormBuilder) { }

  ngOnInit(): void {
    const inputs = this.stepForm.get('inputs') as FormGroup;
    this.config.inputs.forEach(input => {
      if (!inputs.contains(input.name)) {
        inputs.addControl(input.name, this.fb.control(''));
      }
      const value = inputs.get(input.name)?.value;
      if (typeof value === 'object' && value !== null) {
        this.inputModes[input.name] = 'linked';
      } else {
        this.inputModes[input.name] = 'fixed';
      }
    });

    const settings = this.stepForm.get('settings') as FormGroup;
    this.config.settings.forEach(setting => {
      if (!settings.contains(setting.name)) {
        settings.addControl(setting.name, this.fb.control(setting.defaultValue));
      }
    });

    const outputs = this.stepForm.get('outputs') as FormGroup;
    this.config.outputs.forEach(output => {
      if (!outputs.contains(output.name)) {
        outputs.addControl(output.name, this.fb.control({ type: output.type }));
      }
    });

    this.updateCompatibleOutputs();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['availableOutputs']) {
      console.log("ngOnChanges if (changes['availableOutputs'])")
      this.updateCompatibleOutputs();
    }
  }

  private updateCompatibleOutputs(): void {
    this.config.inputs.forEach(input => {
      this.compatibleOutputs[input.name] = this.availableOutputs.filter(
        output => (output.type === input.type) || (output.type === "text" && input.type === "textarea")
      );
    });
  }

  toggleInputMode(inputName: string, mode: 'fixed' | 'linked') {
    this.inputModes[inputName] = mode;
    this.stepForm
      .get('inputs')
      ?.get(inputName)
      ?.setValue(mode === 'fixed' ? '' : null);
  }

  compareFn(o1: any, o2: any): boolean {
    return o1 && o2 ? o1.step === o2.step && o1.output === o2.output : o1 === o2;
  }
}
