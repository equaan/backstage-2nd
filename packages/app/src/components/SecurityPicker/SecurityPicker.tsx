// eslint-disable-next-line @typescript-eslint/no-unused-vars
import React, { useState } from 'react';
import { FieldExtensionComponentProps } from '@backstage/plugin-scaffolder-react';
import { makeStyles } from '@material-ui/core/styles';
import FormHelperText from '@material-ui/core/FormHelperText';
import FormControl from '@material-ui/core/FormControl';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import Checkbox from '@material-ui/core/Checkbox';
import Typography from '@material-ui/core/Typography';
import Select from '@material-ui/core/Select';
import MenuItem from '@material-ui/core/MenuItem';
import InputLabel from '@material-ui/core/InputLabel';
import Box from '@material-ui/core/Box';

// ─────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────

export interface SecurityConfig {
  // Trivy
  enable_trivy: boolean;
  trivy_exit_code: number;
  ignore_unfixed: boolean;
  include_medium_severity: boolean;
  scan_docker_image: boolean;
  scan_iac: boolean;
  // OWASP
  enable_owasp: boolean;
  owasp_fail_cvss: number;
}

export interface SecurityPickerValue {
  config: SecurityConfig;
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
  badge: {
    fontSize: '0.65rem',
    fontWeight: 700,
    padding: '2px 8px',
    borderRadius: 4,
    textTransform: 'uppercase' as const,
    color: '#fff',
    marginRight: 8,
  },
  toolHeader: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: theme.spacing(1),
  },
}));

// ─────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────

