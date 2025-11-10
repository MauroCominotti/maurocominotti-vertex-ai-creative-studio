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
import {
  NodeTypes,
  StepStatusEnum,
  WorkflowBase,
  WorkflowCreateDto,
  WorkflowDefinitionStatusEnum,
  WorkflowModel,
  WorkflowRunModel,
  WorkflowRunStatusEnum,
  WorkflowStep,
  WorkflowUpdateDto
} from '../workflow.models';
import {Observable, Subscription, of} from 'rxjs';
import {CdkDragDrop, moveItemInArray} from '@angular/cdk/drag-drop';
import {filter, switchMap, tap} from 'rxjs/operators';
import {AddStepModalComponent} from './add-step-modal/add-step-modal.component';


@Component({
  selector: 'app-workflow-editor',
  templateUrl: './workflow-editor.component.html',
  styleUrls: ['./workflow-editor.component.scss'],
})
export class WorkflowEditorComponent implements OnInit, OnDestroy {
  // --- Component Mode & State ---
  EditorMode = EditorMode;
  mode: EditorMode = EditorMode.Create;
  NodeTypes = NodeTypes;
  workflowId: string | null = null;
  runId: string | null = null;

  // --- Data ---
  workflow: WorkflowModel | null = null;
  workflowRun: WorkflowRunModel | null = null;
  displayedWorkflow: WorkflowModel | WorkflowBase | null = null;

  // --- UI State ---
  workflowForm!: FormGroup;
  isLoading = false;
  errorMessage: string | null = null;
  selectedView: 'workflow' | 'history' = 'workflow';
  selectedStep: WorkflowStep | null = null;

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
          this.runId = params.get('runId');
          this.workflowId = params.get('workflowId');

          if (this.runId) {
            this.mode = EditorMode.Run;
            // TODO: Create and use a WorkflowRunService
            // return this.workflowRunService.getWorkflowRun(this.runId);
            return of(null); // Placeholder
          } else if (this.workflowId) {
            this.mode = EditorMode.Edit;
            return this.workflowService.getWorkflowById(this.workflowId);
          } else {
            this.mode = EditorMode.Create;
            return of(null);
          }
        }),
      )
      .subscribe({
        next: (data: WorkflowModel | WorkflowRunModel | null) => {
          if (this.mode === EditorMode.Run) {
            this.workflowRun = data ? (data as WorkflowRunModel) : null;
            this.displayedWorkflow = this.workflowRun?.workflowSnapshot ?? null;
            this.workflowId = this.workflowRun?.workflowId ?? null;
            this.populateFormFromData(this.displayedWorkflow);
            this.workflowForm.disable(); // Read-only mode
          } else if (this.mode === EditorMode.Edit) {
            this.workflow = data as WorkflowModel;
            this.displayedWorkflow = this.workflow;
            this.populateFormFromData(this.displayedWorkflow);
          } else {
            this.resetFormForNew();
          }
          this.isLoading = false;
        },
        error: err => {
          console.error('Failed to load workflow data', err);
          this.errorMessage = 'Failed to load workflow data.';
          this.isLoading = false;
        },
      });
  }

  // ... (rest of the component logic will be updated in subsequent steps)

  get isReadOnly(): boolean {
    return this.mode === EditorMode.Run;
  }

  // ... (rest of the component: ngOnDestroy, initForm, addStepToForm, etc. remains the same)
  ngOnDestroy(): void {
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
      userId: ['user123'],
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
      stepId: `${type}_${Date.now()}`,
      type: type,
      status: StepStatusEnum.IDLE,
      inputs: {},
      outputs: {},
      settings: {},
    };
    const stepGroup = this.fb.group({
      stepId: [stepData.stepId],
      type: [stepData.type],
      status: [stepData.status],
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

    let request$: Observable<any>;

    if (this.mode === EditorMode.Run) return;

    const formValue = this.workflowForm.getRawValue();

    if (this.mode === EditorMode.Edit) {
      const updateDto: WorkflowUpdateDto = {
        name: formValue.name,
        description: formValue.description,
        steps: formValue.steps,
        status: formValue.status,
        workspaceId: formValue.workspaceId,
      };

      request$ = this.workflowService.updateWorkflow(formValue.id, updateDto);
    } else {
      const createDto: Omit<WorkflowCreateDto, 'workspaceId'> = {
        name: formValue.name,
        description: formValue.description,
        steps: formValue.steps,
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

  private populateFormFromData(data: WorkflowModel | WorkflowBase | null) {
    if (!data) {
      this.resetFormForNew();
      return;
    }
    this.workflowForm.patchValue(data);
    this.stepsArray.clear();
    data.steps?.forEach(step => this.addStepToForm(step.type, step));
  }

  private resetFormForNew() {
    this.workflowForm.reset();
    this.workflowForm.patchValue({
      userId: '',
    });
    this.stepsArray.clear();
    this.addStepToForm('user_input');
  }

  getStepIcon(type: string): string {
    switch (type) {
      case NodeTypes.USER_INPUT:
        return 'input';
      case NodeTypes.GENERATE_TEXT:
        return 'text_fields';
      case NodeTypes.GENERATE_IMAGE:
        return 'image';
      case NodeTypes.EDIT_IMAGE:
        return 'edit';
      case NodeTypes.CROP_IMAGE:
        return 'crop';
      case NodeTypes.GENERATE_VIDEO:
        return 'movie';
      case NodeTypes.VIRTUAL_TRY_ON:
        return 'styler';
      default:
        return 'help_outline';
    }
  }

  getStepStatusChipClass(status: StepStatusEnum): string {
    switch (status) {
      case StepStatusEnum.PENDING:
        return '!bg-gray-500/20 !text-gray-300';
      case StepStatusEnum.RUNNING:
        return '!bg-blue-500/20 !text-blue-300';
      case StepStatusEnum.COMPLETED:
        return '!bg-green-500/20 !text-green-300';
      case StepStatusEnum.FAILED:
        return '!bg-red-500/20 !text-red-300';
      case StepStatusEnum.SKIPPED:
        return '!bg-amber-500/20 !text-amber-300';
      case StepStatusEnum.IDLE:
      default:
        return 'hidden';
    }
  }

  getStepStatusIcon(status: StepStatusEnum): string {
    switch (status) {
      case StepStatusEnum.RUNNING:
        return 'hourglass_top';
      case StepStatusEnum.COMPLETED:
        return 'check_circle';
      case StepStatusEnum.FAILED:
        return 'error';
      default:
        return '';
    }
  }
}

export enum EditorMode {
  Create,
  Edit,
  Run,
}
