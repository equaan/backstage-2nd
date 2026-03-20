import { useState } from 'react';
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

export interface ObservabilityConfig {
  deployment_method: string;
  scrape_interval: string;
  retention_days: number;
  grafana_port: number;
  grafana_admin_password: string;
  alert_email: string;
  slack_webhook: string;
  slack_channel: string;
  scrape_app_metrics: boolean;
  app_metrics_port: number;
  include_infra_alerts: boolean;
  include_app_alerts: boolean;
}

export interface ObservabilityPickerValue {
  config: ObservabilityConfig;
}

// ─────────────────────────────────────────────────────────────
// STYLES — same makeStyles pattern as AwsResourcePicker
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
  field: {
    marginTop: theme.spacing(1.5),
    width: '100%',
    maxWidth: 420,
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
}));

// ─────────────────────────────────────────────────────────────
// MAIN COMPONENT
// Outer div not FormControl — same pattern as AwsResourcePicker
// ─────────────────────────────────────────────────────────────

export const ObservabilityPicker = ({
  onChange,
  rawErrors,
  formData,
  uiSchema,
}: FieldExtensionComponentProps<ObservabilityPickerValue>) => {
  const classes = useStyles();
  const environment = (uiSchema?.['ui:options']?.environment as string) ?? 'dev';

  const [config, setConfig] = useState<ObservabilityConfig>(
    formData?.config ?? {
      deployment_method:      'docker-compose',
      scrape_interval:        '15s',
      retention_days:         environment === 'prod' ? 30 : 7,
      grafana_port:           3000,
      grafana_admin_password: '',
      alert_email:            '',
      slack_webhook:          '',
      slack_channel:          'alerts',
      scrape_app_metrics:     false,
      app_metrics_port:       8080,
      include_infra_alerts:   true,
      include_app_alerts:     true,
    },
  );

  const handleChange = (newConfig: ObservabilityConfig) => {
    setConfig(newConfig);
    onChange({ config: newConfig });
  };

  return (
    <div className={classes.root}>

      {/* ── DEPLOYMENT ─────────────────────── */}
      <Typography variant="subtitle2" className={classes.sectionTitle}>
        Deployment Method
      </Typography>
      <div className={classes.sectionBox}>
        <FormControl className={classes.field} variant="outlined" size="small">
          <InputLabel>Deploy Using</InputLabel>
          <Select
            value={config.deployment_method}
            onChange={e => handleChange({ ...config, deployment_method: e.target.value as string })}
            label="Deploy Using"
          >
            <MenuItem value="docker-compose">Docker Compose — single server, simple setup</MenuItem>
            <MenuItem value="helm">Helm — Kubernetes, production grade</MenuItem>
          </Select>
        </FormControl>
        <Box className={classes.infoBox}>
          {config.deployment_method === 'docker-compose'
            ? 'ℹ️ Deploys Prometheus, Grafana, Node Exporter, Alertmanager as containers. Run: docker compose up -d'
            : 'ℹ️ Deploys to Kubernetes using Prometheus Community Helm charts. Run: helm install obs ./helm'}
        </Box>
      </div>

      {/* ── PROMETHEUS ──────────────────────── */}
      <Typography variant="subtitle2" className={classes.sectionTitle}>
        Prometheus
      </Typography>
      <div className={classes.sectionBox}>
        <FormControl className={classes.field} variant="outlined" size="small">
          <InputLabel>Scrape Interval</InputLabel>
          <Select
            value={config.scrape_interval}
            onChange={e => handleChange({ ...config, scrape_interval: e.target.value as string })}
            label="Scrape Interval"
          >
            <MenuItem value="10s">10s — high frequency (more storage)</MenuItem>
            <MenuItem value="15s">15s — recommended default</MenuItem>
            <MenuItem value="30s">30s — lower frequency (less storage)</MenuItem>
            <MenuItem value="60s">60s — minimal (dev only)</MenuItem>
          </Select>
        </FormControl>
        <FormControl className={classes.field} variant="outlined" size="small">
          <InputLabel>Retention Period</InputLabel>
          <Select
            value={config.retention_days}
            onChange={e => handleChange({ ...config, retention_days: Number(e.target.value) })}
            label="Retention Period"
          >
            <MenuItem value={7}>7 days (dev)</MenuItem>
            <MenuItem value={15}>15 days (staging)</MenuItem>
            <MenuItem value={30}>30 days (prod — recommended)</MenuItem>
            <MenuItem value={90}>90 days (extended)</MenuItem>
          </Select>
        </FormControl>
        <Box style={{ marginTop: 8 }}>
          <FormControlLabel
            control={
              <Checkbox
                checked={config.scrape_app_metrics}
                onChange={e => handleChange({ ...config, scrape_app_metrics: e.target.checked })}
                color="primary"
              />
            }
            label="Scrape application metrics endpoint"
          />
        </Box>
        {config.scrape_app_metrics && (
          <TextField
            className={classes.field}
            label="App Metrics Port"
            type="number"
            value={config.app_metrics_port}
            onChange={e => handleChange({ ...config, app_metrics_port: Number(e.target.value) })}
            variant="outlined"
            size="small"
            helperText="Port your app exposes /metrics on. Example: 8080"
          />
        )}
      </div>

      {/* ── GRAFANA ─────────────────────────── */}
      <Typography variant="subtitle2" className={classes.sectionTitle}>
        Grafana
      </Typography>
      <div className={classes.sectionBox}>
        <TextField
          className={classes.field}
          label="Grafana Port"
          type="number"
          value={config.grafana_port}
          onChange={e => handleChange({ ...config, grafana_port: Number(e.target.value) })}
          variant="outlined"
          size="small"
          helperText="Port to access Grafana UI. Default: 3000"
        />
        <TextField
          className={classes.field}
          label="Admin Password"
          type="password"
          value={config.grafana_admin_password}
          onChange={e => handleChange({ ...config, grafana_admin_password: e.target.value })}
          variant="outlined"
          size="small"
          helperText="Set a strong password — you'll use this to log into Grafana"
        />
        {config.grafana_admin_password.length > 0 && config.grafana_admin_password.length < 8 && (
          <Box className={classes.warnBox}>⚠️ Password should be at least 8 characters</Box>
        )}
      </div>

      {/* ── ALERT RULES ─────────────────────── */}
      <Typography variant="subtitle2" className={classes.sectionTitle}>
        Alert Rules
      </Typography>
      <div className={classes.sectionBox}>
        <FormControlLabel
          control={
            <Checkbox
              checked={config.include_infra_alerts}
              onChange={e => handleChange({ ...config, include_infra_alerts: e.target.checked })}
              color="primary"
            />
          }
          label="Infrastructure alerts — CPU, memory, disk, instance down"
        />
        <br />
        <FormControlLabel
          control={
            <Checkbox
              checked={config.include_app_alerts}
              onChange={e => handleChange({ ...config, include_app_alerts: e.target.checked })}
              color="primary"
            />
          }
          label="Application alerts — HTTP error rate, latency, endpoint down"
        />
      </div>

      {/* ── NOTIFICATIONS ───────────────────── */}
      <Typography variant="subtitle2" className={classes.sectionTitle}>
        Alert Notifications
      </Typography>
      <div className={classes.sectionBox}>
        <TextField
          className={classes.field}
          label="Alert Email (optional)"
          type="email"
          value={config.alert_email}
          onChange={e => handleChange({ ...config, alert_email: e.target.value })}
          variant="outlined"
          size="small"
          helperText="Email for critical alerts. Leave empty to skip."
          placeholder="alerts@yourcompany.com"
        />
        <TextField
          className={classes.field}
          label="Slack Webhook URL (optional)"
          value={config.slack_webhook}
          onChange={e => handleChange({ ...config, slack_webhook: e.target.value })}
          variant="outlined"
          size="small"
          helperText="Slack incoming webhook. Leave empty to skip."
          placeholder="https://hooks.slack.com/services/..."
        />
        {config.slack_webhook && (
          <TextField
            className={classes.field}
            label="Slack Channel"
            value={config.slack_channel}
            onChange={e => handleChange({ ...config, slack_channel: e.target.value })}
            variant="outlined"
            size="small"
            helperText="Channel name without #. Example: devops-alerts"
          />
        )}
        {!config.alert_email && !config.slack_webhook && (
          <Box className={classes.warnBox}>
            ⚠️ No notification channel configured — alerts will fire but no one will be notified.
          </Box>
        )}
      </div>

      {/* ── SUMMARY ─────────────────────────── */}
      <div className={classes.summaryBox}>
        <Typography variant="caption" display="block" gutterBottom>
          Configuration summary:
        </Typography>
        <span className={classes.summaryText}>
          {config.deployment_method} | scrape: {config.scrape_interval} | retention: {config.retention_days}d | grafana: :{config.grafana_port}
        </span>
        <span className={classes.summaryText}>
          alerts: {[config.alert_email && 'email', config.slack_webhook && 'slack'].filter(Boolean).join(', ') || 'none configured'}
        </span>
      </div>

      {rawErrors && rawErrors.length > 0 && (
        <FormHelperText error>{rawErrors.join(', ')}</FormHelperText>
      )}
    </div>
  );
};