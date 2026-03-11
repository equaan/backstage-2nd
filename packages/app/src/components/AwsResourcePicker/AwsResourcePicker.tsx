import React, { useState, useCallback } from 'react';
import { FieldExtensionComponentProps } from '@backstage/plugin-scaffolder-react';
import FormControl from '@material-ui/core/FormControl';
import FormHelperText from '@material-ui/core/FormHelperText';
import Typography from '@material-ui/core/Typography';
import Checkbox from '@material-ui/core/Checkbox';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import TextField from '@material-ui/core/TextField';
import Select from '@material-ui/core/Select';
import MenuItem from '@material-ui/core/MenuItem';
import InputLabel from '@material-ui/core/InputLabel';
import Collapse from '@material-ui/core/Collapse';
import Box from '@material-ui/core/Box';
import { makeStyles } from '@material-ui/core/styles';

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

interface ResourceConfig {
  vpc_cidr?: string;
  ec2_instance_type?: string;
  s3_versioning?: boolean;
  rds_engine?: string;
}

interface SelectedResources {
  vpc: boolean;
  ec2: boolean;
  s3: boolean;
  rds: boolean;
}

interface AwsResourcePickerValue {
  resources: string;       // e.g. "vpc_ec2" — used in step if: conditions
  config: ResourceConfig;  // all config values flat — passed to fetch:template values
}

// ─────────────────────────────────────────────────────────────
// Styles — matches Backstage's dark theme
// ─────────────────────────────────────────────────────────────

const useStyles = makeStyles(theme => ({
  root: {
    width: '100%',
    marginTop: theme.spacing(1),
  },
  serviceCard: {
    border: `1px solid ${theme.palette.divider}`,
    borderRadius: theme.shape.borderRadius,
    marginBottom: theme.spacing(1.5),
    overflow: 'hidden',
    transition: 'border-color 0.2s ease',
    '&:hover': {
      borderColor: theme.palette.primary.main,
    },
  },
  serviceCardSelected: {
    borderColor: theme.palette.primary.main,
    backgroundColor: theme.palette.action.selected,
  },
  serviceHeader: {
    display: 'flex',
    alignItems: 'center',
    padding: theme.spacing(1, 2),
    cursor: 'pointer',
    userSelect: 'none',
  },
  serviceLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(1),
    flex: 1,
  },
  serviceBadge: {
    fontSize: '0.65rem',
    fontWeight: 700,
    letterSpacing: '0.05em',
    padding: theme.spacing(0.2, 0.8),
    borderRadius: 4,
    textTransform: 'uppercase',
    color: '#fff',
  },
  configArea: {
    padding: theme.spacing(1.5, 2, 2, 5),
    borderTop: `1px solid ${theme.palette.divider}`,
    backgroundColor: theme.palette.background.paper,
  },
  configField: {
    marginTop: theme.spacing(1.5),
    width: '100%',
    maxWidth: 400,
  },
  sectionTitle: {
    marginBottom: theme.spacing(1),
    fontWeight: 600,
    color: theme.palette.text.primary,
  },
  summaryBox: {
    marginTop: theme.spacing(2),
    padding: theme.spacing(1.5),
    borderRadius: theme.shape.borderRadius,
    backgroundColor: theme.palette.action.hover,
    border: `1px dashed ${theme.palette.divider}`,
  },
  summaryText: {
    fontFamily: 'monospace',
    fontSize: '0.8rem',
    color: theme.palette.text.secondary,
  },
  noSelection: {
    color: theme.palette.text.disabled,
    fontStyle: 'italic',
  },
}));

// ─────────────────────────────────────────────────────────────
// Service definitions — ADD NEW SERVICES HERE ONLY
// ─────────────────────────────────────────────────────────────

const SERVICE_DEFINITIONS = [
  {
    id: 'vpc',
    label: 'VPC',
    description: 'Virtual Private Cloud — isolated network for your resources',
    color: '#FF9900',
  },
  {
    id: 'ec2',
    label: 'EC2',
    description: 'Elastic Compute Cloud — virtual machines',
    color: '#FF4F8B',
  },
  {
    id: 's3',
    label: 'S3',
    description: 'Simple Storage Service — object storage',
    color: '#3F8624',
  },
  {
    id: 'rds',
    label: 'RDS',
    description: 'Relational Database Service — managed databases',
    color: '#527FFF',
  },
];

// ─────────────────────────────────────────────────────────────
// Config fields per service
// ─────────────────────────────────────────────────────────────

const VpcConfig = ({
  config,
  onChange,
  classes,
}: {
  config: ResourceConfig;
  onChange: (c: ResourceConfig) => void;
  classes: any;
}) => (
  <TextField
    className={classes.configField}
    label="CIDR Block"
    value={config.vpc_cidr ?? '10.0.0.0/16'}
    onChange={e => onChange({ ...config, vpc_cidr: e.target.value })}
    variant="outlined"
    size="small"
    helperText="e.g. 10.0.0.0/16"
  />
);

const Ec2Config = ({
  config,
  onChange,
  classes,
}: {
  config: ResourceConfig;
  onChange: (c: ResourceConfig) => void;
  classes: any;
}) => (
  <FormControl className={classes.configField} variant="outlined" size="small">
    <InputLabel>Instance Type</InputLabel>
    <Select
      value={config.ec2_instance_type ?? 't2.micro'}
      onChange={e =>
        onChange({ ...config, ec2_instance_type: e.target.value as string })
      }
      label="Instance Type"
    >
      <MenuItem value="t2.micro">t2.micro</MenuItem>
      <MenuItem value="t3.micro">t3.micro</MenuItem>
      <MenuItem value="t3.small">t3.small</MenuItem>
      <MenuItem value="t3.medium">t3.medium</MenuItem>
      <MenuItem value="t3.large">t3.large</MenuItem>
    </Select>
  </FormControl>
);

