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
import Chip from '@material-ui/core/Chip';
import { makeStyles } from '@material-ui/core/styles';

// ─────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────

interface ResourceConfig {
  // VPC
  vpc_cidr?: string;
  // Subnets
  public_subnet_cidrs?: string;   // comma-separated
  private_subnet_cidrs?: string;  // comma-separated
  availability_zones?: string;    // comma-separated
  // Security Groups
  allowed_ssh_cidrs?: string;     // comma-separated, empty = no SSH
  rds_port?: number;
  // EC2
  ec2_instance_type?: string;
  // S3
  s3_versioning?: boolean;
  // RDS
  rds_engine?: string;
  // IAM — no config needed, presence = enabled
}

interface SelectedResources {
  vpc: boolean;
  subnets: boolean;
  security_groups: boolean;
  ec2: boolean;
  s3: boolean;
  rds: boolean;
  iam: boolean;
}

export interface AwsResourcePickerValue {
  resources: string;
  config: ResourceConfig;
}

// ─────────────────────────────────────────────────────────────
// STYLES
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
    flexWrap: 'wrap',
  },
  serviceBadge: {
    fontSize: '0.65rem',
    fontWeight: 700,
    letterSpacing: '0.05em',
    padding: theme.spacing(0.2, 0.8),
    borderRadius: 4,
    textTransform: 'uppercase' as const,
    color: '#fff',
    whiteSpace: 'nowrap' as const,
  },
  configArea: {
    padding: theme.spacing(1.5, 2, 2, 5),
    borderTop: `1px solid ${theme.palette.divider}`,
    backgroundColor: theme.palette.background.paper,
  },
  configField: {
    marginTop: theme.spacing(1.5),
    width: '100%',
    maxWidth: 420,
  },
  sectionTitle: {
    marginBottom: theme.spacing(1),
    fontWeight: 600,
    color: theme.palette.text.primary,
  },
  dependencyNote: {
    fontSize: '0.72rem',
    color: theme.palette.text.disabled,
    fontStyle: 'italic',
  },
  warnChip: {
    fontSize: '0.65rem',
    height: 20,
    backgroundColor: '#f57c00',
    color: '#fff',
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
  prodWarning: {
    marginTop: theme.spacing(1),
    padding: theme.spacing(1),
    borderRadius: theme.shape.borderRadius,
    backgroundColor: 'rgba(245, 124, 0, 0.08)',
    border: '1px solid rgba(245, 124, 0, 0.3)',
    fontSize: '0.75rem',
    color: '#f57c00',
  },
}));

// ─────────────────────────────────────────────────────────────
// SERVICE DEFINITIONS
// To add a new service: add entry here + config component below
// ─────────────────────────────────────────────────────────────

const SERVICE_DEFINITIONS = [
  {
    id: 'vpc',
    label: 'VPC',
    description: 'Virtual Private Cloud — networking foundation',
    color: '#FF9900',
    dependsOn: [] as string[],
  },
  {
    id: 'subnets',
    label: 'Subnets',
    description: 'Public + private subnets across availability zones',
    color: '#FF6B35',
    dependsOn: ['vpc'],
  },
  {
    id: 'security_groups',
    label: 'Security Groups',
    description: 'Web, database, and internal tier security groups',
    color: '#E83E8C',
    dependsOn: ['vpc'],
  },
  {
    id: 'ec2',
    label: 'EC2',
    description: 'Elastic Compute Cloud — virtual machines',
    color: '#FF4F8B',
    dependsOn: ['subnets', 'security_groups'],
  },
  {
    id: 's3',
    label: 'S3',
    description: 'Simple Storage Service — object storage',
    color: '#3F8624',
    dependsOn: [] as string[],
  },
  {
    id: 'rds',
    label: 'RDS',
    description: 'Relational Database Service — managed databases',
    color: '#527FFF',
    dependsOn: ['subnets', 'security_groups'],
  },
  {
    id: 'iam',
    label: 'IAM Baseline',
    description: 'EC2 instance profile, SSM access, CloudWatch agent',
    color: '#DD344C',
    dependsOn: [] as string[],
  },
];

// ─────────────────────────────────────────────────────────────
// CONFIG COMPONENTS — one per service that needs config
// ─────────────────────────────────────────────────────────────

