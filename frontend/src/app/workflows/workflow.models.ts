export interface StepInput {
  step?: string;
  output?: string;
}

export interface StepOutput {
  type: string; // e.g., 'image', 'text', 'video'
}

export interface StepSettings {
  // Add all possible settings across all steps here for loose typing,
  // or create specific interfaces for strict typing if preferred.
  model?: string;
  temperature?: number;
  brand_guidelines?: boolean;
  aspect_ratio?: string;
  seed?: number;
  width?: number;
  height?: number;
  prompt?: string;
}

export interface WorkflowStep {
  step_id: string;
  type: string;
  // Inputs can be a raw string (Fixed value) OR a StepInput object (Linked value)
  inputs: { [key: string]: StepInput | string };
  outputs: { [key: string]: StepOutput };
  settings: { [key: string]: StepSettings | string | number | boolean };
}

export interface Workflow {
  steps: WorkflowStep[];
}

export interface WorkflowModel {
  user_id: string;
  workspace_id: string;
  workflow_id: string;
  workflow: Workflow;
}