const S3Config = ({
  config,
  onChange,
}: {
  config: ResourceConfig;
  onChange: (c: ResourceConfig) => void;
}) => (
  <FormControlLabel
    control={
      <Checkbox
        checked={config.s3_versioning ?? false}
        onChange={e =>
          onChange({ ...config, s3_versioning: e.target.checked })
        }
        color="primary"
      />
    }
    label="Enable S3 Versioning"
  />
);

const RdsConfig = ({
  config,
  onChange,
  classes,
}: {
  config: ResourceConfig;
  onChange: (c: ResourceConfig) => void;
  classes: any;
}) => (
  <FormControl className={classes.configField} variant="outlined" size="small">
    <InputLabel>Database Engine</InputLabel>
    <Select
      value={config.rds_engine ?? 'mysql'}
      onChange={e =>
        onChange({ ...config, rds_engine: e.target.value as string })
      }
      label="Database Engine"
    >
      <MenuItem value="mysql">MySQL</MenuItem>
      <MenuItem value="postgres">PostgreSQL</MenuItem>
    </Select>
  </FormControl>
);

// ─────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────

export const AwsResourcePicker = ({
  onChange,
  rawErrors,
  required,
  formData,
}: FieldExtensionComponentProps<AwsResourcePickerValue>) => {
  const classes = useStyles();

  const [selected, setSelected] = useState<SelectedResources>(
    formData?.resources
      ? {
          vpc: formData.resources.includes('vpc'),
          ec2: formData.resources.includes('ec2'),
          s3: formData.resources.includes('s3'),
          rds: formData.resources.includes('rds'),
        }
      : { vpc: false, ec2: false, s3: false, rds: false },
  );

  const [config, setConfig] = useState<ResourceConfig>(
    formData?.config ?? {
      vpc_cidr: '10.0.0.0/16',
      ec2_instance_type: 't2.micro',
      s3_versioning: false,
      rds_engine: 'mysql',
    },
  );

  // Build the resources string from selected services
  // e.g. { vpc: true, ec2: true, s3: false, rds: false } → "vpc_ec2"
  const buildResourcesString = useCallback(
    (sel: SelectedResources): string => {
      const active = SERVICE_DEFINITIONS.filter(s => sel[s.id as keyof SelectedResources]).map(s => s.id);
      return active.join('_') || '';
    },
    [],
  );

  const handleToggle = (serviceId: string) => {
    const updated = { ...selected, [serviceId]: !selected[serviceId as keyof SelectedResources] };
    setSelected(updated);
    const resources = buildResourcesString(updated);
    onChange({ resources, config });
  };

  const handleConfigChange = (newConfig: ResourceConfig) => {
    setConfig(newConfig);
    const resources = buildResourcesString(selected);
    onChange({ resources, config: newConfig });
  };

  const selectedCount = Object.values(selected).filter(Boolean).length;
  const resourcesString = buildResourcesString(selected);

  return (
    <FormControl
      className={classes.root}
      required={required}
      error={rawErrors?.length > 0}
    >
      <Typography variant="subtitle2" className={classes.sectionTitle}>
        Select AWS Resources to Provision
      </Typography>

      {SERVICE_DEFINITIONS.map(service => {
        const isSelected = selected[service.id as keyof SelectedResources];

        return (
          <Box
            key={service.id}
            className={`${classes.serviceCard} ${isSelected ? classes.serviceCardSelected : ''}`}
          >
            {/* Service header row */}
            <Box
              className={classes.serviceHeader}
              onClick={() => handleToggle(service.id)}
            >
              <Checkbox
                checked={isSelected}
                color="primary"
                size="small"
                onClick={e => e.stopPropagation()}
                onChange={() => handleToggle(service.id)}
              />
              <Box className={classes.serviceLabel}>
                <span
                  className={classes.serviceBadge}
                  style={{ backgroundColor: service.color }}
                >
                  {service.label}
                </span>
                <Typography variant="body2" color="textSecondary">
                  {service.description}
                </Typography>
              </Box>
            </Box>

            {/* Config fields — only shown when service is selected */}
            <Collapse in={isSelected} timeout="auto" unmountOnExit>
              <Box className={classes.configArea}>
                {service.id === 'vpc' && (
                  <VpcConfig
                    config={config}
                    onChange={handleConfigChange}
                    classes={classes}
                  />
                )}
                {service.id === 'ec2' && (
                  <Ec2Config
                    config={config}
                    onChange={handleConfigChange}
                    classes={classes}
                  />
                )}
                {service.id === 's3' && (
                  <S3Config config={config} onChange={handleConfigChange} />
                )}
                {service.id === 'rds' && (
                  <RdsConfig
                    config={config}
                    onChange={handleConfigChange}
                    classes={classes}
                  />
                )}
              </Box>
            </Collapse>
          </Box>
        );
      })}

      {/* Live summary of what's selected */}
      <Box className={classes.summaryBox}>
        <Typography variant="caption" display="block" gutterBottom>
          Selected resources:
        </Typography>
        {selectedCount === 0 ? (
          <Typography className={`${classes.summaryText} ${classes.noSelection}`}>
            No resources selected
          </Typography>
        ) : (
          <Typography className={classes.summaryText}>
            {resourcesString} ({selectedCount} service{selectedCount > 1 ? 's' : ''})
          </Typography>
        )}
      </Box>

      {rawErrors?.length > 0 && (
        <FormHelperText>{rawErrors.join(', ')}</FormHelperText>
      )}
    </FormControl>
  );
};





