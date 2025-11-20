
import { StepConfig } from '../generic-step/step.model';

export const CROP_IMAGE_STEP_CONFIG: StepConfig = {
  type: 'crop-image',
  title: 'Crop Image',
  icon: 'crop',
  inputs: [
    {
      name: 'input_image',
      label: 'Input Image',
      type: 'image',
      required: true,
    },
  ],
  settings: [
    {
      name: 'crop_aspect_ratio',
      label: 'Target Ratio',
      type: 'select',
      options: [
        { value: '1:1', label: '1:1 (Square)' },
        { value: '16:9', label: '16:9' },
        { value: '9:16', label: '9:16' },
        { value: '4:3', label: '4:3' },
      ],
      defaultValue: '1:1',
    },
    {
      name: 'background_color',
      label: 'Fill Color',
      type: 'text',
      defaultValue: '#FFFFFF',
    },
    {
      name: 'fill_aspect_ratio',
      label: 'Fill if does not fit',
      type: 'checkbox',
      defaultValue: false,
    },
  ],
  outputs: [
    {
      name: 'cropped_image',
      label: 'cropped_image',
      type: 'image',
    },
  ],
};
