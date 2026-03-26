// src/backstage.js
// Handles all communication with the Backstage scaffolder API.
// Triggers templates, polls for completion, returns the PR URL.

import axios from 'axios';

const BACKSTAGE_URL = process.env.BACKSTAGE_URL || 'http://localhost:7007';
const BACKSTAGE_TOKEN = process.env.BACKSTAGE_TOKEN;

// Map of friendly template names → Backstage template refs
// These must match what's registered in your catalog-info.yaml
const TEMPLATE_REFS = {
  'client-onboarding':    'template:default/client-onboarding',
  'aws-infrastructure':   'template:default/aws-infrastructure',
  'azure-infrastructure': 'template:default/azure-infrastructure',
  'gcp-infrastructure':   'template:default/gcp-infrastructure',
  'cicd-pipeline':        'template:default/cicd-pipeline',
  'observability-stack':  'template:default/observability-stack',
  'security-scan':        'template:default/security-scan',
  'container-setup':      'template:default/container-setup',
};

const AWS_RESOURCE_ORDER = [
  'vpc',
  'subnets',
  'security_groups',
  'ec2',
  's3',
  'rds',
];

function headers() {
  return {
    'Content-Type': 'application/json',
    // Backstage uses a static token for external API access.
    // See README for how to configure this in your app-config.yaml.
    ...(BACKSTAGE_TOKEN && { 'Authorization': `Bearer ${BACKSTAGE_TOKEN}` }),
  };
}

/**
 * Trigger a Backstage scaffolder template.
 * @param {string} templateName - friendly name like "client-onboarding"
 * @param {object} values - the form values collected by the AI
 * @returns {string} taskId
 */
export async function triggerTemplate(templateName, values) {
  const templateRef = TEMPLATE_REFS[templateName];
  if (!templateRef) {
    throw new Error(`Unknown template: "${templateName}". Available: ${Object.keys(TEMPLATE_REFS).join(', ')}`);
  }

  const normalizedValues = normalizeTemplateValues(templateName, values);

  const payload = {
    templateRef,
    values: normalizedValues,
  };

  console.log(`[Backstage] Triggering template: ${templateRef}`);
  console.log(`[Backstage] Values:`, JSON.stringify(normalizedValues, null, 2));

  const response = await axios.post(
    `${BACKSTAGE_URL}/api/scaffolder/v2/tasks`,
    payload,
    { headers: headers() }
  );

  const taskId = response.data.id;
  console.log(`[Backstage] Task created: ${taskId}`);
  return taskId;
}

function normalizeTemplateValues(templateName, values) {
  if (templateName !== 'aws-infrastructure') {
    return values;
  }

  const normalized = { ...values };

  normalized.client_name = slugify(values.client_name);
  normalized.environment = normalizeEnvironment(values.environment);
  normalized.aws_region = values.aws_region || 'us-east-1';
  normalized.repoUrl = normalizeRepoUrl(values);
  normalized.iac_tool = normalizeIacTool(values.iac_tool);
  normalized.setup_cicd = toBoolean(values.setup_cicd);

  const workflows = normalizeWorkflowList(values.github_actions_workflows);
  if (workflows.length > 0) {
    normalized.github_actions_workflows = workflows;
  }

  if (values.cicd_tool) {
    normalized.cicd_tool = String(values.cicd_tool).trim().toLowerCase().replace(/\s+/g, '-');
  }

  normalized.iac_resources = normalizeAwsResources(values.iac_resources);

  return normalized;
}

function normalizeAwsResources(iacResources = {}) {
  const config = { ...(iacResources.config || {}) };
  const resourceSet = new Set();

  const addResource = value => {
    const normalized = normalizeAwsResourceName(value);
    if (normalized) {
      resourceSet.add(normalized);
    }
  };

  if (Array.isArray(iacResources.resources)) {
    iacResources.resources.forEach(addResource);
  } else if (typeof iacResources.resources === 'string') {
    iacResources.resources
      .split(/[\s,]+/)
      .filter(Boolean)
      .forEach(addResource);
  }

  const orderedResources = AWS_RESOURCE_ORDER.filter(resource => resourceSet.has(resource));

  if (orderedResources.includes('vpc') && !config.vpc_cidr) {
    config.vpc_cidr = '10.0.0.0/16';
  }
  if (orderedResources.includes('ec2') && !config.ec2_instance_type) {
    config.ec2_instance_type = 't3.medium';
  }
  if (orderedResources.includes('s3') && config.s3_versioning === undefined) {
    config.s3_versioning = true;
  }
  if (orderedResources.includes('rds') && !config.rds_engine) {
    config.rds_engine = 'postgres';
  }

  return {
    resources: orderedResources.join('_'),
    config,
  };
}

