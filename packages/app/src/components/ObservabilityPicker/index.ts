import { scaffolderPlugin } from '@backstage/plugin-scaffolder';
import { createScaffolderFieldExtension } from '@backstage/plugin-scaffolder-react';
import { ObservabilityPicker } from './ObservabilityPicker';

export const observabilityPickerValidation = async (
  value: { config: { grafana_admin_password: string } },
  validation: { addError: (msg: string) => void },
) => {
  if (!value?.config?.grafana_admin_password || value.config.grafana_admin_password.trim() === '') {
    validation.addError('Grafana admin password is required.');
  }
  if (value?.config?.grafana_admin_password?.length < 8) {
    validation.addError('Grafana admin password must be at least 8 characters.');
  }
};

export const ObservabilityPickerFieldExtension = scaffolderPlugin.provide(
  createScaffolderFieldExtension({
    name: 'ObservabilityPicker',
    component: ObservabilityPicker,
    validation: observabilityPickerValidation,
  }),
);

export { ObservabilityPicker };