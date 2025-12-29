
export interface StepInput {
  name: string;
  label: string;
  type: 'text' | 'textarea' | 'select' | 'image' | 'video' | 'audio';
  options?: { value: string; label: string }[];
  required: boolean;
  hidden?: boolean;
}

export interface StepSetting {
  name: string;
  label: string;
  type: 'text' | 'textarea' | 'select' | 'checkbox' | 'slider' | 'radio';
  options?: { value: string; label: string }[];
  defaultValue: any;
  hidden?: boolean;
  min?: number;
  max?: number;
  step?: number;
}

export interface StepOutput {
  name: string;
  label: string;
  type: 'text' | 'image' | 'video' | 'audio';
}

export interface StepConfig {
  type: string;
  title: string;
  icon: string;
  inputs: StepInput[];
  settings: StepSetting[];
  outputs: StepOutput[];
}