const VpcConfig = ({ config, onChange, classes, environment }: any) => (
  <Box>
    <TextField
      className={classes.configField}
      label="VPC CIDR Block"
      value={config.vpc_cidr ?? '10.0.0.0/16'}
      onChange={e => onChange({ ...config, vpc_cidr: e.target.value })}
      variant="outlined"
      size="small"
      helperText="Example: 10.0.0.0/16"
    />
    {environment === 'prod' && (
      <Box className={classes.prodWarning}>
        ⚠️ Production VPC — NAT Gateway will be automatically enabled (additional AWS cost applies)
      </Box>
    )}
  </Box>
);

const SubnetsConfig = ({ config, onChange, classes }: any) => (
  <Box>
    <TextField
      className={classes.configField}
      label="Public Subnet CIDRs"
      value={config.public_subnet_cidrs ?? '10.0.1.0/24,10.0.2.0/24'}
      onChange={e => onChange({ ...config, public_subnet_cidrs: e.target.value })}
      variant="outlined"
      size="small"
      helperText="Comma-separated, one per AZ. Example: 10.0.1.0/24,10.0.2.0/24"
    />
    <TextField
      className={classes.configField}
      label="Private Subnet CIDRs"
      value={config.private_subnet_cidrs ?? '10.0.10.0/24,10.0.11.0/24'}
      onChange={e => onChange({ ...config, private_subnet_cidrs: e.target.value })}
      variant="outlined"
      size="small"
      helperText="Comma-separated, one per AZ. Example: 10.0.10.0/24,10.0.11.0/24"
    />
    <TextField
      className={classes.configField}
      label="Availability Zones"
      value={config.availability_zones ?? 'us-east-1a,us-east-1b'}
      onChange={e => onChange({ ...config, availability_zones: e.target.value })}
      variant="outlined"
      size="small"
      helperText="Comma-separated. Must match number of subnet CIDRs. Example: us-east-1a,us-east-1b"
    />
  </Box>
);

const SecurityGroupsConfig = ({ config, onChange, classes, environment }: any) => (
  <Box>
    <TextField
      className={classes.configField}
      label="Allowed SSH CIDRs"
      value={config.allowed_ssh_cidrs ?? ''}
      onChange={e => onChange({ ...config, allowed_ssh_cidrs: e.target.value })}
      variant="outlined"
      size="small"
      helperText="Comma-separated IP ranges. Leave empty to disable SSH. Example: 203.0.113.10/32"
      placeholder="Empty = SSH disabled"
    />
    <FormControl className={classes.configField} variant="outlined" size="small">
      <InputLabel>RDS Port</InputLabel>
      <Select
        value={config.rds_port ?? 5432}
        onChange={e => onChange({ ...config, rds_port: Number(e.target.value) })}
        label="RDS Port"
      >
        <MenuItem value={5432}>5432 — PostgreSQL</MenuItem>
        <MenuItem value={3306}>3306 — MySQL</MenuItem>
      </Select>
    </FormControl>
    {environment === 'prod' && config.allowed_ssh_cidrs && (
      <Box className={classes.prodWarning}>
        ⚠️ SSH is enabled in production — ensure these IPs are VPN or office ranges only
      </Box>
    )}
  </Box>
);

const Ec2Config = ({ config, onChange, classes, environment }: any) => {
  const instanceOptions = environment === 'prod'
    ? ['t3.medium', 't3.large', 'm5.large', 'm5.xlarge']
    : ['t3.micro', 't3.small', 't3.medium'];

  return (
    <FormControl className={classes.configField} variant="outlined" size="small">
      <InputLabel>Instance Type</InputLabel>
      <Select
        value={config.ec2_instance_type ?? instanceOptions[0]}
        onChange={e => onChange({ ...config, ec2_instance_type: e.target.value as string })}
        label="Instance Type"
      >
        {instanceOptions.map(t => (
          <MenuItem key={t} value={t}>{t}</MenuItem>
        ))}
      </Select>
    </FormControl>
  );
};

const S3Config = ({ config, onChange }: any) => (
  <FormControlLabel
    control={
      <Checkbox
        checked={config.s3_versioning ?? false}
        onChange={e => onChange({ ...config, s3_versioning: e.target.checked })}
        color="primary"
      />
    }
    label="Enable S3 Versioning (recommended for prod)"
  />
);

const RdsConfig = ({ config, onChange, classes }: any) => (
  <FormControl className={classes.configField} variant="outlined" size="small">
    <InputLabel>Database Engine</InputLabel>
    <Select
      value={config.rds_engine ?? 'postgres'}
      onChange={e => onChange({ ...config, rds_engine: e.target.value as string })}
      label="Database Engine"
    >
      <MenuItem value="postgres">PostgreSQL</MenuItem>
      <MenuItem value="mysql">MySQL</MenuItem>
    </Select>
  </FormControl>
);

