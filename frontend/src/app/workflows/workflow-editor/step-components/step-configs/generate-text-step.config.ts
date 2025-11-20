
import { StepConfig } from '../generic-step/step.model';

export const GENERATE_TEXT_STEP_CONFIG: StepConfig = {
  type: 'generate-text',
  title: 'Generate Text',
  icon: 'edit_note',
  inputs: [
    {
      name: 'prompt',
      label: 'Prompt',
      type: 'textarea',
      required: true,
    },
  ],
  settings: [
    {
      name: 'model',
      label: 'Model',
      type: 'select',
      options: [
        { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro' },
        { value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash' },
      ],
      defaultValue: 'gemini-1.5-pro',
    },
    {
      name: 'temperature',
      label: 'Temperature',
      type: 'slider',
      defaultValue: 0.7,
    },
  ],
  outputs: [
    {
      name: 'generated_text',
      label: 'generated_text',
      type: 'text',
    },
  ],
};
