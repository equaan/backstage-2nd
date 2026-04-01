// src/flows.js
// Defines every template as an ordered list of steps.
// Each step has a question, a validation function, and a key to store under.
// Option 1: collect only the minimum essential fields — everything else
// uses the defaults already baked into the Backstage templates.
//
// To add a new template: add an entry to FLOWS and TEMPLATE_REFS in backstage.js.
// To add a field: add a step object to the relevant array.

// ── Shared validators ─────────────────────────────────────────────────────────

function validateClientName(input) {
  if (!/^[a-z0-9-]+$/.test(input)) {
    return 'Must be lowercase letters, numbers, and hyphens only. Example: `acme-corp`';
  }
  return null;
}

function validateEnvironment(input) {
  if (!['dev', 'staging', 'prod'].includes(input)) {
    return 'Must be exactly `dev`, `staging`, or `prod`.';
  }
  return null;
}

function validateGitHubOwner(input) {
  if (!/^[a-z0-9-]+$/.test(input)) {
    return 'Must be lowercase letters, numbers, and hyphens only. Example: `equaan`';
  }
  return null;
}

function validateRepoName(input) {
  if (!/^[a-z0-9._-]+$/.test(input)) {
    return 'Must be lowercase letters, numbers, dots, hyphens, and underscores only. Example: `acme-corp-infra`';
  }
  return null;
}

// ── Shared transforms ─────────────────────────────────────────────────────────

const trim = v => v.trim();
const lower = v => v.trim().toLowerCase();

const DEFAULT_CUSTOMISATION_RESPONSES = new Set([
  '',
  'default',
  'skip',
  'no',
  'n',
  'use default',
  'use defaults',
]);

function isDefaultCustomisationResponse(input) {
  return DEFAULT_CUSTOMISATION_RESPONSES.has(lower(input));
}

function createCustomisationStep({ key, ask, options, aliases }) {
  const validOptions = Object.keys(aliases);

  function normalise(input) {
    const value = lower(input);

    if (isDefaultCustomisationResponse(value)) {
      return 'default';
    }

    return aliases[value] || null;
  }

  return {
    key,
    ask,
    validate: input => {
      if (normalise(input)) {
        return null;
      }

      return `Valid options: ${options.join(', ')}. Reply \`skip\` to use defaults.`;
    },
    transform: input => normalise(input),
  };
}

function getSelectedValue(value, fallback) {
  return !value || value === 'default' ? fallback : value;
}

// ── Step definitions ──────────────────────────────────────────────────────────

const CLIENT_NAME_STEP = {
  key: 'client_name',
  ask: 'What is the *client name*? (lowercase, hyphens only — e.g. `acme-corp`)',
  validate: input => validateClientName(lower(input)),
  transform: lower,
};

const ENVIRONMENT_STEP = {
  key: 'environment',
  ask: 'Which *environment*? Reply `dev`, `staging`, or `prod`.',
  validate: input => validateEnvironment(lower(input)),
  transform: lower,
};

const GITHUB_OWNER_STEP = {
  key: 'github_owner',
  ask: 'What is the *GitHub owner* (username or organization)? (lowercase, hyphens only — e.g. `equaan`)',
  validate: input => validateGitHubOwner(lower(input)),
  transform: lower,
};

const REPO_NAME_STEP = {
  key: 'repo_name',
  ask: 'What is the *repository name*? (lowercase, hyphens/underscores allowed — e.g. `acme-corp-infra`)',
  validate: input => validateRepoName(lower(input)),
  transform: lower,
};

const CLIENT_ONBOARDING_CUSTOMISATION_STEP = createCustomisationStep({
  key: 'cicd_tool',
  ask: 'Defaults: GitHub Actions for CI/CD. Want to change that? Reply `github-actions`, `jenkins`, `argocd`, `gitlab-ci`, `none`, or `skip` to use defaults.',
  options: ['`github-actions`', '`jenkins`', '`argocd`', '`gitlab-ci`', '`none`'],
  aliases: {
    'github-actions': 'github-actions',
    'github actions': 'github-actions',
    'gh-actions': 'github-actions',
    'gh actions': 'github-actions',
    github: 'github-actions',
    jenkins: 'jenkins',
    argocd: 'argocd',
    'argo cd': 'argocd',
    argo: 'argocd',
    'gitlab-ci': 'gitlab-ci',
    'gitlab ci': 'gitlab-ci',
    gitlab: 'gitlab-ci',
    none: 'none',
  },
});

