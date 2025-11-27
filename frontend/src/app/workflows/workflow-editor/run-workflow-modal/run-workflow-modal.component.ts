import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { UserInputStep } from '../../workflow.models';

@Component({
    selector: 'app-run-workflow-modal',
    templateUrl: './run-workflow-modal.component.html',
    styleUrls: ['./run-workflow-modal.component.scss']
})
export class RunWorkflowModalComponent implements OnInit {
    runForm!: FormGroup;
    userInputStep: UserInputStep;
    inputDefinitions: { name: string; type: string }[] = [];

    constructor(
        private fb: FormBuilder,
        private dialogRef: MatDialogRef<RunWorkflowModalComponent>,
        @Inject(MAT_DIALOG_DATA) public data: { userInputStep: UserInputStep }
    ) {
        this.userInputStep = data.userInputStep;
    }

    ngOnInit(): void {
        this.runForm = this.fb.group({});

        if (this.userInputStep && this.userInputStep.outputs) {
            Object.entries(this.userInputStep.outputs).forEach(([key, value]) => {
                this.inputDefinitions.push({ name: key, type: value.type });
                // For now, all inputs are required text/string inputs
                // We can enhance this later to support file uploads for images, etc.
                this.runForm.addControl(key, this.fb.control('', Validators.required));
            });
        }
    }

    onCancel(): void {
        this.dialogRef.close();
    }

    onRun(): void {
        if (this.runForm.valid) {
            this.dialogRef.close(this.runForm.value);
        }
    }
}
