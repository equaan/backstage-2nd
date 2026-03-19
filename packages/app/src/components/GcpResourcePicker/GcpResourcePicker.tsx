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

interface GcpFoundation {
  project_id: string;
  region: string;
  zone: string;
  // ADC auth — no credentials in form
  // Engineer runs: gcloud auth application-default login
  adc_confirmed: boolean;
}

interface GcpResourceConfig {
  // VPC
  public_subnet_cidr?: string;
  private_subnet_cidr?: string;
  enable_cloud_nat?: boolean;
  // Firewall
  allowed_ssh_source_ranges?: string;
  db_port?: number;
  // GCE
  machine_type?: string;
  boot_disk_type?: string;
  // GCS
  bucket_suffix?: string;
  storage_class?: string;
  enable_versioning?: boolean;
  // Cloud SQL
  db_engine?: string;
  db_version?: string;
  tier?: string;
  availability_type?: string;
}

interface SelectedResources {
  vpc: boolean;
  firewall: boolean;
  gce: boolean;
  gcs: boolean;
  cloud_sql: boolean;
}

export interface GcpResourcePickerValue {
  foundation: GcpFoundation;
  resources: string;
  config: GcpResourceConfig;
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
  adcBox: {
    marginTop: theme.spacing(1.5),
    padding: theme.spacing(1.5),
    borderRadius: theme.shape.borderRadius,
    backgroundColor: 'rgba(52, 168, 83, 0.08)',
    border: '1px solid rgba(52, 168, 83, 0.3)',
    fontSize: '0.8rem',
    color: theme.palette.text.secondary,
  },
  adcConfirmed: {
    color: '#34a853',
    fontWeight: 700,
  },
  adcMissing: {
    color: '#ea4335',
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
  tagNote: {
    marginTop: theme.spacing(1),
    padding: theme.spacing(1),
    borderRadius: theme.shape.borderRadius,
    backgroundColor: 'rgba(66, 133, 244, 0.08)',
    border: '1px solid rgba(66, 133, 244, 0.3)',
    fontSize: '0.75rem',
    color: '#4285f4',
  },
}));

// ─────────────────────────────────────────────────────────────
// GCP REGIONS + ZONES
// ─────────────────────────────────────────────────────────────

const GCP_REGIONS = [
  { value: 'us-central1',      label: 'US Central (Iowa)',        zones: ['us-central1-a', 'us-central1-b', 'us-central1-c'] },
  { value: 'us-east1',         label: 'US East (S. Carolina)',     zones: ['us-east1-b', 'us-east1-c', 'us-east1-d'] },
  { value: 'us-west1',         label: 'US West (Oregon)',          zones: ['us-west1-a', 'us-west1-b', 'us-west1-c'] },
  { value: 'europe-west1',     label: 'Europe West (Belgium)',     zones: ['europe-west1-b', 'europe-west1-c', 'europe-west1-d'] },
  { value: 'europe-west2',     label: 'Europe West (London)',      zones: ['europe-west2-a', 'europe-west2-b', 'europe-west2-c'] },
  { value: 'asia-southeast1',  label: 'Asia Southeast (Singapore)',zones: ['asia-southeast1-a', 'asia-southeast1-b', 'asia-southeast1-c'] },
  { value: 'asia-south1',      label: 'Asia South (Mumbai)',       zones: ['asia-south1-a', 'asia-south1-b', 'asia-south1-c'] },
  { value: 'australia-southeast1', label: 'Australia (Sydney)',    zones: ['australia-southeast1-a', 'australia-southeast1-b', 'australia-southeast1-c'] },
];

// ─────────────────────────────────────────────────────────────
// SERVICE DEFINITIONS
// ─────────────────────────────────────────────────────────────

const SERVICE_DEFINITIONS = [
  {
    id: 'vpc',
    label: 'VPC',
    description: 'Global VPC with regional public and private subnets',
    color: '#4285F4',
    dependsOn: [] as string[],
  },
  {
    id: 'firewall',
    label: 'Firewall',
    description: 'VPC-level firewall rules using network tags to target VMs',
    color: '#EA4335',
    dependsOn: ['vpc'],
  },
  {
    id: 'gce',
    label: 'Compute Engine',
    description: 'GCE VM with Shielded VM, network tags, and optional public IP',
    color: '#FBBC05',
    dependsOn: ['vpc', 'firewall'],
  },
  {
    id: 'gcs',
    label: 'Cloud Storage',
    description: 'GCS bucket with public access blocked and uniform access control',
    color: '#34A853',
    dependsOn: [] as string[],
  },
  {
    id: 'cloud_sql',
    label: 'Cloud SQL',
    description: 'Cloud SQL instance (PostgreSQL or MySQL) with private IP',
    color: '#4285F4',
    dependsOn: ['vpc'],
  },
];