const CICD_PIPELINE_CUSTOMISATION_STEP = createCustomisationStep({
  key: 'cicd_tool',
  ask: 'Defaults: GitHub Actions for CI/CD. Want to change that? Reply `github-actions`, `jenkins`, `argocd`, or `gitlab-ci`, or `skip` to use defaults.',
  options: ['`github-actions`', '`jenkins`', '`argocd`', '`gitlab-ci`'],
  aliases: {
    'github-actions': 'github-actions',
    'github actions': 'github-actions',
    'gh-actions': 'github-actions',
    'gh actions': 'github-actions',
    github: 'github-actions',
    jenkins: 'jenkins',
    argocd: 'argocd',
    'argo cd': 'argocd',
    argo: 'argocd',
    'gitlab-ci': 'gitlab-ci',
    'gitlab ci': 'gitlab-ci',
    gitlab: 'gitlab-ci',
  },
});

const OBSERVABILITY_CUSTOMISATION_STEP = createCustomisationStep({
  key: 'deployment_method',
  ask: 'Defaults: Docker Compose for observability. Want to change that? Reply `docker-compose`, `helm`, or `skip` to use defaults.',
  options: ['`docker-compose`', '`helm`'],
  aliases: {
    'docker-compose': 'docker-compose',
    'docker compose': 'docker-compose',
    compose: 'docker-compose',
    docker: 'docker-compose',
    helm: 'helm',
  },
});

const SECURITY_SCAN_CUSTOMISATION_STEP = createCustomisationStep({
  key: 'security_scan_mode',
  ask: 'Defaults: Trivy only. Want to also enable OWASP? Reply `owasp` to add it, or `skip` to keep the default.',
  options: ['`owasp`'],
  aliases: {
    owasp: 'owasp',
    both: 'owasp',
    'trivy+owasp': 'owasp',
    'trivy + owasp': 'owasp',
    'enable owasp': 'owasp',
  },
});

const CONTAINER_SETUP_CUSTOMISATION_STEP = createCustomisationStep({
  key: 'app_language',
  ask: 'Defaults: Node.js app container setup. Want to change the language? Reply `nodejs`, `python`, `java`, `go`, or `skip` to use defaults.',
  options: ['`nodejs`', '`python`', '`java`', '`go`'],
  aliases: {
    nodejs: 'nodejs',
    'node.js': 'nodejs',
    node: 'nodejs',
    javascript: 'nodejs',
    js: 'nodejs',
    python: 'python',
    py: 'python',
    java: 'java',
    go: 'go',
    golang: 'go',
  },
});

// ── Template flows ────────────────────────────────────────────────────────────

