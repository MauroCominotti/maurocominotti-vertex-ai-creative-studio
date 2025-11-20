
import { StepConfig } from '../generic-step/step.model';

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
      name: 'input_image',
      label: 'Input Image (Optional)',
      type: 'image',
      required: false,
    },
  ],
  settings: [
    {
      name: 'model',
      label: 'Model',
      type: 'select',
      options: [
        { value: 'veo-3.0-generate-001', label: 'Veo 3.0' },
      ],
      defaultValue: 'veo-3.0-generate-001',
    },
    {
      name: 'aspect_ratio',
      label: 'Aspect Ratio',
      type: 'select',
      options: [
        { value: '16:9', label: '16:9' },
        { value: '9:16', label: '9:16' },
      ],
      defaultValue: '16:9',
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
