
import { MODEL_CONFIGS } from '../../../../common/config/model-config';
import { StepConfig } from '../generic-step/step.model';

const model_options = MODEL_CONFIGS
  .filter(model => model.type === 'IMAGE')
  .map(model => ({
    value: model.value,
    label: model.viewValue
  }));

export const GENERATE_IMAGE_STEP_CONFIG: StepConfig = {
  type: 'generate-image',
  title: 'Generate Image',
  icon: 'image',
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
      options: model_options,
      defaultValue: 'imagen-4.0-generate-001',
    },
    {
      name: 'aspect_ratio',
      label: 'Aspect Ratio',
      type: 'select',
      options: [],
      defaultValue: '1:1',
    },
    {
      name: 'brand_guidelines',
      label: 'Use Brand Guidelines',
      type: 'checkbox',
      defaultValue: true,
    },
  ],
  outputs: [
    {
      name: 'generated_image',
      label: 'generated_image',
      type: 'image',
    },
  ],
};
