import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { Component, OnDestroy, OnInit } from '@angular/core';
import {
  AbstractControl,
  FormArray,
  FormBuilder,
  FormGroup,
  Validators,
} from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable, Subscription, of } from 'rxjs';
import { switchMap, tap } from 'rxjs/operators';
import {
  NodeTypes,
  StepStatusEnum,
  WorkflowBase,
  WorkflowCreateDto,
  WorkflowModel,
  WorkflowRunModel,
  WorkflowStep,
  WorkflowUpdateDto
} from '../workflow.models';
import { WorkflowService } from '../workflow.service';
import { AddStepModalComponent } from './add-step-modal/add-step-modal.component';
import { RunWorkflowModalComponent } from './run-workflow-modal/run-workflow-modal.component';
import { CROP_IMAGE_STEP_CONFIG } from './step-components/step-configs/crop-image-step.config';
import { EDIT_IMAGE_STEP_CONFIG } from './step-components/step-configs/edit-image-step.config';
import { GENERATE_IMAGE_STEP_CONFIG } from './step-components/step-configs/generate-image-step.config';
import { GENERATE_TEXT_STEP_CONFIG } from './step-components/step-configs/generate-text-step.config';
import { GENERATE_VIDEO_STEP_CONFIG } from './step-components/step-configs/generate-video-step.config';
import { VIRTUAL_TRY_ON_STEP_CONFIG } from './step-components/step-configs/virtual-try-on-step.config';


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
  availableOutputsPerStep: any[][] = [];

  private mainSubscription!: Subscription;

  stepConfigs = {
    [NodeTypes.GENERATE_TEXT]: GENERATE_TEXT_STEP_CONFIG,
    [NodeTypes.GENERATE_IMAGE]: GENERATE_IMAGE_STEP_CONFIG,
    [NodeTypes.EDIT_IMAGE]: EDIT_IMAGE_STEP_CONFIG,
    [NodeTypes.CROP_IMAGE]: CROP_IMAGE_STEP_CONFIG,
    [NodeTypes.GENERATE_VIDEO]: GENERATE_VIDEO_STEP_CONFIG,
    [NodeTypes.VIRTUAL_TRY_ON]: VIRTUAL_TRY_ON_STEP_CONFIG,
  };

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private workflowService: WorkflowService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar, // Inject MatSnackBar
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
          console.log(`run id: ${this.runId}`)
          console.log(`workflow id: ${this.workflowId}`)
          if (this.runId) {
            console.log("This mode run")
            this.mode = EditorMode.Run;
            // TODO: Create and use a WorkflowRunService
            // return this.workflowRunService.getWorkflowRun(this.runId);
            return of(null); // Placeholder
          } else if (this.workflowId) {
            console.log("This mode edit")
            this.mode = EditorMode.Edit;
            return this.workflowService.getWorkflowById(this.workflowId);
          } else {
            console.log("This mode create")
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
            this.workflowId = this.workflowRun?.id ?? null;
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

    // Initialize and subscribe to user input changes
    this.syncOutputs();
    this.outputDefinitionsArray.valueChanges.subscribe(() => this.syncOutputs());
  }

  // ... (rest of the component logic will be updated in subsequent steps)

  getStepConfig(type: string) {
    return this.stepConfigs[type as keyof typeof this.stepConfigs];
  }

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
      name: ['Untitled Workflow', Validators.required],
      description: [''],
      workspaceId: [''],
      userId: ['user123'],
      userInput: this.fb.group({
        stepId: ['user_input'],
        type: ['user_input'],
        status: [StepStatusEnum.IDLE],
        outputs: this.fb.group({}),
        settings: this.fb.group({
          definitions: this.fb.array([]),
        }),
      }),
      steps: this.fb.array([]),
    });
  }

  get stepsArray(): FormArray {
    return this.workflowForm.get('steps') as FormArray;
  }

  get outputDefinitionsArray(): FormArray {
    return this.workflowForm.get('userInput.settings.definitions') as FormArray;
  }

  private createOutputDefinition(name: string, type: string): FormGroup {
    return this.fb.group({
      name: [name, Validators.required],
      type: [type, Validators.required],
    });
  }

  addOutput(name = '', type = 'text'): void {
    this.outputDefinitionsArray.push(this.createOutputDefinition(name, type));
  }

  removeOutput(index: number): void {
    this.outputDefinitionsArray.removeAt(index);
  }

  private syncOutputs(): void {
    const outputs = this.workflowForm.get('userInput.outputs') as FormGroup;

    Object.keys(outputs.controls).forEach(key => outputs.removeControl(key));
    this.outputDefinitionsArray.controls.forEach(control => {
      const name = control.get('name')?.value;
      const type = control.get('type')?.value;
      if (name && type) {
        outputs.addControl(name, this.fb.control({ type: type }));
      }
    });
    this.updateAvailableOutputs();
  }

  updateAvailableOutputs(): void {
    const userInputOutputs: any[] = [];
    const outputs = (this.workflowForm.get('userInput.outputs') as FormGroup).controls;
    for (const key in outputs) {
      userInputOutputs.push({
        label: `User Input: ${key}`,
        value: {
          step: "user_input",
          output: key,
        },
        type: outputs[key].value.type,
      });
    }

    this.availableOutputsPerStep = this.stepsArray.controls.map((_, currentStepIndex) => {
      const previousSteps = this.stepsArray.controls.slice(0, currentStepIndex);
      const availableOutputs: any[] = [...userInputOutputs];

      previousSteps.forEach((stepControl, stepIndex) => {
        const step = stepControl.value;
        const stepConfig = this.getStepConfig(step.type);
        if (!stepConfig) return;

        stepConfig.outputs.forEach(output => {
          availableOutputs.push({
            label: `Step ${stepIndex + 1}: ${output.label}`,
            value: {
              step: step.stepId,
              output: output.name,
            },
            type: output.type,
          });
        });
      });
      return availableOutputs;
    });
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
    let stepData = existingData || {
      stepId: `${type}_${Date.now()}`,
      type: type,
      status: StepStatusEnum.IDLE,
      inputs: {},
      outputs: {},
      settings: {},
    };

    // Set default settings for specific step types if not already present
    if (!existingData) {
      switch (type) {
        case NodeTypes.EDIT_IMAGE:
          stepData.settings = {
            ...stepData.settings,
            aspectRatio: '1:1', // Default value
            saveOutputToGallery: true, // Default value
          };
          break;
        // Add other step types with their default settings here if needed
      }
    }

    const stepGroup = this.fb.group({
      stepId: [stepData.stepId],
      type: [stepData.type],
      status: [stepData.status],
      inputs: this.fb.group(stepData.inputs || {}),
      outputs: this.fb.group(stepData.outputs || {}),
      settings: this.fb.group(stepData.settings || {}),
    });

    this.stepsArray.push(stepGroup);
    this.updateAvailableOutputs();
  }

  deleteStep(index: number) {
    this.stepsArray.removeAt(index);
    this.updateAvailableOutputs();
  }

  dropStep(event: CdkDragDrop<string[]>) {
    moveItemInArray(
      this.stepsArray.controls,
      event.previousIndex,
      event.currentIndex,
    );
    this.updateAvailableOutputs();
  }

  save() {
    if (this.workflowForm.invalid || this.workflowForm.pristine) return;

    this.isLoading = true;
    this.errorMessage = null;

    const formValue = this.workflowForm.getRawValue();
    const steps = this.prepareSteps(formValue);

    let request$: Observable<any>;

    if (this.mode === EditorMode.Edit) {
      const updateDto: WorkflowUpdateDto = {
        name: formValue.name,
        description: formValue.description || '',
        steps: steps,
        status: formValue.status,
        workspaceId: formValue.workspaceId,
      };
      request$ = this.workflowService.updateWorkflow(formValue.id, updateDto);
    } else {
      const createDto: WorkflowCreateDto = {
        name: formValue.name,
        description: formValue.description || '',
        steps: steps,
        workspaceId: formValue.workspaceId,
      };
      request$ = this.workflowService.createWorkflow(createDto);
    }

    request$.subscribe({
      next: (response) => {
        this.isLoading = false;
        this.workflowForm.markAsPristine();

        // If we were in Create mode, switch to Edit mode with the new ID
        if (this.mode === EditorMode.Create && response && response.id) {
          this.mode = EditorMode.Edit;
          this.workflowId = response.id;
          this.workflowForm.patchValue({ id: response.id });
          // Update URL without reloading
          this.router.navigate(['/workflows', 'edit', response.id], { replaceUrl: true });
        }
      },
      error: err => {
        console.error('Failed to save workflow', err);
        this.errorMessage = err.error?.message || 'Failed to save workflow.';
        this.isLoading = false;
      },
    });
  }

  run() {
    if (this.workflowForm.invalid) return;

    const formValue = this.workflowForm.getRawValue();
    const steps = this.prepareSteps(formValue);
    const userInputStep = steps.find(s => s.type === NodeTypes.USER_INPUT);

    // If form is pristine and we have an ID, just run it
    if (this.workflowForm.pristine && this.workflowId) {
      this.openRunModal(this.workflowId, userInputStep);
      return;
    }

    // Otherwise save first (or create if new)
    this.isLoading = true;
    this.errorMessage = null;

    let saveRequest$: Observable<any>;

    if (this.mode === EditorMode.Edit) {
      const updateDto: WorkflowUpdateDto = {
        name: formValue.name,
        description: formValue.description || '',
        steps: steps,
        status: formValue.status,
        workspaceId: formValue.workspaceId,
      };
      saveRequest$ = this.workflowService.updateWorkflow(formValue.id, updateDto);
    } else {
      const createDto: WorkflowCreateDto = {
        name: formValue.name,
        description: formValue.description || '',
        steps: steps,
        workspaceId: formValue.workspaceId,
      };
      saveRequest$ = this.workflowService.createWorkflow(createDto);
    }

    saveRequest$.subscribe({
      next: (response) => {
        this.isLoading = false;
        this.workflowForm.markAsPristine();

        let workflowId = this.workflowId;
        if (this.mode === EditorMode.Create && response && response.id) {
          this.mode = EditorMode.Edit;
          this.workflowId = response.id;
          workflowId = response.id;
          this.workflowForm.patchValue({ id: response.id });
          this.router.navigate(['/workflows', 'edit', response.id], { replaceUrl: true });
        }

        if (workflowId) {
          this.openRunModal(workflowId, userInputStep);
        }
      },
      error: err => {
        console.error('Failed to save before run', err);
        this.errorMessage = 'Failed to save workflow before running.';
        this.isLoading = false;
      }
    });
  }

  private prepareSteps(formValue: any): any[] {
    const user_input_step = {
      ...formValue.userInput,
      stepId: `${NodeTypes.USER_INPUT}`,
      type: NodeTypes.USER_INPUT,
      status: StepStatusEnum.IDLE,
    }
    return [user_input_step, ...formValue.steps];
  }

  openRunModal(workflowId: string, userInputStep: any) {
    const dialogRef = this.dialog.open(RunWorkflowModalComponent, {
      width: '600px',
      data: { userInputStep }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.isLoading = true;
        this.workflowService.executeWorkflow(workflowId, result).subscribe({
          next: (res) => {
            console.log('Workflow execution started', res);
            this.isLoading = false;
            this.snackBar.open('Workflow execution started!', 'Close', {
              duration: 3000,
              horizontalPosition: 'end',
              verticalPosition: 'top',
              panelClass: ['bg-green-600', 'text-white']
            });
          },
          error: (err) => {
            console.error('Failed to execute workflow', err);
            this.errorMessage = 'Failed to execute workflow';
            this.isLoading = false;
            this.snackBar.open('Failed to execute workflow', 'Close', {
              duration: 3000,
              horizontalPosition: 'end',
              verticalPosition: 'top',
              panelClass: ['bg-red-600', 'text-white']
            });
          }
        });
      }
    });
  }

  private populateFormFromData(data: WorkflowModel | WorkflowBase | null) {
    if (!data) {
      this.resetFormForNew();
      return;
    }

    const userInputStep = data.steps?.find(s => s.type === NodeTypes.USER_INPUT);
    const otherSteps = data.steps?.filter(s => s.type !== NodeTypes.USER_INPUT) || [];
    this.workflowForm.get('userInput.outputs') as FormGroup
    // Patch basic form values
    this.workflowForm.patchValue({
      ...data,
      userInput: userInputStep || (this.workflowForm.get('userInput') as FormGroup).value,
    });

    // Clear and populate the output definitions from the loaded data
    this.outputDefinitionsArray.clear();
    if (userInputStep && userInputStep.outputs) {
      Object.entries(userInputStep.outputs).forEach(([key, value]) => {
        this.addOutput(key, value.type);
      });
    }

    // Clear and populate the steps
    this.stepsArray.clear();
    otherSteps.forEach(step => this.addStepToForm(step.type, step));

    // Sync everything
    this.syncOutputs();
  }

  private resetFormForNew() {
    console.log("Reset form for new")
    this.workflowForm.reset();
    this.workflowForm.patchValue({
      name: 'Untitled Workflow',
      userId: '',
    });
    this.stepsArray.clear();
    this.outputDefinitionsArray.clear();
    this.addOutput('main_prompt', 'text');
    this.addOutput('model_image', 'image');
    this.updateAvailableOutputs();
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
