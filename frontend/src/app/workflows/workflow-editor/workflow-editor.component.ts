import {Component, OnDestroy, OnInit} from '@angular/core';
import {ActivatedRoute, Router} from '@angular/router';
import {
  AbstractControl,
  FormArray,
  FormBuilder,
  FormGroup,
  Validators,
} from '@angular/forms';
import {MatDialog} from '@angular/material/dialog';
import {WorkflowService} from '../workflow.service';
import {WorkflowCreateDto, WorkflowModel} from '../workflow.models';
import {WorkspaceStateService} from '../../services/workspace/workspace-state.service';
import {Subscription, combineLatest, of} from 'rxjs';
import {CdkDragDrop, moveItemInArray} from '@angular/cdk/drag-drop';
import {filter, switchMap, tap} from 'rxjs/operators';
import {AddStepModalComponent} from './add-step-modal/add-step-modal.component';

@Component({
  selector: 'app-workflow-editor',
  templateUrl: './workflow-editor.component.html',
  styleUrls: ['./workflow-editor.component.scss'],
})
export class WorkflowEditorComponent implements OnInit, OnDestroy {
  workflowForm!: FormGroup;
  isLoading = false;
  isEditMode = false;
  errorMessage: string | null = null;

  private mainSubscription!: Subscription;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private workflowService: WorkflowService,
    private dialog: MatDialog,
  ) {
    this.initForm();
  }

  asFormGroup(control: AbstractControl): FormGroup {
    return control as FormGroup;
  }

  ngOnInit(): void {
    this.mainSubscription = this.route.paramMap
      .pipe(
        tap(() => (this.isLoading = true)),
        switchMap(params => {
          const workflowId = params.get('workflowId');

          if (workflowId) {
            this.isEditMode = true;
            this.workflowService.setCurrentWorkflowId(workflowId);
            return this.workflowService.getWorkflowById(workflowId);
          }

          this.isEditMode = false;
          this.workflowService.setCurrentWorkflowId(null);
          return of(null);
        }),
      )
      .subscribe({
        next: workflowData => {
          if (workflowData) {
            this.populateForm(workflowData);
          } else {
            this.resetFormForNew();
          }
          this.isLoading = false;
        },
        error: err => {
          console.error('Failed to load workflow', err);
          this.errorMessage = 'Failed to load workflow.';
          this.isLoading = false;
        },
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
      id: [''],
      name: ['', Validators.required],
      description: [''],
      workspaceId: [''],
      user_id: ['user123'],
      steps: this.fb.array([]),
    });
  }

  get stepsArray(): FormArray {
    return this.workflowForm.get('steps') as FormArray;
  }

  openAddStepModal() {
    const dialogRef = this.dialog.open(AddStepModalComponent, {
      width: '600px',
      panelClass: 'node-palette-dialog',
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
      settings: {},
    };

    const stepGroup = this.fb.group({
      step_id: [stepData.step_id],
      type: [stepData.type],
      inputs: this.fb.group(stepData.inputs || {}),
      outputs: this.fb.group(stepData.outputs || {}),
      settings: this.fb.group(stepData.settings || {}),
    });

    this.stepsArray.push(stepGroup);
  }

  deleteStep(index: number) {
    this.stepsArray.removeAt(index);
  }

  dropStep(event: CdkDragDrop<string[]>) {
    moveItemInArray(
      this.stepsArray.controls,
      event.previousIndex,
      event.currentIndex,
    );
  }

  save() {
    if (this.workflowForm.invalid) return;

    this.isLoading = true;
    this.errorMessage = null;

    let request$;
    const formValue: WorkflowModel = this.workflowForm.getRawValue();

    if (this.isEditMode) {
      request$ = this.workflowService.updateWorkflow(formValue);
    } else {
      const rawValue = this.workflowForm.getRawValue();
      const createDto: Omit<WorkflowCreateDto, 'workspaceId'> = {
        name: rawValue.name,
        description: rawValue.description,
        steps: rawValue.steps,
      };
      request$ = this.workflowService.createWorkflow(createDto);
    }

    request$.subscribe({
      next: () => {
        this.isLoading = false;
        this.router.navigate(['/workflows']);
      },
      error: err => {
        console.error('Failed to save workflow', err);
        this.errorMessage = err.error?.message || 'Failed to save workflow.';
        this.isLoading = false;
      },
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
          label: `${step.type} (${step.step_id.substr(0, 5)}...) - ${key}`,
        });
      }
    }
    return outputs;
  }

  private populateForm(data: WorkflowModel) {
    this.workflowForm.patchValue({
      id: data.id,
      name: data.name,
      description: data.description,
      workspaceId: data.workspaceId,
      userId: data.userId,
    });

    this.stepsArray.clear();
    if (data.steps) {
      data.steps.forEach(step => {
        this.addStepToForm(step.type, step);
      });
    }
  }

  private resetFormForNew() {
    this.workflowForm.reset();
    this.workflowForm.patchValue({
      userId: '',
    });
    this.stepsArray.clear();
    this.addStepToForm('user_input');
  }
}