export const FLOWS = {

  // ── client-onboarding ───────────────────────────────────────────────────────
  // Full onboarding wizard. Collects the 4 core fields.
  // CI/CD, observability, security, containers all default to false.
  // The engineer can enable them afterwards in Backstage if needed, or
  // we can add optional yes/no steps here later.
  'client-onboarding': [
    CLIENT_NAME_STEP,
    ENVIRONMENT_STEP,
    {
      key: 'cloud_provider',
      ask: 'Which *cloud provider*? Reply `aws`, `azure`, `gcp`, or `none` to skip infrastructure.',
      validate: input => {
        if (!['aws', 'azure', 'gcp', 'none'].includes(lower(input))) {
          return 'Must be `aws`, `azure`, `gcp`, or `none`.';
        }
        return null;
      },
      transform: lower,
    },
    GITHUB_OWNER_STEP,
    REPO_NAME_STEP,
    CLIENT_ONBOARDING_CUSTOMISATION_STEP,
  ],

  // ── aws-infrastructure ──────────────────────────────────────────────────────
  // Collects the 5 essential fields. Resources default to vpc+subnets+security_groups.
  // CI/CD defaults to off. All config (CIDR, instance type etc.) uses template defaults.
  'aws-infrastructure': [
    CLIENT_NAME_STEP,
    ENVIRONMENT_STEP,
    {
      key: 'aws_region',
      ask: 'Which *AWS region*?\nOptions: `us-east-1`, `us-west-2`, `eu-west-1`, `ap-southeast-1`\nOr type `default` for `us-east-1`.',
      validate: input => {
        const val = lower(input);
        if (val === 'default') return null;
        const valid = ['us-east-1', 'us-west-2', 'eu-west-1', 'ap-southeast-1'];
        if (!valid.includes(val)) return `Must be one of: ${valid.join(', ')} — or type \`default\`.`;
        return null;
      },
      transform: input => lower(input) === 'default' ? 'us-east-1' : lower(input),
    },
    {
      key: 'iac_tool',
      ask: 'Which *IaC tool*? Reply `terraform` or `cloudformation`.',
      validate: input => {
        if (!['terraform', 'cloudformation'].includes(lower(input))) {
          return 'Must be `terraform` or `cloudformation`.';
        }
        return null;
      },
      transform: lower,
    },
    GITHUB_OWNER_STEP,
    REPO_NAME_STEP,
  ],

  // ── azure-infrastructure ────────────────────────────────────────────────────
  'azure-infrastructure': [
    CLIENT_NAME_STEP,
    ENVIRONMENT_STEP,
    {
      key: 'location',
      ask: 'Which *Azure location*?\nCommon options: `eastus`, `westus2`, `westeurope`, `northeurope`, `southeastasia`\nOr type `default` for `eastus`.',
      validate: input => {
        if (lower(input) === 'default') return null;
        if (!lower(input).match(/^[a-z]+$/)) return 'Must be a valid Azure location (e.g. `eastus`, `westeurope`).';
        return null;
      },
      transform: input => lower(input) === 'default' ? 'eastus' : lower(input),
    },
    GITHUB_OWNER_STEP,
    REPO_NAME_STEP,
  ],

  // ── gcp-infrastructure ──────────────────────────────────────────────────────
  'gcp-infrastructure': [
    CLIENT_NAME_STEP,
    ENVIRONMENT_STEP,
    {
      key: 'project_id',
      ask: 'What is the *GCP Project ID*? (Must already exist in GCP Console)\nExample: `acme-corp-prod-123456`',
      validate: input => {
        if (!trim(input)) return 'Project ID cannot be empty.';
        return null;
      },
      transform: trim,
    },
    {
      key: 'region',
      ask: 'Which *GCP region*?\nCommon options: `us-central1`, `us-east1`, `europe-west1`, `asia-southeast1`\nOr type `default` for `us-central1`.',
      validate: input => {
        if (lower(input) === 'default') return null;
        if (!lower(input).match(/^[a-z]+-[a-z]+[0-9]+$/)) return 'Must be a valid GCP region (e.g. `us-central1`).';
        return null;
      },
      transform: input => lower(input) === 'default' ? 'us-central1' : lower(input),
    },
    GITHUB_OWNER_STEP,
    REPO_NAME_STEP,
  ],

  // ── cicd-pipeline ───────────────────────────────────────────────────────────
  'cicd-pipeline': [
    CLIENT_NAME_STEP,
    ENVIRONMENT_STEP,
    GITHUB_OWNER_STEP,
    REPO_NAME_STEP,
    CICD_PIPELINE_CUSTOMISATION_STEP,
  ],

  // ── observability-stack ─────────────────────────────────────────────────────
  'observability-stack': [
    CLIENT_NAME_STEP,
    ENVIRONMENT_STEP,
    GITHUB_OWNER_STEP,
    REPO_NAME_STEP,
    OBSERVABILITY_CUSTOMISATION_STEP,
  ],

  // ── security-scan ───────────────────────────────────────────────────────────
  'security-scan': [
    CLIENT_NAME_STEP,
    ENVIRONMENT_STEP,
    GITHUB_OWNER_STEP,
    REPO_NAME_STEP,
    SECURITY_SCAN_CUSTOMISATION_STEP,
  ],

  // ── container-setup ─────────────────────────────────────────────────────────
  'container-setup': [
    CLIENT_NAME_STEP,
    ENVIRONMENT_STEP,
    GITHUB_OWNER_STEP,
    REPO_NAME_STEP,
    CONTAINER_SETUP_CUSTOMISATION_STEP,
  ],
};

