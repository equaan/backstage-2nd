import { scaffolderPlugin } from '@backstage/plugin-scaffolder';
import { createScaffolderFieldExtension } from '@backstage/plugin-scaffolder-react';
import { AzureResourcePicker } from './AzureResourcePicker';

// ─────────────────────────────────────────────────────────────
// VALIDATION
// ─────────────────────────────────────────────────────────────

export const azureResourcePickerValidation = async (
  value: {
    foundation: { location: string; subscription_id_confirmed: boolean };
    resources: string;
    config: object;
  },
  validation: { addError: (msg: string) => void },
) => {
  if (!value?.foundation?.location) {
    validation.addError('Please select an Azure location.');
  }
  if (!value?.foundation?.subscription_id_confirmed) {
    validation.addError('Please confirm that ARM_SUBSCRIPTION_ID is set in your environment.');
  }
  if (!value?.resources || value.resources.trim() === '') {
    validation.addError('Please select at least one Azure resource to provision.');
  }
};

// ─────────────────────────────────────────────────────────────
// FIELD EXTENSION REGISTRATION
// ─────────────────────────────────────────────────────────────

export const AzureResourcePickerFieldExtension = scaffolderPlugin.provide(
  createScaffolderFieldExtension({
    name: 'AzureResourcePicker',
    component: AzureResourcePicker,
    validation: azureResourcePickerValidation,
  }),
);

export { AzureResourcePicker };