import { Component, EventEmitter, Input, OnInit, Output, OnDestroy } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-user-input-step',
  templateUrl: './user-input-step.component.html',
  styleUrls: ['./user-input-step.component.scss']
})
export class UserInputStepComponent implements OnInit, OnDestroy {
  @Input() stepForm!: FormGroup;
  @Input() stepIndex!: number;
  @Output() delete = new EventEmitter<void>();

  isCollapsed = false;

  private valueChangesSub!: Subscription;

  constructor(private fb: FormBuilder) { }

  ngOnInit(): void {
    // 1. Robustly ensure 'settings' FormGroup exists
    let settings = this.stepForm.get('settings') as FormGroup;
    if (!settings) {
      settings = this.fb.group({});
      this.stepForm.addControl('settings', settings);
    }

    // 2. Robustly ensure 'definitions' FormArray exists within settings
    if (!settings.contains('definitions')) {
      settings.addControl('definitions', this.fb.array([]));
    }

    // 3. Now it is safe to use the getter
    // Populate default if empty (e.g., new workflow)
    if (this.outputDefinitionsArray.length === 0) {
      this.addOutput('main_prompt', 'text');
      this.addOutput('model_image', 'image');
    }

    // 4. Sync and Subscribe
    this.syncOutputs();
    this.valueChangesSub = this.outputDefinitionsArray.valueChanges.subscribe(() => {
      this.syncOutputs();
    });
  }

  ngOnDestroy(): void {
    if (this.valueChangesSub) {
      this.valueChangesSub.unsubscribe();
    }
  }

  // Safer getter implementation
  get outputDefinitionsArray(): FormArray {
    // We know these exist because of ngOnInit, but standard 'as' casting can hide issues.
    return this.stepForm.get('settings')?.get('definitions') as FormArray;
  }

  private createOutputDefinition(name: string, type: string): FormGroup {
    return this.fb.group({
      name: [name, Validators.required],
      type: [type, Validators.required]
    });
  }

  addOutput(name = '', type = 'text'): void {
    this.outputDefinitionsArray.push(this.createOutputDefinition(name, type));
  }

  removeOutput(index: number): void {
    this.outputDefinitionsArray.removeAt(index);
  }

  private syncOutputs(): void {
    const outputs = this.stepForm.get('outputs') as FormGroup;

    // Edge case: If 'outputs' doesn't exist yet for some reason, create it.
    if (!outputs) {
       this.stepForm.addControl('outputs', this.fb.group({}));
       return this.syncOutputs(); // Try again
    }

    Object.keys(outputs.controls).forEach(key => outputs.removeControl(key));

    this.outputDefinitionsArray.controls.forEach(control => {
      const name = control.get('name')?.value;
      const type = control.get('type')?.value;
      // Only add if name is valid (not empty) to prevent errors
      if (name && type) {
        outputs.addControl(name, this.fb.control({ type: type }));
      }
    });
  }
}
