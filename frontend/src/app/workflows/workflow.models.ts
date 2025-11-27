export enum NodeTypes {
  USER_INPUT = 'user_input',
  GENERATE_TEXT = 'generate_text',
  GENERATE_IMAGE = 'generate_image',
  EDIT_IMAGE = 'edit_image',
  GENERATE_VIDEO = 'generate_video',
  CROP_IMAGE = 'crop_image',
  VIRTUAL_TRY_ON = 'virtual_try_on',
}

export interface StepOutputReference {
  step: string;
  output: string;
}

export enum StepStatusEnum {
  IDLE = 'idle',
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  SKIPPED = 'skipped',
}

// Base Step
interface BaseStep<T, S> {
  stepId: string;
  type: NodeTypes;

  // --- Execution State ---
  status: StepStatusEnum;
  error?: string;
  startedAt?: string;
  completedAt?: string;

  outputs: { [key: string]: any };
  inputs: T;
  settings: S;
}

// --- User Input ---
export interface UserInputInputs { }
export interface UserInputSettings { }
export type UserInputStep = BaseStep<UserInputInputs, UserInputSettings> & {
  type: NodeTypes.USER_INPUT;
};

// --- Generate Text ---
export interface GenerateTextInputs {
  prompt: StepOutputReference | string;
}
export interface GenerateTextSettings {
  model: string;
  temperature: number;
}
export type GenerateTextStep = BaseStep<
  GenerateTextInputs,
  GenerateTextSettings
> & { type: NodeTypes.GENERATE_TEXT };

// --- Generate Image ---
export interface GenerateImageInputs {
  prompt: StepOutputReference | string;
}
export interface GenerateImageSettings {
  model: string;
  brandGuidelines: boolean;
  aspectRatio: string;
  saveOutputToGallery: boolean;
}
export type GenerateImageStep = BaseStep<
  GenerateImageInputs,
  GenerateImageSettings
> & { type: NodeTypes.GENERATE_IMAGE };

// --- Edit Image ---
export interface EditImageInputs {
  input_images: StepOutputReference | string[] | string;
  prompt: StepOutputReference | string;
}
export interface EditImageSettings {
  brandGuidelines: boolean;
  aspectRatio: string;
  saveOutputToGallery: boolean;
}
export type EditImageStep = BaseStep<EditImageInputs, EditImageSettings> & {
  type: NodeTypes.EDIT_IMAGE;
};

// --- Union of all step types ---
export type WorkflowStep =
  | UserInputStep
  | GenerateTextStep
  | GenerateImageStep
  | EditImageStep;

export enum WorkflowDefinitionStatusEnum {
  DRAFT = "draft",
  PUBLISHED = "published",
}

export enum WorkflowRunStatusEnum {
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELED = 'canceled',
  SCHEDULED = 'scheduled',
}
export interface WorkflowBase {
  name: string;
  description: string;
  workspaceId: string;
  steps: WorkflowStep[];
}

export interface WorkflowModel extends WorkflowBase {
  id: string;
  createdAt: string;
  updatedAt: string;
  status: WorkflowDefinitionStatusEnum;
  userId: string;
}

export interface WorkflowCreateDto extends WorkflowBase { }

export interface WorkflowUpdateDto extends WorkflowBase {
  status: WorkflowDefinitionStatusEnum;
}

export interface WorkflowSearchDto {
  workspaceId: string;
  limit?: number;
  startAfter?: string;
  name?: string;
  status?: WorkflowDefinitionStatusEnum;
}

export interface PaginatedWorkflowsResponse {
  count: number;
  data: WorkflowModel[];
  nextPageCursor: string | null;
}

export interface WorkflowRunModel {
  id: string;
  userId: string;
  workspaceId: string;
  status: WorkflowRunStatusEnum;
  workflowSnapshot: WorkflowBase;
}

export interface ExecutionResponse {
  execution_id: string;
}

export interface StepEntry {
  step_id: string;
  state: string;
  step_inputs: any;
  step_outputs: any;
  start_time: string;
  end_time?: string;
}

export interface ExecutionDetails {
  id: string;
  state: string;
  result?: any;
  duration: number;
  error?: string;
  step_entries: StepEntry[];
}
