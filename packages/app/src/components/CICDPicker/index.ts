import { scaffolderPlugin } from '@backstage/plugin-scaffolder';
import { createScaffolderFieldExtension } from '@backstage/plugin-scaffolder-react';
import { CICDPicker } from './CICDPicker';

export const cicdPickerValidation = async (
  value: { tools: string; config: object },
  validation: { addError: (msg: string) => void },
) => {
  if (!value?.tools || value.tools.trim() === '') {
    validation.addError('Please select at least one CI/CD tool.');
  }
};

export const CICDPickerFieldExtension = scaffolderPlugin.provide(
  createScaffolderFieldExtension({
    name: 'CICDPicker',
    component: CICDPicker,
    validation: cicdPickerValidation,
  }),
);

export { CICDPicker };