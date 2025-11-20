
import { ImageGenerationModelConfig, ImageGenerationModelEnum } from '../../../../common/enums/image-generation-models';
import { StepConfig } from '../generic-step/step.model';

const model_options = Object.entries(ImageGenerationModelConfig).map(([key, meta]) => ({
  value: key as ImageGenerationModelEnum,
  label: meta.viewValue
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
      defaultValue: ImageGenerationModelEnum.IMAGEN_4,
    },
    {
      name: 'aspect_ratio',
      label: 'Aspect Ratio',
      type: 'select',
      options: [
        { value: '1:1', label: '1:1 (Square)' },
        { value: '16:9', label: '16:9 (Landscape)' },
        { value: '9:16', label: '9:16 (Portrait)' },
        { value: '4:3', label: '4:3' },
        { value: '3:4', label: '3:4' },
      ],
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
