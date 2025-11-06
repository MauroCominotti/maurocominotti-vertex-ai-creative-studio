import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AbstractControl, FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { WorkflowService } from '../workflow.service';
import { WorkflowModel } from '../workflow.models';
import { AddStepModalComponent } from './add-step-modal/add-step-modal.component';
// NEW IMPORT:
import { WorkspaceStateService } from '../../services/workspace/workspace-state.service';
import { Subscription, combineLatest, of } from 'rxjs';
import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { filter, switchMap, tap } from 'rxjs/operators';

@Component({
  selector: 'app-workflow-editor',
  templateUrl: './workflow-editor.component.html',
  styleUrls: ['./workflow-editor.component.scss']
})
export class WorkflowEditorComponent implements OnInit, OnDestroy {
  workflowForm!: FormGroup;
  isLoading = false;
  isEditMode = false;
  errorMessage: string | null = null;

  private mainSubscription!: Subscription;
  private currentWorkspaceId: string | null = null;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private workflowService: WorkflowService,
    private dialog: MatDialog,
    private workspaceStateService: WorkspaceStateService
  ) {
    this.initForm();
  }

  asFormGroup(control: AbstractControl): FormGroup {
    return control as FormGroup;
  }

  ngOnInit(): void {
    this.mainSubscription = combineLatest([
      // Use the service directly to fix the "Property does not exist" error
      this.workspaceStateService.activeWorkspaceId$,
      this.route.paramMap
    ]).pipe(
      // Fix for "params is never read": don't destructure it if you don't need it here
      filter(([workspaceId]) => !!workspaceId),
      tap(() => this.isLoading = true),
      switchMap(([workspaceId, params]) => {
        this.currentWorkspaceId = workspaceId;
        const workflowId = params.get('workflowId');

        if (workflowId) {
          this.isEditMode = true;
          this.workflowService.setCurrentWorkflowId(workflowId);
          return this.workflowService.getWorkflowById(workflowId);
        } else {
          this.isEditMode = false;
          this.workflowService.setCurrentWorkflowId(null);
          return of(null);
        }
      })
    ).subscribe({
      next: (workflowData) => {
        if (workflowData) {
          this.populateForm(workflowData);
        } else {
          this.resetFormForNew();
        }
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Failed to load workflow', err);
        this.errorMessage = 'Failed to load workflow.';
        this.isLoading = false;
      }
    });
  }

  // ... (rest of the component: ngOnDestroy, initForm, addStepToForm, etc. remains the same)
  ngOnDestroy(): void {
    this.workflowService.setCurrentWorkflowId(null);
    if (this.mainSubscription) {
      this.mainSubscription.unsubscribe();
    }
  }

  initForm() {
    this.workflowForm = this.fb.group({
      workspace_id: ['', Validators.required],
      user_id: ['user123'],
      workflow_id: [''],
      workflow: this.fb.group({
        steps: this.fb.array([])
      })
    });
  }

  get stepsArray(): FormArray {
    return this.workflowForm.get('workflow.steps') as FormArray;
  }

  openAddStepModal() {
    const dialogRef = this.dialog.open(AddStepModalComponent, {
      width: '600px',
      panelClass: 'node-palette-dialog'
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) this.addStepToForm(result);
    });
  }

  addStepToForm(type: string, existingData?: any) {
    const stepData = existingData || {
      step_id: `${type}_${Date.now()}`,
      type: type,
      inputs: {},
      outputs: {},
      settings: {}
    };

    const stepGroup = this.fb.group({
      step_id: [stepData.step_id],
      type: [stepData.type],
      inputs: this.fb.group(stepData.inputs || {}),
      outputs: this.fb.group(stepData.outputs || {}),
      settings: this.fb.group(stepData.settings || {})
    });

    this.stepsArray.push(stepGroup);
  }

  deleteStep(index: number) {
    this.stepsArray.removeAt(index);
  }

  dropStep(event: CdkDragDrop<string[]>) {
    moveItemInArray(this.stepsArray.controls, event.previousIndex, event.currentIndex);
  }

  save() {
    if (this.workflowForm.invalid) return;

    this.isLoading = true;
    this.errorMessage = null;

    const formValue: WorkflowModel = this.workflowForm.value;

    if (this.currentWorkspaceId) {
        formValue.workspace_id = this.currentWorkspaceId;
    }

    let request$;
    if (this.isEditMode) {
      request$ = this.workflowService.updateWorkflow(formValue);
    } else {
      if (!formValue.workflow_id) {
         formValue.workflow_id = `wf_${Date.now()}`;
      }
      request$ = this.workflowService.createWorkflow(formValue);
    }

    request$.subscribe({
      next: (res) => {
        this.isLoading = false;
        this.router.navigate(['/workflows']);
      },
      error: (err) => {
        console.error('Failed to save workflow', err);
        this.errorMessage = err.error?.message || 'Failed to save workflow.';
        this.isLoading = false;
      }
    });
  }

  getAvailableOutputs(currentIndex: number) {
    const outputs = [];
    for (let i = 0; i < currentIndex; i++) {
      const step = this.stepsArray.at(i).value;
      for (const key in step.outputs) {
        outputs.push({
          step_id: step.step_id,
          output_key: key,
          type: step.outputs[key].type,
          label: `${step.type} (${step.step_id.substr(0, 5)}...) - ${key}`
        });
      }
    }
    return outputs;
  }

  private populateForm(data: WorkflowModel) {
    this.workflowForm.patchValue({
      workspace_id: data.workspace_id,
      workflow_id: data.workflow_id,
      user_id: data.user_id
    });

    this.stepsArray.clear();
    if (data.workflow && data.workflow.steps) {
      data.workflow.steps.forEach(step => {
        this.addStepToForm(step.type, step);
      });
    }
  }

  private resetFormForNew() {
    this.workflowForm.reset();
    this.workflowForm.patchValue({
        workspace_id: this.currentWorkspaceId,
        user_id: 'user123',
        workflow_id: ''
    });
    this.stepsArray.clear();
    this.addStepToForm('user_input');
  }
}
