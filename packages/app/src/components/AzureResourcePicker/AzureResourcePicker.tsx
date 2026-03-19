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
import Divider from '@material-ui/core/Divider';
import { makeStyles } from '@material-ui/core/styles';

// ─────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────

interface AzureFoundation {
  location: string;
  resource_group_suffix: string;
  // subscription_id comes from env var ARM_SUBSCRIPTION_ID
  // confirmed present but not stored in form state
  subscription_id_confirmed: boolean;
}

interface AzureResourceConfig {
  // VNet
  vnet_address_space?: string;
  public_subnet_prefixes?: string;
  private_subnet_prefixes?: string;
  enable_nat_gateway?: boolean;
  // NSG
  allowed_ssh_source_prefixes?: string;
  db_port?: number;
  // VM
  vm_size?: string;
  admin_username?: string;
  // Blob Storage
  storage_suffix?: string;
  account_replication_type?: string;
  container_names?: string;
  // SQL
  db_engine?: string;
  db_version?: string;
  sku_name?: string;
  high_availability_mode?: string;
}

interface SelectedResources {
  vnet: boolean;
  nsg: boolean;
  vm: boolean;
  blob: boolean;
  sql: boolean;
}

export interface AzureResourcePickerValue {
  foundation: AzureFoundation;
  resources: string;
  config: AzureResourceConfig;
}

// ─────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────

