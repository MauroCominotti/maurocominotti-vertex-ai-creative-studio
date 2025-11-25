import { ImageGenerationModelConfig, ImageGenerationModelEnum } from '../../../../common/enums/image-generation-models';
import { StepConfig } from '../generic-step/step.model';

const model_options = Object.entries(ImageGenerationModelConfig)
  .filter(([key]) => key === ImageGenerationModelEnum.NANO_BANANA || key === ImageGenerationModelEnum.NANO_BANANA_PRO)
  .map(([key, meta]) => ({
    value: key as ImageGenerationModelEnum,
    label: meta.viewValue,
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
      defaultValue: ImageGenerationModelEnum.NANO_BANANA,
    },
    {
      name: 'aspect_ratio',
      label: 'Aspect Ratio',
      type: 'select',
      options: [
        { value: '1:1', label: '1:1 (Square)' },
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
      name: 'edited_image',
      label: 'edited_image',
      type: 'image',
    },
  ],
};
