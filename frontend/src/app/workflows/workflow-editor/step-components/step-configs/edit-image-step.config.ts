import { MODEL_CONFIGS } from '../../../../common/config/model-config';
import { StepConfig } from '../generic-step/step.model';

const model_options = MODEL_CONFIGS
  .filter(model => model.value === 'gemini-2.5-flash-image-preview' || model.value === 'gemini-3-pro-image-preview')
  .map(model => ({
    value: model.value,
    label: model.viewValue,
  }));

export const EDIT_IMAGE_STEP_CONFIG: StepConfig = {
  type: 'edit-image',
  title: 'Edit Image',
  icon: 'auto_fix_high',
  inputs: [
    {
      name: 'input_images',
      label: 'Input Image',
      type: 'image',
      required: true,
    },
    {
      name: 'prompt',
      label: 'Edit Prompt',
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
      defaultValue: 'gemini-2.5-flash-image-preview',
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
      name: 'edited_image',
      label: 'edited_image',
      type: 'image',
    },
  ],
};