export const SecurityPicker = ({
  onChange,
  rawErrors,
  formData,
  uiSchema,
}: FieldExtensionComponentProps<SecurityPickerValue>) => {
  const classes = useStyles();
  const environment = (uiSchema?.['ui:options']?.environment as string) ?? 'dev';

  const [config, setConfig] = useState<SecurityConfig>(
    formData?.config ?? {
      enable_trivy:            true,
      trivy_exit_code:         environment === 'prod' ? 1 : 0,
      ignore_unfixed:          true,
      include_medium_severity: false,
      scan_docker_image:       false,
      scan_iac:                false,
      enable_owasp:            false,
      owasp_fail_cvss:         7,
    },
  );

  const handleChange = (newConfig: SecurityConfig) => {
    setConfig(newConfig);
    onChange({ config: newConfig });
  };

  const selectedTools = [
    config.enable_trivy && 'Trivy',
    config.enable_owasp && 'OWASP',
  ].filter(Boolean).join(', ');

  return (
    <div className={classes.root}>

      {/* ── TRIVY ───────────────────────────────── */}
      <Typography variant="subtitle2" className={classes.sectionTitle}>
        Security Scanners
      </Typography>

      <div className={config.enable_trivy ? classes.sectionBoxSelected : classes.sectionBox}>
        <div className={classes.toolHeader}>
          <Checkbox
            checked={config.enable_trivy}
            onChange={e => handleChange({ ...config, enable_trivy: e.target.checked })}
            color="primary"
          />
          <span className={classes.badge} style={{ backgroundColor: '#1e88e5' }}>Trivy</span>
          <Typography variant="body2" color="textSecondary">
            Container, filesystem, and IaC vulnerability scanning
          </Typography>
        </div>

        {config.enable_trivy && (
          <Box style={{ paddingLeft: 40 }}>
            <Box className={classes.infoBox}>
              ℹ️ Trivy scans run on every push and PR, plus a daily scheduled scan.
              Results are uploaded to GitHub Security tab as SARIF.
            </Box>

            <FormControl className={classes.field} variant="outlined" size="small">
              <InputLabel>On Vulnerability Found</InputLabel>
              <Select
                value={config.trivy_exit_code}
                onChange={e => handleChange({ ...config, trivy_exit_code: Number(e.target.value) })}
                label="On Vulnerability Found"
              >
                <MenuItem value={0}>Report only — pipeline continues (dev/staging)</MenuItem>
                <MenuItem value={1}>Fail pipeline — blocks merge (prod)</MenuItem>
              </Select>
            </FormControl>

            <Box style={{ marginTop: 12 }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={config.ignore_unfixed}
                    onChange={e => handleChange({ ...config, ignore_unfixed: e.target.checked })}
                    color="primary"
                  />
                }
                label="Ignore vulnerabilities with no fix available"
              />
            </Box>
            <FormControlLabel
              control={
                <Checkbox
                  checked={config.include_medium_severity}
                  onChange={e => handleChange({ ...config, include_medium_severity: e.target.checked })}
                  color="primary"
                />
              }
              label="Include MEDIUM severity (default: CRITICAL + HIGH only)"
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={config.scan_docker_image}
                  onChange={e => handleChange({ ...config, scan_docker_image: e.target.checked })}
                  color="primary"
                />
              }
              label="Scan Docker container image (requires Dockerfile in repo)"
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={config.scan_iac}
                  onChange={e => handleChange({ ...config, scan_iac: e.target.checked })}
                  color="primary"
                />
              }
              label="Scan Terraform IaC for misconfigurations (requires terraform/ directory)"
            />

            {environment === 'prod' && config.trivy_exit_code === 0 && (
              <Box className={classes.warnBox}>
                ⚠️ Production — consider setting pipeline to fail on vulnerabilities
              </Box>
            )}
          </Box>
        )}
      </div>

      {/* ── OWASP ───────────────────────────────── */}
      <div className={config.enable_owasp ? classes.sectionBoxSelected : classes.sectionBox}>
        <div className={classes.toolHeader}>
          <Checkbox
            checked={config.enable_owasp}
            onChange={e => handleChange({ ...config, enable_owasp: e.target.checked })}
            color="primary"
          />
          <span className={classes.badge} style={{ backgroundColor: '#6a1aab' }}>OWASP</span>
          <Typography variant="body2" color="textSecondary">
            Dependency vulnerability scanning using NVD database
          </Typography>
        </div>

        {config.enable_owasp && (
          <Box style={{ paddingLeft: 40 }}>
            <Box className={classes.infoBox}>
              ℹ️ OWASP Dependency Check runs weekly and on every push to main.
              HTML report is saved as a GitHub Actions artifact for 30 days.
            </Box>

            <FormControl className={classes.field} variant="outlined" size="small">
              <InputLabel>Fail Pipeline at CVSS Score</InputLabel>
              <Select
                value={config.owasp_fail_cvss}
                onChange={e => handleChange({ ...config, owasp_fail_cvss: Number(e.target.value) })}
                label="Fail Pipeline at CVSS Score"
              >
                <MenuItem value={10}>10 — Critical only (permissive)</MenuItem>
                <MenuItem value={7}>7 — High and Critical (recommended)</MenuItem>
                <MenuItem value={4}>4 — Medium, High and Critical (strict)</MenuItem>
              </Select>
            </FormControl>
          </Box>
        )}
      </div>

      {/* ── SUMMARY ─────────────────────────────── */}
      <div className={classes.summaryBox}>
        <Typography variant="caption" display="block" gutterBottom>
          Selected scanners:
        </Typography>
        <span className={classes.summaryText}>
          {selectedTools || 'No scanners selected'}
        </span>
        {config.enable_trivy && (
          <span className={classes.summaryText}>
            Trivy: exit-code={config.trivy_exit_code} | ignore-unfixed={String(config.ignore_unfixed)} | image={String(config.scan_docker_image)} | iac={String(config.scan_iac)}
          </span>
        )}
        {config.enable_owasp && (
          <span className={classes.summaryText}>
            OWASP: fail-at-cvss={config.owasp_fail_cvss}
          </span>
        )}
      </div>

      {rawErrors && rawErrors.length > 0 && (
        <FormHelperText error>{rawErrors.join(', ')}</FormHelperText>
      )}
    </div>
  );
};