const useStyles = makeStyles(theme => ({
  root: {
    width: '100%',
    marginTop: theme.spacing(1),
  },
  sectionTitle: {
    fontWeight: 600,
    color: theme.palette.text.primary,
    marginBottom: theme.spacing(1.5),
    marginTop: theme.spacing(2),
  },
  foundationBox: {
    padding: theme.spacing(2),
    border: `1px solid ${theme.palette.primary.main}`,
    borderRadius: theme.shape.borderRadius,
    backgroundColor: theme.palette.action.selected,
    marginBottom: theme.spacing(2),
  },
  foundationField: {
    marginTop: theme.spacing(1.5),
    width: '100%',
    maxWidth: 420,
  },
  envVarBox: {
    marginTop: theme.spacing(1.5),
    padding: theme.spacing(1.5),
    borderRadius: theme.shape.borderRadius,
    backgroundColor: 'rgba(33, 150, 243, 0.08)',
    border: '1px solid rgba(33, 150, 243, 0.3)',
    fontSize: '0.8rem',
    color: theme.palette.text.secondary,
    fontFamily: 'monospace',
  },
  envVarSet: {
    color: '#4caf50',
    fontWeight: 700,
  },
  envVarMissing: {
    color: '#f44336',
    fontWeight: 700,
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
// AZURE LOCATIONS
// ─────────────────────────────────────────────────────────────

const AZURE_LOCATIONS = [
  { value: 'eastus',        label: 'East US' },
  { value: 'westus2',       label: 'West US 2' },
  { value: 'westeurope',    label: 'West Europe' },
  { value: 'northeurope',   label: 'North Europe' },
  { value: 'southeastasia', label: 'Southeast Asia' },
  { value: 'uksouth',       label: 'UK South' },
  { value: 'australiaeast', label: 'Australia East' },
  { value: 'centralindia',  label: 'Central India' },
];

// ─────────────────────────────────────────────────────────────
// SERVICE DEFINITIONS
// To add a new service: add entry here + config component below
// ─────────────────────────────────────────────────────────────

const SERVICE_DEFINITIONS = [
  {
    id: 'vnet',
    label: 'VNet',
    description: 'Virtual Network — networking foundation with public and private subnets',
    color: '#0078D4',
    dependsOn: [] as string[],
  },
  {
    id: 'nsg',
    label: 'NSG',
    description: 'Network Security Groups — applied to subnets for traffic control',
    color: '#005A9E',
    dependsOn: ['vnet'],
  },
  {
    id: 'vm',
    label: 'Virtual Machine',
    description: 'Linux VM with NIC, optional public IP, and encrypted OS disk',
    color: '#E74C3C',
    dependsOn: ['vnet', 'nsg'],
  },
  {
    id: 'blob',
    label: 'Blob Storage',
    description: 'Storage Account with private containers, HTTPS enforced',
    color: '#27AE60',
    dependsOn: [] as string[],
  },
  {
    id: 'sql',
    label: 'SQL Flexible',
    description: 'PostgreSQL or MySQL Flexible Server with private networking',
    color: '#8E44AD',
    dependsOn: ['vnet'],
  },
];

// ─────────────────────────────────────────────────────────────
// CONFIG COMPONENTS
// ─────────────────────────────────────────────────────────────

const VNetConfig = ({ config, onChange, classes, environment }: any) => (
  <Box>
    <TextField
      className={classes.configField}
      label="VNet Address Space"
      value={config.vnet_address_space ?? '10.0.0.0/16'}
      onChange={e => onChange({ ...config, vnet_address_space: e.target.value })}
      variant="outlined"
      size="small"
      helperText="Example: 10.0.0.0/16"
    />
    <TextField
      className={classes.configField}
      label="Public Subnet Prefixes"
      value={config.public_subnet_prefixes ?? '10.0.1.0/24,10.0.2.0/24'}
      onChange={e => onChange({ ...config, public_subnet_prefixes: e.target.value })}
      variant="outlined"
      size="small"
      helperText="Comma-separated. Example: 10.0.1.0/24,10.0.2.0/24"
    />
    <TextField
      className={classes.configField}
      label="Private Subnet Prefixes"
      value={config.private_subnet_prefixes ?? '10.0.10.0/24,10.0.11.0/24'}
      onChange={e => onChange({ ...config, private_subnet_prefixes: e.target.value })}
      variant="outlined"
      size="small"
      helperText="Comma-separated. Include an extra subnet if SQL is selected. Example: 10.0.10.0/24,10.0.11.0/24"
    />
    <FormControlLabel
      control={
        <Checkbox
          checked={config.enable_nat_gateway ?? (environment === 'prod')}
          onChange={e => onChange({ ...config, enable_nat_gateway: e.target.checked })}
          color="primary"
        />
      }
      label="Enable NAT Gateway (required for private subnet internet egress)"
    />
    {environment === 'prod' && (
      <Box className={classes.prodWarning}>
        ⚠️ Production — NAT Gateway is recommended and auto-enabled
      </Box>
    )}
  </Box>
);

const NsgConfig = ({ config, onChange, classes, environment }: any) => (
  <Box>
    <TextField
      className={classes.configField}
      label="Allowed SSH Source IPs"
      value={config.allowed_ssh_source_prefixes ?? ''}
      onChange={e => onChange({ ...config, allowed_ssh_source_prefixes: e.target.value })}
      variant="outlined"
      size="small"
      helperText="Comma-separated IP ranges. Leave empty to disable SSH. Example: 203.0.113.10/32"
      placeholder="Empty = SSH disabled"
    />
    <FormControl className={classes.configField} variant="outlined" size="small">
      <InputLabel>Database Port</InputLabel>
      <Select
        value={config.db_port ?? 5432}
        onChange={e => onChange({ ...config, db_port: Number(e.target.value) })}
        label="Database Port"
      >
        <MenuItem value={5432}>5432 — PostgreSQL</MenuItem>
        <MenuItem value={3306}>3306 — MySQL</MenuItem>
        <MenuItem value={1433}>1433 — MSSQL</MenuItem>
      </Select>
    </FormControl>
    {environment === 'prod' && config.allowed_ssh_source_prefixes && (
      <Box className={classes.prodWarning}>
        ⚠️ SSH enabled in production — ensure IPs are VPN or office ranges only
      </Box>
    )}
  </Box>
);

const VmConfig = ({ config, onChange, classes, environment }: any) => {
  const vmSizes = environment === 'prod'
    ? ['Standard_D2s_v3', 'Standard_D4s_v3', 'Standard_B2ms']
    : ['Standard_B2s', 'Standard_B2ms', 'Standard_B4ms'];

  return (
    <Box>
      <FormControl className={classes.configField} variant="outlined" size="small">
        <InputLabel>VM Size</InputLabel>
        <Select
          value={config.vm_size ?? vmSizes[0]}
          onChange={e => onChange({ ...config, vm_size: e.target.value as string })}
          label="VM Size"
        >
          {vmSizes.map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
        </Select>
      </FormControl>
      <TextField
        className={classes.configField}
        label="Admin Username"
        value={config.admin_username ?? 'azureuser'}
        onChange={e => onChange({ ...config, admin_username: e.target.value })}
        variant="outlined"
        size="small"
        helperText="Cannot be: admin, administrator, root, guest"
      />
    </Box>
  );
};

const BlobConfig = ({ config, onChange, classes, environment }: any) => (
  <Box>
    <TextField
      className={classes.configField}
      label="Storage Suffix"
      value={config.storage_suffix ?? 'store'}
      onChange={e => onChange({ ...config, storage_suffix: e.target.value })}
      variant="outlined"
      size="small"
      helperText="Lowercase alphanumeric only, max 5 chars. Example: data, app, bkp"
    />
    <FormControl className={classes.configField} variant="outlined" size="small">
      <InputLabel>Replication Type</InputLabel>
      <Select
        value={config.account_replication_type ?? (environment === 'prod' ? 'GRS' : 'LRS')}
        onChange={e => onChange({ ...config, account_replication_type: e.target.value as string })}
        label="Replication Type"
      >
        <MenuItem value="LRS">LRS — Locally Redundant (dev)</MenuItem>
        <MenuItem value="ZRS">ZRS — Zone Redundant (staging)</MenuItem>
        <MenuItem value="GRS">GRS — Geo Redundant (prod)</MenuItem>
        <MenuItem value="RAGRS">RAGRS — Read-Access Geo Redundant</MenuItem>
      </Select>
    </FormControl>
    <TextField
      className={classes.configField}
      label="Container Names"
      value={config.container_names ?? 'default'}
      onChange={e => onChange({ ...config, container_names: e.target.value })}
      variant="outlined"
      size="small"
      helperText="Comma-separated. Example: uploads,backups,exports"
    />
  </Box>
);

const SqlConfig = ({ config, onChange, classes, environment }: any) => {
  const skuOptions = environment === 'prod'
    ? ['GP_Standard_D2s_v3', 'GP_Standard_D4s_v3', 'MO_Standard_E4s_v3']
    : ['B_Standard_B1ms', 'B_Standard_B2ms'];

  return (
    <Box>
      <FormControl className={classes.configField} variant="outlined" size="small">
        <InputLabel>Database Engine</InputLabel>
        <Select
          value={config.db_engine ?? 'postgres'}
          onChange={e => onChange({ ...config, db_engine: e.target.value as string })}
          label="Database Engine"
        >
          <MenuItem value="postgres">PostgreSQL</MenuItem>
          <MenuItem value="mysql">MySQL</MenuItem>
        </Select>
      </FormControl>
      <TextField
        className={classes.configField}
        label="Engine Version"
        value={config.db_version ?? '15'}
        onChange={e => onChange({ ...config, db_version: e.target.value })}
        variant="outlined"
        size="small"
        helperText="PostgreSQL: 14, 15, 16 — MySQL: 8.0"
      />
      <FormControl className={classes.configField} variant="outlined" size="small">
        <InputLabel>Server SKU</InputLabel>
        <Select
          value={config.sku_name ?? skuOptions[0]}
          onChange={e => onChange({ ...config, sku_name: e.target.value as string })}
          label="Server SKU"
        >
          {skuOptions.map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
        </Select>
      </FormControl>
      <FormControl className={classes.configField} variant="outlined" size="small">
        <InputLabel>High Availability</InputLabel>
        <Select
          value={config.high_availability_mode ?? (environment === 'prod' ? 'ZoneRedundant' : 'Disabled')}
          onChange={e => onChange({ ...config, high_availability_mode: e.target.value as string })}
          label="High Availability"
        >
          <MenuItem value="Disabled">Disabled</MenuItem>
          <MenuItem value="SameZone">Same Zone</MenuItem>
          <MenuItem value="ZoneRedundant">Zone Redundant (recommended for prod)</MenuItem>
        </Select>
      </FormControl>
      {environment === 'prod' && (
        <Box className={classes.prodWarning}>
          ⚠️ Production SQL — Zone Redundant HA and geo-redundant backups are recommended
        </Box>
      )}
    </Box>
  );
};

// ─────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────

export const AzureResourcePicker = ({
  onChange,
  rawErrors,
  required,
  formData,
  uiSchema,
}: FieldExtensionComponentProps<AzureResourcePickerValue>) => {
  const classes = useStyles();
  const environment = (uiSchema?.['ui:options']?.environment as string) ?? 'dev';

  // Foundation state
  const [foundation, setFoundation] = useState<AzureFoundation>(
    formData?.foundation ?? {
      location: 'eastus',
      resource_group_suffix: '',
      subscription_id_confirmed: false,
    },
  );

  // Resource selection state
  const [selected, setSelected] = useState<SelectedResources>(
    formData?.resources
      ? {
          vnet: formData.resources.includes('vnet'),
          nsg:  formData.resources.includes('nsg'),
          vm:   formData.resources.includes('vm'),
          blob: formData.resources.includes('blob'),
          sql:  formData.resources.includes('sql'),
        }
      : { vnet: false, nsg: false, vm: false, blob: false, sql: false },
  );

  // Resource config state
  const [config, setConfig] = useState<AzureResourceConfig>(
    formData?.config ?? {
      vnet_address_space:          '10.0.0.0/16',
      public_subnet_prefixes:      '10.0.1.0/24,10.0.2.0/24',
      private_subnet_prefixes:     '10.0.10.0/24,10.0.11.0/24',
      enable_nat_gateway:          environment === 'prod',
      allowed_ssh_source_prefixes: '',
      db_port:                     5432,
      vm_size:                     environment === 'prod' ? 'Standard_D2s_v3' : 'Standard_B2s',
      admin_username:              'azureuser',
      storage_suffix:              'store',
      account_replication_type:    environment === 'prod' ? 'GRS' : 'LRS',
      container_names:             'default',
      db_engine:                   'postgres',
      db_version:                  '15',
      sku_name:                    environment === 'prod' ? 'GP_Standard_D2s_v3' : 'B_Standard_B1ms',
      high_availability_mode:      environment === 'prod' ? 'ZoneRedundant' : 'Disabled',
    },
  );

  const buildResourcesString = useCallback((sel: SelectedResources): string => {
    return SERVICE_DEFINITIONS
      .filter(s => sel[s.id as keyof SelectedResources])
      .map(s => s.id)
      .join('_') || '';
  }, []);

  const handleFoundationChange = (newFoundation: AzureFoundation) => {
    setFoundation(newFoundation);
    onChange({ foundation: newFoundation, resources: buildResourcesString(selected), config });
  };

  const handleToggle = (serviceId: string) => {
    const service = SERVICE_DEFINITIONS.find(s => s.id === serviceId);
    const isSelected = selected[serviceId as keyof SelectedResources];
    let updated = { ...selected, [serviceId]: !isSelected };

    // Auto-select dependencies
    if (!isSelected && service?.dependsOn) {
      service.dependsOn.forEach(dep => {
        updated = { ...updated, [dep]: true };
      });
    }

    setSelected(updated);
    onChange({ foundation, resources: buildResourcesString(updated), config });
  };

  const handleConfigChange = (newConfig: AzureResourceConfig) => {
    setConfig(newConfig);
    onChange({ foundation, resources: buildResourcesString(selected), config: newConfig });
  };

  const selectedCount = Object.values(selected).filter(Boolean).length;
  const resourcesString = buildResourcesString(selected);

  return (
    <FormControl
      className={classes.root}
      required={required}
      error={rawErrors?.length > 0}
    >

      {/* ── FOUNDATION ─────────────────────────────── */}
      <Typography variant="subtitle2" className={classes.sectionTitle}>
        Azure Foundation
      </Typography>

      <Box className={classes.foundationBox}>
        {/* Subscription ID — env var confirmation */}
        <Box className={classes.envVarBox}>
          <Typography variant="caption" display="block" gutterBottom>
            Subscription ID source:
          </Typography>
          <Typography variant="body2">
            Set <strong>ARM_SUBSCRIPTION_ID</strong> as an environment variable before running Terraform.
          </Typography>
          <FormControlLabel
            control={
              <Checkbox
                checked={foundation.subscription_id_confirmed}
                onChange={e => handleFoundationChange({ ...foundation, subscription_id_confirmed: e.target.checked })}
                color="primary"
                size="small"
              />
            }
            label={
              <span className={foundation.subscription_id_confirmed ? classes.envVarSet : classes.envVarMissing}>
                {foundation.subscription_id_confirmed
                  ? '✅ Confirmed — ARM_SUBSCRIPTION_ID is set'
                  : '☐ Confirm ARM_SUBSCRIPTION_ID is set in your environment'}
              </span>
            }
          />
        </Box>

        {/* Location */}
        <FormControl className={classes.foundationField} variant="outlined" size="small">
          <InputLabel>Azure Location</InputLabel>
          <Select
            value={foundation.location}
            onChange={e => handleFoundationChange({ ...foundation, location: e.target.value as string })}
            label="Azure Location"
          >
            {AZURE_LOCATIONS.map(l => (
              <MenuItem key={l.value} value={l.value}>{l.label} ({l.value})</MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* Resource Group Suffix */}
        <TextField
          className={classes.foundationField}
          label="Resource Group Suffix (optional)"
          value={foundation.resource_group_suffix}
          onChange={e => handleFoundationChange({ ...foundation, resource_group_suffix: e.target.value })}
          variant="outlined"
          size="small"
          helperText="Leave empty for default: {client}-{env}-rg. Example: networking, app"
          placeholder="Leave empty for default"
        />
      </Box>

      <Divider />

      {/* ── RESOURCES ──────────────────────────────── */}
      <Typography variant="subtitle2" className={classes.sectionTitle}>
        Select Azure Resources
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
                <span className={classes.serviceBadge} style={{ backgroundColor: service.color }}>
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
                {environment === 'prod' && service.id === 'sql' && (
                  <Chip label="Zone Redundant HA auto-set in prod" className={classes.warnChip} size="small" />
                )}
              </Box>
            </Box>

            <Collapse in={isSelected} timeout="auto" unmountOnExit>
              <Box className={classes.configArea}>
                {service.id === 'vnet' && (
                  <VNetConfig config={config} onChange={handleConfigChange} classes={classes} environment={environment} />
                )}
                {service.id === 'nsg' && (
                  <NsgConfig config={config} onChange={handleConfigChange} classes={classes} environment={environment} />
                )}
                {service.id === 'vm' && (
                  <VmConfig config={config} onChange={handleConfigChange} classes={classes} environment={environment} />
                )}
                {service.id === 'blob' && (
                  <BlobConfig config={config} onChange={handleConfigChange} classes={classes} environment={environment} />
                )}
                {service.id === 'sql' && (
                  <SqlConfig config={config} onChange={handleConfigChange} classes={classes} environment={environment} />
                )}
              </Box>
            </Collapse>
          </Box>
        );
      })}

      {/* ── SUMMARY ────────────────────────────────── */}
      <Box className={classes.summaryBox}>
        <Typography variant="caption" display="block" gutterBottom>
          Foundation: {foundation.location} — Resource Group: {foundation.resource_group_suffix || 'default'}
        </Typography>
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