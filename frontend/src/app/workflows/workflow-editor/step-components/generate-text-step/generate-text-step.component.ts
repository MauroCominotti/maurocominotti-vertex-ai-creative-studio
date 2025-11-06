import { Component, EventEmitter, Input, Output } from '@angular/core';
import {FormGroup} from '@angular/forms';

@Component({
  selector: 'app-generate-text-step',
  templateUrl: './generate-text-step.component.html',
  styleUrl: './generate-text-step.component.scss'
})
export class GenerateTextStepComponent {
  @Input() stepForm!: FormGroup;
  @Input() stepIndex!: number;
  @Output() delete = new EventEmitter<void>();
  @Input() availableOutputs: any[] = [];
}
