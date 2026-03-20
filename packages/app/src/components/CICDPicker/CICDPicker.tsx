import { useState } from 'react';
import { FieldExtensionComponentProps } from '@backstage/plugin-scaffolder-react';

export interface CICDPickerValue {
  tools: string;
  config: object;
}

export const CICDPicker = ({
  onChange,
}: FieldExtensionComponentProps<CICDPickerValue>) => {

  const [selected, setSelected] = useState<string[]>([]);

  const tools = ['GitHub Actions', 'Jenkins', 'GitLab CI', 'ArgoCD'];

  const toggle = (tool: string) => {
    const updated = selected.includes(tool)
      ? selected.filter(t => t !== tool)
      : [...selected, tool];
    setSelected(updated);
    onChange({ tools: updated.join(','), config: {} });
  };

  return (
    <div style={{ padding: '16px' }}>
      <p style={{ fontWeight: 'bold', marginBottom: '12px' }}>
        Select CI/CD Tools
      </p>
      {tools.map(tool => (
        <div key={tool} style={{ marginBottom: '8px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={selected.includes(tool)}
              onChange={() => toggle(tool)}
            />
            <span>{tool}</span>
          </label>
        </div>
      ))}
      {selected.length > 0 && (
        <p style={{ marginTop: '12px', fontSize: '0.85rem', color: '#aaa' }}>
          Selected: {selected.join(', ')}
        </p>
      )}
    </div>
  );
};