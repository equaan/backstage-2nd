import { scaffolderPlugin } from '@backstage/plugin-scaffolder';
import { createScaffolderFieldExtension } from '@backstage/plugin-scaffolder-react';
import { SecurityPicker } from './SecurityPicker';

export const securityPickerValidation = async (
  value: { config: { enable_trivy: boolean; enable_owasp: boolean } },
  validation: { addError: (msg: string) => void },
) => {
  if (!value?.config?.enable_trivy && !value?.config?.enable_owasp) {
    validation.addError('Please enable at least one security scanner.');
  }
};

export const SecurityPickerFieldExtension = scaffolderPlugin.provide(
  createScaffolderFieldExtension({
    name: 'SecurityPicker',
    component: SecurityPicker,
    validation: securityPickerValidation,
  }),
);

export { SecurityPicker };