// ── Template display metadata ─────────────────────────────────────────────────
// Used for the help menu and confirmation messages.
export const TEMPLATE_META = {
  'client-onboarding':    { emoji: '⭐', label: 'Full Client Onboarding',          alias: ['onboard', 'onboarding', 'full'] },
  'aws-infrastructure':   { emoji: '🏗️',  label: 'AWS Infrastructure',              alias: ['aws', 'amazon'] },
  'azure-infrastructure': { emoji: '🔷', label: 'Azure Infrastructure',            alias: ['azure', 'microsoft'] },
  'gcp-infrastructure':   { emoji: '🌐', label: 'GCP Infrastructure',              alias: ['gcp', 'google', 'gcloud'] },
  'cicd-pipeline':        { emoji: '🔄', label: 'CI/CD Pipeline',                  alias: ['cicd', 'ci', 'cd', 'pipeline', 'github actions', 'jenkins'] },
  'observability-stack':  { emoji: '📊', label: 'Observability Stack',             alias: ['observability', 'prometheus', 'grafana', 'monitoring'] },
  'security-scan':        { emoji: '🔒', label: 'Security Scanning',               alias: ['security', 'trivy', 'owasp', 'scan'] },
  'container-setup':      { emoji: '🐳', label: 'Container Setup',                 alias: ['container', 'docker', 'kubernetes', 'k8s', 'helm'] },
};

/**
 * Given free-text input, try to figure out which template the user wants.
 * Returns a template key (e.g. "aws-infrastructure") or null if not recognised.
 */
export function detectTemplate(text) {
  const lower = text.toLowerCase();

  // Exact match first
  if (FLOWS[lower]) return lower;

  // Check aliases
  for (const [key, meta] of Object.entries(TEMPLATE_META)) {
    if (meta.alias.some(a => lower.includes(a))) return key;
  }

  return null;
}

/**
 * Build the default values that go along with the collected data.
 * These fill in all the fields we're NOT asking the user about.
 */
