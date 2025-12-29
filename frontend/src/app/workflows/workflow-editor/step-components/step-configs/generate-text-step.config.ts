
import { MODEL_CONFIGS } from '../../../../common/config/model-config';
import { StepConfig } from '../generic-step/step.model';

const model_options = MODEL_CONFIGS
  .filter(model => model.type === 'TEXT')
  .map(model => ({
    value: model.value,
    label: model.viewValue
  }));

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
    {
      name: 'input_images',
      label: 'Input Images',
      type: 'image',
      required: false,
    },
    {
      name: 'input_videos',
      label: 'Input Videos',
      type: 'video',
      required: false,
    },
  ],
  settings: [
    {
      name: 'model',
      label: 'Model',
      type: 'select',
      options: model_options,
      defaultValue: 'gemini-3-flash-preview',
    },
    {
      name: 'temperature',
      label: 'Temperature',
      type: 'slider',
      defaultValue: 0.7,
      min: 0,
      max: 1,
      step: 0.1,
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
