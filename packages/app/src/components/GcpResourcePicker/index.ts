import { scaffolderPlugin } from '@backstage/plugin-scaffolder';
import { createScaffolderFieldExtension } from '@backstage/plugin-scaffolder-react';
import { GcpResourcePicker } from './GcpResourcePicker';

export const gcpResourcePickerValidation = async (
  value: {
    foundation: { project_id: string; region: string; adc_confirmed: boolean };
    resources: string;
    config: object;
  },
  validation: { addError: (msg: string) => void },
) => {
  if (!value?.foundation?.project_id || value.foundation.project_id.trim() === '') {
    validation.addError('Please enter a GCP Project ID.');
  }
  if (!value?.foundation?.region) {
    validation.addError('Please select a GCP region.');
  }
  if (!value?.foundation?.adc_confirmed) {
    validation.addError('Please confirm that Application Default Credentials (ADC) are configured.');
  }
  if (!value?.resources || value.resources.trim() === '') {
    validation.addError('Please select at least one GCP resource to provision.');
  }
};

export const GcpResourcePickerFieldExtension = scaffolderPlugin.provide(
  createScaffolderFieldExtension({
    name: 'GcpResourcePicker',
    component: GcpResourcePicker,
    validation: gcpResourcePickerValidation,
  }),
);

export { GcpResourcePicker };