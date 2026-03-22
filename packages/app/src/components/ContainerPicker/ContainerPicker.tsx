// eslint-disable-next-line @typescript-eslint/no-unused-vars
import React, { useState } from 'react';
import { FieldExtensionComponentProps } from '@backstage/plugin-scaffolder-react';
import { makeStyles } from '@material-ui/core/styles';
import FormHelperText from '@material-ui/core/FormHelperText';
import FormControl from '@material-ui/core/FormControl';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import Checkbox from '@material-ui/core/Checkbox';
import Typography from '@material-ui/core/Typography';
import TextField from '@material-ui/core/TextField';
import Select from '@material-ui/core/Select';
import MenuItem from '@material-ui/core/MenuItem';
import InputLabel from '@material-ui/core/InputLabel';
import Box from '@material-ui/core/Box';

// ─────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────

export interface ContainerConfig {
  // App
  language: string;
  runtime_version: string;
  app_port: number;
  health_check_path: string;
  // Docker Compose
  include_docker_compose: boolean;
  include_database: boolean;
  db_engine: string;
  db_name: string;
  db_user: string;
  include_redis: boolean;
  // Kubernetes
  include_kubernetes: boolean;
  k8s_namespace: string;
  container_registry: string;
  domain: string;
  initial_replicas: number;
  min_replicas: number;
  max_replicas: number;
  cpu_request: string;
  memory_request: string;
  cpu_limit: string;
  memory_limit: string;
  cpu_target_utilization: number;
  // Helm
  include_helm: boolean;
}

export interface ContainerPickerValue {
  config: ContainerConfig;
}

// ─────────────────────────────────────────────────────────────
// RUNTIME VERSIONS PER LANGUAGE
// ─────────────────────────────────────────────────────────────

const RUNTIME_VERSIONS: Record<string, string[]> = {
  nodejs: ['20', '22', '18'],
  python: ['3.12', '3.11', '3.10'],
  java:   ['21', '17', '11'],
  go:     ['1.22', '1.21', '1.20'],
};

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
    marginBottom: theme.spacing(1),
    marginTop: theme.spacing(2),
    display: 'block',
  },
  sectionBox: {
    padding: theme.spacing(2),
    border: `1px solid ${theme.palette.divider}`,
    borderRadius: theme.shape.borderRadius,
    marginBottom: theme.spacing(2),
  },
  sectionBoxSelected: {
    padding: theme.spacing(2),
    border: `1px solid ${theme.palette.primary.main}`,
    borderRadius: theme.shape.borderRadius,
    marginBottom: theme.spacing(2),
    backgroundColor: theme.palette.action.selected,
  },
  field: {
    marginTop: theme.spacing(1.5),
    width: '100%',
    maxWidth: 420,
  },
  fieldHalf: {
    marginTop: theme.spacing(1.5),
    width: '100%',
    maxWidth: 200,
  },
  row: {
    display: 'flex',
    gap: theme.spacing(2),
    flexWrap: 'wrap' as const,
  },
  infoBox: {
    marginTop: theme.spacing(1),
    padding: theme.spacing(1),
    borderRadius: theme.shape.borderRadius,
    backgroundColor: 'rgba(66,133,244,0.08)',
    border: '1px solid rgba(66,133,244,0.3)',
    fontSize: '0.75rem',
    color: theme.palette.text.secondary,
  },
  warnBox: {
    marginTop: theme.spacing(1),
    padding: theme.spacing(1),
    borderRadius: theme.shape.borderRadius,
    backgroundColor: 'rgba(245,124,0,0.08)',
    border: '1px solid rgba(245,124,0,0.3)',
    fontSize: '0.75rem',
    color: '#f57c00',
  },
  summaryBox: {
    marginTop: theme.spacing(2),
    padding: theme.spacing(1.5),
    borderRadius: theme.shape.borderRadius,
    border: `1px dashed ${theme.palette.divider}`,
    backgroundColor: theme.palette.action.hover,
  },
  summaryText: {
    fontFamily: 'monospace',
    fontSize: '0.8rem',
    color: theme.palette.text.secondary,
    display: 'block',
  },
  toolHeader: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: theme.spacing(1),
  },
  badge: {
    fontSize: '0.65rem',
    fontWeight: 700,
    padding: '2px 8px',
    borderRadius: 4,
    textTransform: 'uppercase' as const,
    color: '#fff',
    marginRight: 8,
  },
}));