function normalizeAwsResourceName(value) {
  const normalized = String(value)
    .trim()
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[\s-]+/g, '_');

  const aliases = {
    security_group: 'security_groups',
    security_groups: 'security_groups',
    security: 'security_groups',
    groups: 'security_groups',
    subnets: 'subnets',
    subnet: 'subnets',
    vpc: 'vpc',
    ec2: 'ec2',
    s3: 's3',
    rds: 'rds',
  };

  return aliases[normalized];
}

function normalizeWorkflowList(workflows) {
  if (!workflows) {
    return [];
  }

  const items = Array.isArray(workflows)
    ? workflows
    : String(workflows).split(/[\s,]+/).filter(Boolean);

  const allowed = new Set(['build', 'test', 'deploy']);
  const normalized = items
    .map(item => String(item).trim().toLowerCase())
    .filter(item => allowed.has(item));

  return [...new Set(normalized)];
}

function normalizeRepoUrl(values) {
  if (values.repoUrl) {
    return String(values.repoUrl).trim();
  }

  if (values.github_owner && values.repo_name) {
    return `github.com?owner=${values.github_owner}&repo=${values.repo_name}`;
  }

  return values.repoUrl;
}

function normalizeIacTool(value) {
  return String(value || 'terraform').trim().toLowerCase();
}

function normalizeEnvironment(value) {
  const normalized = String(value || '').trim().toLowerCase();
  if (normalized === 'production') return 'prod';
  if (normalized === 'development') return 'dev';
  return normalized;
}

function slugify(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function toBoolean(value) {
  if (typeof value === 'boolean') {
    return value;
  }

  const normalized = String(value || '').trim().toLowerCase();
  return ['true', 'yes', 'y', '1'].includes(normalized);
}

/**
 * Poll a scaffolder task until it completes or fails.
 * @param {string} taskId
 * @param {function} onProgress - called with status updates while polling
 * @returns {{ success: boolean, prUrl: string|null, error: string|null }}
 */
export async function waitForTask(taskId, onProgress) {
  const maxWaitMs = 5 * 60 * 1000; // 5 minutes max
  const pollIntervalMs = 3000;      // check every 3 seconds
  const start = Date.now();

  let lastStatus = '';

  while (Date.now() - start < maxWaitMs) {
    await sleep(pollIntervalMs);

    const response = await axios.get(
      `${BACKSTAGE_URL}/api/scaffolder/v2/tasks/${taskId}`,
      { headers: headers() }
    );

    const task = response.data;
    const status = task.status;

    // Notify on status changes so we can update the Slack message
    if (status !== lastStatus) {
      lastStatus = status;
      if (onProgress) onProgress(status);
    }

    if (status === 'completed') {
      // Extract the PR URL from the task output
      const prUrl = extractPrUrl(task);
      return { success: true, prUrl, error: null };
    }

    if (status === 'failed') {
      const error = task.steps?.find(s => s.status === 'failed')?.name || 'Unknown step failed';
      return { success: false, prUrl: null, error };
    }

    // 'processing' or 'open' = still running, keep polling
  }

  return { success: false, prUrl: null, error: 'Timed out after 5 minutes' };
}

/**
 * Pull the PR URL out of the task output links.
 * Backstage returns output.links[] from the template's output section.
 */
function extractPrUrl(task) {
  const links = task.spec?.output?.links || task.output?.links || [];

  // Look for a link that looks like a GitHub PR
  const prLink = links.find(l =>
    l.url?.includes('github.com') && l.url?.includes('/pull/')
  );
  if (prLink) return prLink.url;

  // Fallback: return any link
  if (links.length > 0) return links[0].url;

  return null;
}

/**
 * Quick health check — verify Backstage is reachable before starting.
 */
export async function checkBackstageHealth() {
  try {
    await axios.get(`${BACKSTAGE_URL}/healthcheck`, {
      headers: headers(),
      timeout: 5000,
    });
    return true;
  } catch {
    // Try the catalog endpoint as a fallback health check
    try {
      await axios.get(`${BACKSTAGE_URL}/api/catalog/entities?limit=1`, {
        headers: headers(),
        timeout: 5000,
      });
      return true;
    } catch {
      return false;
    }
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