export function buildDefaultValues(templateName, collectedData) {
  // Construct repoUrl from separate owner and repo_name fields
  const repoUrl = collectedData.github_owner && collectedData.repo_name
    ? `github.com?owner=${collectedData.github_owner}&repo=${collectedData.repo_name}`
    : null;

  const baseData = {
    ...collectedData,
    ...(repoUrl && { repoUrl }),
  };

  switch (templateName) {

    case 'client-onboarding':
      {
        const cicdTool = getSelectedValue(collectedData.cicd_tool, 'github-actions');
        const cicdToolLabels = {
          'github-actions': 'GitHub Actions',
          jenkins: 'Jenkins',
          argocd: 'ArgoCD',
          'gitlab-ci': 'GitLab CI',
          none: 'None',
        };

      return {
        ...baseData,
        setup_cicd: cicdTool !== 'none',
        cicd_config: cicdTool === 'none'
          ? { tools: 'None', config: {} }
          : { tools: cicdToolLabels[cicdTool], config: {} },
        setup_observability: false,
        setup_security: false,
        setup_containers: false,
      };
      }

    case 'aws-infrastructure':
      return {
        ...baseData,
        iac_resources: {
          resources: 'vpc_subnets_security_groups',
          config: {
            vpc_cidr: '10.0.0.0/16',
            public_subnet_cidrs: '10.0.1.0/24,10.0.2.0/24',
            private_subnet_cidrs: '10.0.10.0/24,10.0.11.0/24',
            availability_zones: 'us-east-1a,us-east-1b',
            allowed_ssh_cidrs: '',
            rds_port: 5432,
          },
        },
        setup_cicd: false,
      };

    case 'azure-infrastructure':
      return {
        ...baseData,
        // AzureResourcePicker foundation fields
        azure_resources: {
          foundation: {
            location: collectedData.location,
            resource_group_suffix: '',
            subscription_id_confirmed: true,
          },
          resources: 'vnet',
          config: {
            vnet_address_space: '10.0.0.0/16',
            public_subnet_prefixes: '10.0.1.0/24,10.0.2.0/24',
            private_subnet_prefixes: '10.0.10.0/24,10.0.11.0/24',
            enable_nat_gateway: collectedData.environment === 'prod',
          },
        },
      };

    case 'gcp-infrastructure':
      return {
        ...baseData,
        gcp_resources: {
          foundation: {
            project_id: collectedData.project_id,
            region: collectedData.region,
            zone: `${collectedData.region}-a`,
            adc_confirmed: true,
          },
          resources: 'vpc',
          config: {
            public_subnet_cidr: '10.0.1.0/24',
            private_subnet_cidr: '10.0.10.0/24',
            enable_cloud_nat: collectedData.environment === 'prod',
          },
        },
      };

    case 'cicd-pipeline':
      {
        const cicdTool = getSelectedValue(collectedData.cicd_tool, 'github-actions');
        const cicdToolLabels = {
          'github-actions': 'GitHub Actions',
          jenkins: 'Jenkins',
          argocd: 'ArgoCD',
          'gitlab-ci': 'GitLab CI',
        };

      return {
        ...baseData,
        cicd_config: {
          tools: cicdToolLabels[cicdTool],
          config: {},
        },
      };
      }

    case 'observability-stack':
      return {
        ...baseData,
        obs_config: {
          config: {
            deployment_method: getSelectedValue(collectedData.deployment_method, 'docker-compose'),
            scrape_interval: '15s',
            retention_days: collectedData.environment === 'prod' ? 30 : 7,
            grafana_port: 3000,
            grafana_admin_password: 'ChangeMe123!',
            alert_email: '',
            slack_webhook: '',
            slack_channel: 'alerts',
            scrape_app_metrics: false,
            app_metrics_port: 8080,
            include_infra_alerts: true,
            include_app_alerts: true,
          },
        },
      };

    case 'security-scan':
      return {
        ...baseData,
        security_config: {
          config: {
            enable_trivy: true,
            trivy_exit_code: collectedData.environment === 'prod' ? 1 : 0,
            ignore_unfixed: true,
            include_medium_severity: false,
            scan_docker_image: false,
            scan_iac: true,
            enable_owasp: getSelectedValue(collectedData.security_scan_mode, 'default') === 'owasp',
            owasp_fail_cvss: 7,
          },
        },
      };

    case 'container-setup':
      return {
        ...baseData,
        container_config: {
          config: {
            language: getSelectedValue(collectedData.app_language, 'nodejs'),
            runtime_version: '20',
            app_port: 3000,
            health_check_path: '/health',
            include_docker_compose: true,
            include_database: false,
            db_engine: 'postgres',
            db_name: 'appdb',
            db_user: 'appuser',
            include_redis: false,
            include_kubernetes: true,
            k8s_namespace: collectedData.client_name,
            container_registry: 'ghcr.io/equaan',
            domain: `${collectedData.client_name}.example.com`,
            initial_replicas: collectedData.environment === 'prod' ? 3 : 1,
            min_replicas: collectedData.environment === 'prod' ? 2 : 1,
            max_replicas: collectedData.environment === 'prod' ? 10 : 3,
            cpu_request: '100m',
            memory_request: '128Mi',
            cpu_limit: collectedData.environment === 'prod' ? '500m' : '250m',
            memory_limit: collectedData.environment === 'prod' ? '512Mi' : '256Mi',
            cpu_target_utilization: 70,
            include_helm: true,
          },
        },
      };

    default:
      return baseData;
  }
}
