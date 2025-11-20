
export interface StepInput {
  name: string;
  label: string;
  type: 'text' | 'textarea' | 'select' | 'image';
  options?: { value: string; label: string }[];
  required: boolean;
}

export interface StepSetting {
  name: string;
  label: string;
  type: 'text' | 'textarea' | 'select' | 'checkbox' | 'slider';
  options?: { value: string; label: string }[];
  defaultValue: any;
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