// ─────────────────────────────────────────────────────────────
// CONFIG COMPONENTS
// ─────────────────────────────────────────────────────────────

const VpcConfig = ({ config, onChange, classes, environment }: any) => (
  <Box>
    <TextField
      className={classes.configField}
      label="Public Subnet CIDR"
      value={config.public_subnet_cidr ?? '10.0.1.0/24'}
      onChange={e => onChange({ ...config, public_subnet_cidr: e.target.value })}
      variant="outlined"
      size="small"
      helperText="Example: 10.0.1.0/24"
    />
    <TextField
      className={classes.configField}
      label="Private Subnet CIDR"
      value={config.private_subnet_cidr ?? '10.0.10.0/24'}
      onChange={e => onChange({ ...config, private_subnet_cidr: e.target.value })}
      variant="outlined"
      size="small"
      helperText="Example: 10.0.10.0/24"
    />
    <FormControlLabel
      control={
        <Checkbox
          checked={config.enable_cloud_nat ?? environment === 'prod'}
          onChange={e => onChange({ ...config, enable_cloud_nat: e.target.checked })}
          color="primary"
        />
      }
      label="Enable Cloud NAT (required for private VM internet egress)"
    />
    {environment === 'prod' && (
      <Box className={classes.prodWarning}>
        ⚠️ Production — Cloud NAT is recommended and auto-enabled
      </Box>
    )}
  </Box>
);

const FirewallConfig = ({ config, onChange, classes, environment }: any) => (
  <Box>
    <Box className={classes.tagNote}>
      ℹ️ GCP firewall rules use network tags — VMs only receive rules if they have the matching tag.
      Tags are applied automatically when you select Compute Engine.
    </Box>
    <TextField
      className={classes.configField}
      label="Allowed SSH Source IPs"
      value={config.allowed_ssh_source_ranges ?? ''}
      onChange={e => onChange({ ...config, allowed_ssh_source_ranges: e.target.value })}
      variant="outlined"
      size="small"
      helperText="Comma-separated. Leave empty to disable SSH. Example: 203.0.113.10/32"
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
      </Select>
    </FormControl>
    {environment === 'prod' && config.allowed_ssh_source_ranges && (
      <Box className={classes.prodWarning}>
        ⚠️ SSH enabled in production — ensure IPs are VPN or office ranges only
      </Box>
    )}
  </Box>
);