// ─────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────

export const AwsResourcePicker = ({
  onChange,
  rawErrors,
  required,
  formData,
  uiSchema,
}: FieldExtensionComponentProps<AwsResourcePickerValue>) => {
  const classes = useStyles();

  // Environment passed from template.yaml via ui:options
  const environment = (uiSchema?.['ui:options']?.environment as string) ?? 'dev';

  const [selected, setSelected] = useState<SelectedResources>(
    formData?.resources
      ? {
          vpc:             formData.resources.includes('vpc'),
          subnets:         formData.resources.includes('subnets'),
          security_groups: formData.resources.includes('security_groups'),
          ec2:             formData.resources.includes('ec2'),
          s3:              formData.resources.includes('s3'),
          rds:             formData.resources.includes('rds'),
          iam:             formData.resources.includes('iam'),
        }
      : {
          vpc: false, subnets: false, security_groups: false,
          ec2: false, s3: false, rds: false, iam: false,
        },
  );

  const [config, setConfig] = useState<ResourceConfig>(
    formData?.config ?? {
      vpc_cidr:             '10.0.0.0/16',
      public_subnet_cidrs:  '10.0.1.0/24,10.0.2.0/24',
      private_subnet_cidrs: '10.0.10.0/24,10.0.11.0/24',
      availability_zones:   'us-east-1a,us-east-1b',
      allowed_ssh_cidrs:    '',
      rds_port:             5432,
      ec2_instance_type:    't3.micro',
      s3_versioning:        false,
      rds_engine:           'postgres',
    },
  );

  const buildResourcesString = useCallback((sel: SelectedResources): string => {
    return SERVICE_DEFINITIONS
      .filter(s => sel[s.id as keyof SelectedResources])
      .map(s => s.id)
      .join('_') || '';
  }, []);

  // Auto-select dependencies when enabling a service
  const handleToggle = (serviceId: string) => {
    const service = SERVICE_DEFINITIONS.find(s => s.id === serviceId);
    const isCurrentlySelected = selected[serviceId as keyof SelectedResources];
    let updated = { ...selected, [serviceId]: !isCurrentlySelected };

    if (!isCurrentlySelected && service?.dependsOn) {
      service.dependsOn.forEach(dep => {
        updated = { ...updated, [dep]: true };
      });
    }

    setSelected(updated);
    onChange({ resources: buildResourcesString(updated), config });
  };

  const handleConfigChange = (newConfig: ResourceConfig) => {
    setConfig(newConfig);
    onChange({ resources: buildResourcesString(selected), config: newConfig });
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
                {service.dependsOn.length > 0 && (
                  <span className={classes.dependencyNote}>
                    requires: {service.dependsOn.join(', ')}
                  </span>
                )}
                {environment === 'prod' && service.id === 'rds' && (
                  <Chip label="Multi-AZ auto-enabled in prod" className={classes.warnChip} size="small" />
                )}
              </Box>
            </Box>

            <Collapse in={isSelected} timeout="auto" unmountOnExit>
              <Box className={classes.configArea}>
                {service.id === 'vpc' && (
                  <VpcConfig config={config} onChange={handleConfigChange} classes={classes} environment={environment} />
                )}
                {service.id === 'subnets' && (
                  <SubnetsConfig config={config} onChange={handleConfigChange} classes={classes} />
                )}
                {service.id === 'security_groups' && (
                  <SecurityGroupsConfig config={config} onChange={handleConfigChange} classes={classes} environment={environment} />
                )}
                {service.id === 'ec2' && (
                  <Ec2Config config={config} onChange={handleConfigChange} classes={classes} environment={environment} />
                )}
                {service.id === 's3' && (
                  <S3Config config={config} onChange={handleConfigChange} />
                )}
                {service.id === 'rds' && (
                  <RdsConfig config={config} onChange={handleConfigChange} classes={classes} />
                )}
                {service.id === 'iam' && (
                  <Typography variant="body2" color="textSecondary">
                    Creates an EC2 instance profile with SSM Session Manager and CloudWatch Agent access.
                    S3 bucket access is automatically granted if S3 is also selected.
                  </Typography>
                )}
              </Box>
            </Collapse>
          </Box>
        );
      })}

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