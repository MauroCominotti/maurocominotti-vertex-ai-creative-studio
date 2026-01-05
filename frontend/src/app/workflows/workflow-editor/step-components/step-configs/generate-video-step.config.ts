import { MODEL_CONFIGS } from '../../../../common/config/model-config';
import { StepConfig } from '../generic-step/step.model';

const model_options = MODEL_CONFIGS
  .filter(model => model.type === 'VIDEO')
  .map(model => ({
    value: model.value,
    label: model.viewValue
  }));

export const GENERATE_VIDEO_STEP_CONFIG: StepConfig = {
  type: 'generate-video',
  title: 'Generate Video',
  icon: 'movie',
  inputs: [
    {
      name: 'prompt',
      label: 'Prompt',
      type: 'textarea',
      required: true,
    },
    {
      name: 'input_images',
      label: 'Input Images (Reference)',
      type: 'image',
      required: false,
    },
    {
      name: 'start_frame',
      label: 'Start Frame',
      type: 'image',
      required: false,
      hidden: true,
    },
    {
      name: 'end_frame',
      label: 'End Frame',
      type: 'image',
      required: false,
      hidden: true,
    },
  ],
  settings: [
    {
      name: 'model',
      label: 'Model',
      type: 'select',
      options: model_options,
      defaultValue: 'veo-3.0-generate-001',
    },
    {
      name: 'input_mode',
      label: 'Generation Mode',
      type: 'select',
      options: [],
      defaultValue: 'Text to Video',
    },
    {
      name: 'aspect_ratio',
      label: 'Aspect Ratio',
      type: 'select',
      options: [],
      defaultValue: '16:9',
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
      name: 'generated_video',
      label: 'generated_video',
      type: 'video',
    },
  ],
};