const GceConfig = ({ config, onChange, classes, environment }: any) => {
  const machineTypes = environment === 'prod'
    ? ['n2-standard-2', 'n2-standard-4', 'e2-standard-2']
    : ['e2-medium', 'e2-standard-2', 'n2-standard-2'];

  return (
    <Box>
      <FormControl className={classes.configField} variant="outlined" size="small">
        <InputLabel>Machine Type</InputLabel>
        <Select
          value={config.machine_type ?? machineTypes[0]}
          onChange={e => onChange({ ...config, machine_type: e.target.value as string })}
          label="Machine Type"
        >
          {machineTypes.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
        </Select>
      </FormControl>
      <FormControl className={classes.configField} variant="outlined" size="small">
        <InputLabel>Boot Disk Type</InputLabel>
        <Select
          value={config.boot_disk_type ?? (environment === 'prod' ? 'pd-ssd' : 'pd-standard')}
          onChange={e => onChange({ ...config, boot_disk_type: e.target.value as string })}
          label="Boot Disk Type"
        >
          <MenuItem value="pd-standard">pd-standard — HDD (dev)</MenuItem>
          <MenuItem value="pd-balanced">pd-balanced — Balanced SSD</MenuItem>
          <MenuItem value="pd-ssd">pd-ssd — SSD (prod)</MenuItem>
        </Select>
      </FormControl>
    </Box>
  );
};

const GcsConfig = ({ config, onChange, classes, environment }: any) => (
  <Box>
    <TextField
      className={classes.configField}
      label="Bucket Suffix"
      value={config.bucket_suffix ?? 'storage'}
      onChange={e => onChange({ ...config, bucket_suffix: e.target.value })}
      variant="outlined"
      size="small"
      helperText="Lowercase alphanumeric and hyphens. Example: assets, backups, uploads"
    />
    <FormControl className={classes.configField} variant="outlined" size="small">
      <InputLabel>Storage Class</InputLabel>
      <Select
        value={config.storage_class ?? 'STANDARD'}
        onChange={e => onChange({ ...config, storage_class: e.target.value as string })}
        label="Storage Class"
      >
        <MenuItem value="STANDARD">STANDARD — Frequent access</MenuItem>
        <MenuItem value="NEARLINE">NEARLINE — Monthly access</MenuItem>
        <MenuItem value="COLDLINE">COLDLINE — Quarterly access</MenuItem>
        <MenuItem value="ARCHIVE">ARCHIVE — Yearly access</MenuItem>
      </Select>
    </FormControl>
    <FormControlLabel
      control={
        <Checkbox
          checked={config.enable_versioning ?? false}
          onChange={e => onChange({ ...config, enable_versioning: e.target.checked })}
          color="primary"
        />
      }
      label="Enable Object Versioning (recommended for prod)"
    />
  </Box>
);

const CloudSqlConfig = ({ config, onChange, classes, environment }: any) => {
  const tiers = environment === 'prod'
    ? ['db-n1-standard-2', 'db-n1-standard-4', 'db-custom-2-7680']
    : ['db-f1-micro', 'db-g1-small', 'db-n1-standard-1'];

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
        value={config.db_version ?? 'POSTGRES_15'}
        onChange={e => onChange({ ...config, db_version: e.target.value })}
        variant="outlined"
        size="small"
        helperText="PostgreSQL: POSTGRES_14, POSTGRES_15 — MySQL: MYSQL_8_0"
      />
      <FormControl className={classes.configField} variant="outlined" size="small">
        <InputLabel>Machine Tier</InputLabel>
        <Select
          value={config.tier ?? tiers[0]}
          onChange={e => onChange({ ...config, tier: e.target.value as string })}
          label="Machine Tier"
        >
          {tiers.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
        </Select>
      </FormControl>
      <FormControl className={classes.configField} variant="outlined" size="small">
        <InputLabel>Availability Type</InputLabel>
        <Select
          value={config.availability_type ?? (environment === 'prod' ? 'REGIONAL' : 'ZONAL')}
          onChange={e => onChange({ ...config, availability_type: e.target.value as string })}
          label="Availability Type"
        >
          <MenuItem value="ZONAL">ZONAL — Single zone (dev/staging)</MenuItem>
          <MenuItem value="REGIONAL">REGIONAL — Multi-zone HA (prod)</MenuItem>
        </Select>
      </FormControl>
      {environment === 'prod' && (
        <Box className={classes.prodWarning}>
          ⚠️ Production — REGIONAL availability type is recommended for HA
        </Box>
      )}
    </Box>
  );
};

// ─────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────

export const GcpResourcePicker = ({
  onChange,
  rawErrors,
  required,
  formData,
  uiSchema,
}: FieldExtensionComponentProps<GcpResourcePickerValue>) => {
  const classes = useStyles();
  const environment = (uiSchema?.['ui:options']?.environment as string) ?? 'dev';

  const defaultRegion = GCP_REGIONS[0];

  const [foundation, setFoundation] = useState<GcpFoundation>(
    formData?.foundation ?? {
      project_id:    '',
      region:        defaultRegion.value,
      zone:          defaultRegion.zones[0],
      adc_confirmed: false,
    },
  );

  const [selected, setSelected] = useState<SelectedResources>(
    formData?.resources
      ? {
          vpc:       formData.resources.includes('vpc'),
          firewall:  formData.resources.includes('firewall'),
          gce:       formData.resources.includes('gce'),
          gcs:       formData.resources.includes('gcs'),
          cloud_sql: formData.resources.includes('cloud_sql'),
        }
      : { vpc: false, firewall: false, gce: false, gcs: false, cloud_sql: false },
  );

  const [config, setConfig] = useState<GcpResourceConfig>(
    formData?.config ?? {
      public_subnet_cidr:    '10.0.1.0/24',
      private_subnet_cidr:   '10.0.10.0/24',
      enable_cloud_nat:      environment === 'prod',
      allowed_ssh_source_ranges: '',
      db_port:               5432,
      machine_type:          environment === 'prod' ? 'n2-standard-2' : 'e2-medium',
      boot_disk_type:        environment === 'prod' ? 'pd-ssd' : 'pd-standard',
      bucket_suffix:         'storage',
      storage_class:         'STANDARD',
      enable_versioning:     false,
      db_engine:             'postgres',
      db_version:            'POSTGRES_15',
      tier:                  environment === 'prod' ? 'db-n1-standard-2' : 'db-f1-micro',
      availability_type:     environment === 'prod' ? 'REGIONAL' : 'ZONAL',
    },
  );

  const buildResourcesString = useCallback((sel: SelectedResources): string => {
    return SERVICE_DEFINITIONS
      .filter(s => sel[s.id as keyof SelectedResources])
      .map(s => s.id)
      .join('_') || '';
  }, []);

  const handleFoundationChange = (newFoundation: GcpFoundation) => {
    setFoundation(newFoundation);
    onChange({ foundation: newFoundation, resources: buildResourcesString(selected), config });
  };

  const handleRegionChange = (newRegion: string) => {
    const regionData = GCP_REGIONS.find(r => r.value === newRegion);
    const newZone = regionData?.zones[0] ?? `${newRegion}-a`;
    handleFoundationChange({ ...foundation, region: newRegion, zone: newZone });
  };

  const handleToggle = (serviceId: string) => {
    const service = SERVICE_DEFINITIONS.find(s => s.id === serviceId);
    const isSelected = selected[serviceId as keyof SelectedResources];
    let updated = { ...selected, [serviceId]: !isSelected };

    if (!isSelected && service?.dependsOn) {
      service.dependsOn.forEach(dep => {
        updated = { ...updated, [dep]: true };
      });
    }

    setSelected(updated);
    onChange({ foundation, resources: buildResourcesString(updated), config });
  };

  const handleConfigChange = (newConfig: GcpResourceConfig) => {
    setConfig(newConfig);
    onChange({ foundation, resources: buildResourcesString(selected), config: newConfig });
  };

  const selectedRegion = GCP_REGIONS.find(r => r.value === foundation.region) ?? defaultRegion;
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
        GCP Foundation
      </Typography>

      <Box className={classes.foundationBox}>

        {/* ADC confirmation */}
        <Box className={classes.adcBox}>
          <Typography variant="caption" display="block" gutterBottom>
            Authentication: Application Default Credentials (ADC)
          </Typography>
          <Typography variant="body2" gutterBottom>
            Run this once before applying Terraform:
          </Typography>
          <Typography variant="body2" style={{ fontFamily: 'monospace', fontWeight: 700 }}>
            gcloud auth application-default login
          </Typography>
          <FormControlLabel
            style={{ marginTop: 8 }}
            control={
              <Checkbox
                checked={foundation.adc_confirmed}
                onChange={e => handleFoundationChange({ ...foundation, adc_confirmed: e.target.checked })}
                color="primary"
                size="small"
              />
            }
            label={
              <span className={foundation.adc_confirmed ? classes.adcConfirmed : classes.adcMissing}>
                {foundation.adc_confirmed
                  ? '✅ Confirmed — ADC is configured'
                  : '☐ Confirm gcloud auth application-default login has been run'}
              </span>
            }
          />
        </Box>

        {/* Project ID */}
        <TextField
          className={classes.foundationField}
          label="GCP Project ID"
          value={foundation.project_id}
          onChange={e => handleFoundationChange({ ...foundation, project_id: e.target.value })}
          variant="outlined"
          size="small"
          helperText="The existing GCP project to deploy into. Find in GCP Console. Example: acme-corp-prod-123456"
          required
        />

        {/* Region */}
        <FormControl className={classes.foundationField} variant="outlined" size="small">
          <InputLabel>Region</InputLabel>
          <Select
            value={foundation.region}
            onChange={e => handleRegionChange(e.target.value as string)}
            label="Region"
          >
            {GCP_REGIONS.map(r => (
              <MenuItem key={r.value} value={r.value}>{r.label} ({r.value})</MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* Zone — auto-updates when region changes */}
        <FormControl className={classes.foundationField} variant="outlined" size="small">
          <InputLabel>Zone</InputLabel>
          <Select
            value={foundation.zone}
            onChange={e => handleFoundationChange({ ...foundation, zone: e.target.value as string })}
            label="Zone"
          >
            {selectedRegion.zones.map(z => (
              <MenuItem key={z} value={z}>{z}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      <Divider />

      {/* ── RESOURCES ──────────────────────────────── */}
      <Typography variant="subtitle2" className={classes.sectionTitle}>
        Select GCP Resources
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
                {environment === 'prod' && service.id === 'cloud_sql' && (
                  <Chip label="REGIONAL HA auto-set in prod" className={classes.warnChip} size="small" />
                )}
              </Box>
            </Box>

            <Collapse in={isSelected} timeout="auto" unmountOnExit>
              <Box className={classes.configArea}>
                {service.id === 'vpc' && (
                  <VpcConfig config={config} onChange={handleConfigChange} classes={classes} environment={environment} />
                )}
                {service.id === 'firewall' && (
                  <FirewallConfig config={config} onChange={handleConfigChange} classes={classes} environment={environment} />
                )}
                {service.id === 'gce' && (
                  <GceConfig config={config} onChange={handleConfigChange} classes={classes} environment={environment} />
                )}
                {service.id === 'gcs' && (
                  <GcsConfig config={config} onChange={handleConfigChange} classes={classes} environment={environment} />
                )}
                {service.id === 'cloud_sql' && (
                  <CloudSqlConfig config={config} onChange={handleConfigChange} classes={classes} environment={environment} />
                )}
              </Box>
            </Collapse>
          </Box>
        );
      })}

      {/* ── SUMMARY ────────────────────────────────── */}
      <Box className={classes.summaryBox}>
        <Typography variant="caption" display="block" gutterBottom>
          Project: {foundation.project_id || '(not set)'} — Region: {foundation.region} — Zone: {foundation.zone}
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