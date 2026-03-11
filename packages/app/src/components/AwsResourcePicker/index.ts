import { scaffolderPlugin } from '@backstage/plugin-scaffolder';
import { createScaffolderFieldExtension } from '@backstage/plugin-scaffolder-react';
import { AwsResourcePicker } from './AwsResourcePicker';

// ─────────────────────────────────────────────────────────────
// Validation — ensures at least one resource is selected
// ─────────────────────────────────────────────────────────────

export const awsResourcePickerValidation = async (
  value: { resources: string; config: object },
  validation: { addError: (msg: string) => void },
) => {
  if (!value?.resources || value.resources.trim() === '') {
    validation.addError('Please select at least one AWS resource to provision.');
  }
};

// ─────────────────────────────────────────────────────────────
// Field Extension — registers the component with Backstage
// ─────────────────────────────────────────────────────────────

export const AwsResourcePickerFieldExtension = scaffolderPlugin.provide(
  createScaffolderFieldExtension({
    name: 'AwsResourcePicker',
    component: AwsResourcePicker,
    validation: awsResourcePickerValidation,
  }),
);

export { AwsResourcePicker };