// ─────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────

export const ContainerPicker = ({
  onChange,
  rawErrors,
  formData,
  uiSchema,
}: FieldExtensionComponentProps<ContainerPickerValue>) => {
  const classes = useStyles();
  const environment = (uiSchema?.['ui:options']?.environment as string) ?? 'dev';

  const [config, setConfig] = useState<ContainerConfig>(
    formData?.config ?? {
      language:               'nodejs',
      runtime_version:        '20',
      app_port:               3000,
      health_check_path:      '/health',
      include_docker_compose: true,
      include_database:       false,
      db_engine:              'postgres',
      db_name:                'appdb',
      db_user:                'appuser',
      include_redis:          false,
      include_kubernetes:     true,
      k8s_namespace:          'default',
      container_registry:     'ghcr.io/equaan',
      domain:                 'app.example.com',
      initial_replicas:       environment === 'prod' ? 3 : 1,
      min_replicas:           environment === 'prod' ? 2 : 1,
      max_replicas:           environment === 'prod' ? 10 : 3,
      cpu_request:            '100m',
      memory_request:         '128Mi',
      cpu_limit:              environment === 'prod' ? '500m' : '250m',
      memory_limit:           environment === 'prod' ? '512Mi' : '256Mi',
      cpu_target_utilization: 70,
      include_helm:           true,
    },
  );

  const handleChange = (newConfig: ContainerConfig) => {
    setConfig(newConfig);
    onChange({ config: newConfig });
  };

  const handleLanguageChange = (lang: string) => {
    handleChange({
      ...config,
      language: lang,
      runtime_version: RUNTIME_VERSIONS[lang][0],
    });
  };

  return (
    <div className={classes.root}>

      {/* ── APPLICATION ─────────────────────────── */}
      <Typography variant="subtitle2" className={classes.sectionTitle}>
        Application
      </Typography>
      <div className={classes.sectionBox}>
        <FormControl className={classes.field} variant="outlined" size="small">
          <InputLabel>Language</InputLabel>
          <Select
            value={config.language}
            onChange={e => handleLanguageChange(e.target.value as string)}
            label="Language"
          >
            <MenuItem value="nodejs">Node.js</MenuItem>
            <MenuItem value="python">Python</MenuItem>
            <MenuItem value="java">Java</MenuItem>
            <MenuItem value="go">Go</MenuItem>
          </Select>
        </FormControl>

        <FormControl className={classes.field} variant="outlined" size="small">
          <InputLabel>Runtime Version</InputLabel>
          <Select
            value={config.runtime_version}
            onChange={e => handleChange({ ...config, runtime_version: e.target.value as string })}
            label="Runtime Version"
          >
            {(RUNTIME_VERSIONS[config.language] ?? []).map(v => (
              <MenuItem key={v} value={v}>{v} {v === RUNTIME_VERSIONS[config.language][0] ? '(recommended)' : ''}</MenuItem>
            ))}
          </Select>
        </FormControl>

        <div className={classes.row}>
          <TextField
            className={classes.fieldHalf}
            label="App Port"
            type="number"
            value={config.app_port}
            onChange={e => handleChange({ ...config, app_port: Number(e.target.value) })}
            variant="outlined"
            size="small"
            helperText="Port app listens on"
          />
          <TextField
            className={classes.fieldHalf}
            label="Health Check Path"
            value={config.health_check_path}
            onChange={e => handleChange({ ...config, health_check_path: e.target.value })}
            variant="outlined"
            size="small"
            helperText="Example: /health"
          />
        </div>
      </div>

      {/* ── DOCKER COMPOSE ──────────────────────── */}
      <div className={config.include_docker_compose ? classes.sectionBoxSelected : classes.sectionBox}>
        <div className={classes.toolHeader}>
          <Checkbox
            checked={config.include_docker_compose}
            onChange={e => handleChange({ ...config, include_docker_compose: e.target.checked })}
            color="primary"
          />
          <span className={classes.badge} style={{ backgroundColor: '#0db7ed' }}>Docker Compose</span>
          <Typography variant="body2" color="textSecondary">
            Local development stack
          </Typography>
        </div>

        {config.include_docker_compose && (
          <Box style={{ paddingLeft: 40 }}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={config.include_database}
                  onChange={e => handleChange({ ...config, include_database: e.target.checked })}
                  color="primary"
                />
              }
              label="Include database container"
            />
            {config.include_database && (
              <Box style={{ paddingLeft: 32 }}>
                <FormControl className={classes.field} variant="outlined" size="small">
                  <InputLabel>Database Engine</InputLabel>
                  <Select
                    value={config.db_engine}
                    onChange={e => handleChange({ ...config, db_engine: e.target.value as string })}
                    label="Database Engine"
                  >
                    <MenuItem value="postgres">PostgreSQL</MenuItem>
                    <MenuItem value="mysql">MySQL</MenuItem>
                  </Select>
                </FormControl>
                <div className={classes.row}>
                  <TextField className={classes.fieldHalf} label="DB Name" value={config.db_name} onChange={e => handleChange({ ...config, db_name: e.target.value })} variant="outlined" size="small" />
                  <TextField className={classes.fieldHalf} label="DB User" value={config.db_user} onChange={e => handleChange({ ...config, db_user: e.target.value })} variant="outlined" size="small" />
                </div>
              </Box>
            )}
            <FormControlLabel
              control={
                <Checkbox
                  checked={config.include_redis}
                  onChange={e => handleChange({ ...config, include_redis: e.target.checked })}
                  color="primary"
                />
              }
              label="Include Redis container"
            />
          </Box>
        )}
      </div>

      {/* ── KUBERNETES ──────────────────────────── */}
      <div className={config.include_kubernetes ? classes.sectionBoxSelected : classes.sectionBox}>
        <div className={classes.toolHeader}>
          <Checkbox
            checked={config.include_kubernetes}
            onChange={e => handleChange({ ...config, include_kubernetes: e.target.checked })}
            color="primary"
          />
          <span className={classes.badge} style={{ backgroundColor: '#326ce5' }}>Kubernetes</span>
          <Typography variant="body2" color="textSecondary">
            Namespace, Deployment, Service, Ingress, HPA, ConfigMap, Secret
          </Typography>
        </div>

        {config.include_kubernetes && (
          <Box style={{ paddingLeft: 40 }}>
            <div className={classes.row}>
              <TextField className={classes.fieldHalf} label="Namespace" value={config.k8s_namespace} onChange={e => handleChange({ ...config, k8s_namespace: e.target.value })} variant="outlined" size="small" helperText="Kubernetes namespace" />
              <TextField className={classes.fieldHalf} label="Domain" value={config.domain} onChange={e => handleChange({ ...config, domain: e.target.value })} variant="outlined" size="small" helperText="Example: app.client.com" />
            </div>
            <TextField
              className={classes.field}
              label="Container Registry"
              value={config.container_registry}
              onChange={e => handleChange({ ...config, container_registry: e.target.value })}
              variant="outlined"
              size="small"
              helperText="Example: ghcr.io/equaan or 123456789.dkr.ecr.us-east-1.amazonaws.com"
            />
            <Typography variant="caption" color="textSecondary" style={{ display: 'block', marginTop: 12 }}>
              Replicas
            </Typography>
            <div className={classes.row}>
              <TextField className={classes.fieldHalf} label="Initial" type="number" value={config.initial_replicas} onChange={e => handleChange({ ...config, initial_replicas: Number(e.target.value) })} variant="outlined" size="small" />
              <TextField className={classes.fieldHalf} label="Min (HPA)" type="number" value={config.min_replicas} onChange={e => handleChange({ ...config, min_replicas: Number(e.target.value) })} variant="outlined" size="small" />
              <TextField className={classes.fieldHalf} label="Max (HPA)" type="number" value={config.max_replicas} onChange={e => handleChange({ ...config, max_replicas: Number(e.target.value) })} variant="outlined" size="small" />
            </div>
            <Typography variant="caption" color="textSecondary" style={{ display: 'block', marginTop: 12 }}>
              Resources
            </Typography>
            <div className={classes.row}>
              <TextField className={classes.fieldHalf} label="CPU Request" value={config.cpu_request} onChange={e => handleChange({ ...config, cpu_request: e.target.value })} variant="outlined" size="small" helperText="Example: 100m" />
              <TextField className={classes.fieldHalf} label="CPU Limit" value={config.cpu_limit} onChange={e => handleChange({ ...config, cpu_limit: e.target.value })} variant="outlined" size="small" helperText="Example: 500m" />
              <TextField className={classes.fieldHalf} label="Memory Request" value={config.memory_request} onChange={e => handleChange({ ...config, memory_request: e.target.value })} variant="outlined" size="small" helperText="Example: 128Mi" />
              <TextField className={classes.fieldHalf} label="Memory Limit" value={config.memory_limit} onChange={e => handleChange({ ...config, memory_limit: e.target.value })} variant="outlined" size="small" helperText="Example: 512Mi" />
            </div>
            {environment === 'prod' && config.min_replicas < 2 && (
              <Box className={classes.warnBox}>
                ⚠️ Production — minimum 2 replicas recommended for high availability
              </Box>
            )}
          </Box>
        )}
      </div>

      {/* ── HELM ────────────────────────────────── */}
      <div className={config.include_helm ? classes.sectionBoxSelected : classes.sectionBox}>
        <div className={classes.toolHeader}>
          <Checkbox
            checked={config.include_helm}
            onChange={e => handleChange({ ...config, include_helm: e.target.checked })}
            color="primary"
          />
          <span className={classes.badge} style={{ backgroundColor: '#277a9f' }}>Helm</span>
          <Typography variant="body2" color="textSecondary">
            Helm chart wrapping the Kubernetes manifests
          </Typography>
        </div>
        {config.include_helm && (
          <Box style={{ paddingLeft: 40 }}>
            <Box className={classes.infoBox}>
              ℹ️ Helm chart uses the same values as the Kubernetes manifests above.
              Deploy with: helm install {config.k8s_namespace} ./containers/helm
            </Box>
          </Box>
        )}
      </div>

      {/* ── SUMMARY ─────────────────────────────── */}
      <div className={classes.summaryBox}>
        <Typography variant="caption" display="block" gutterBottom>
          Configuration summary:
        </Typography>
        <span className={classes.summaryText}>
          {config.language} {config.runtime_version} | port: {config.app_port} | health: {config.health_check_path}
        </span>
        <span className={classes.summaryText}>
          docker-compose: {String(config.include_docker_compose)} | k8s: {String(config.include_kubernetes)} | helm: {String(config.include_helm)}
        </span>
        {config.include_kubernetes && (
          <span className={classes.summaryText}>
            replicas: {config.min_replicas}-{config.max_replicas} | cpu: {config.cpu_request}/{config.cpu_limit} | mem: {config.memory_request}/{config.memory_limit}
          </span>
        )}
      </div>

      {rawErrors && rawErrors.length > 0 && (
        <FormHelperText error>{rawErrors.join(', ')}</FormHelperText>
      )}
    </div>
  );
};