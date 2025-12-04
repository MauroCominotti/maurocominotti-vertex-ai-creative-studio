
import { StepConfig } from '../generic-step/step.model';

export const VIRTUAL_TRY_ON_STEP_CONFIG: StepConfig = {
  type: 'virtual-try-on',
  title: 'Virtual Try-On',
  icon: 'accessibility_new',
  inputs: [
    { name: 'model_image', label: 'Model Image', type: 'image', required: true },
    { name: 'top_image', label: 'Top Image', type: 'image', required: false },
    { name: 'bottom_image', label: 'Bottom Image', type: 'image', required: false },
    { name: 'dress_image', label: 'Dress Image', type: 'image', required: false },
    { name: 'shoes_image', label: 'Shoes Image', type: 'image', required: false },
  ],
  settings: [],
  outputs: [
    {
      name: 'generated_image',
      label: 'generated_image',
      type: 'image',
    },
  ],
};
