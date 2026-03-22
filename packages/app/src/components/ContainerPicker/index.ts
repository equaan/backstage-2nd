import { scaffolderPlugin } from '@backstage/plugin-scaffolder';
import { createScaffolderFieldExtension } from '@backstage/plugin-scaffolder-react';
import { ContainerPicker } from './ContainerPicker';

export const containerPickerValidation = async (
  value: { config: { language: string; app_port: number; health_check_path: string } },
  validation: { addError: (msg: string) => void },
) => {
  if (!value?.config?.language) {
    validation.addError('Please select a language.');
  }
  if (!value?.config?.app_port) {
    validation.addError('Please enter the application port.');
  }
  if (!value?.config?.health_check_path) {
    validation.addError('Please enter the health check path.');
  }
};

export const ContainerPickerFieldExtension = scaffolderPlugin.provide(
  createScaffolderFieldExtension({
    name: 'ContainerPicker',
    component: ContainerPicker,
    validation: containerPickerValidation,
  }),
);

export { ContainerPicker };