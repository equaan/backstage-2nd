// src/backstage.js
// Handles all communication with the Backstage scaffolder API.
// Triggers templates, polls for completion, returns the PR URL.
// No normalization needed here — flows.js controls the data shape exactly.

import axios from 'axios';

const BACKSTAGE_URL = process.env.BACKSTAGE_URL || 'http://localhost:7007';
const BACKSTAGE_TOKEN = process.env.BACKSTAGE_TOKEN;

// Map friendly template names → Backstage template refs.
// These must match the metadata.name in your catalog-info.yaml files exactly.
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

function headers() {
  return {
    'Content-Type': 'application/json',
    ...(BACKSTAGE_TOKEN && { 'Authorization': `Bearer ${BACKSTAGE_TOKEN}` }),
  };
}

/**
 * Trigger a Backstage scaffolder template.
 * @param {string} templateName - friendly name like "aws-infrastructure"
 * @param {object} values - the fully built values from buildDefaultValues()
 * @returns {string} taskId
 */
export async function triggerTemplate(templateName, values) {
  const templateRef = TEMPLATE_REFS[templateName];
  if (!templateRef) {
    throw new Error(`Unknown template: "${templateName}". Available: ${Object.keys(TEMPLATE_REFS).join(', ')}`);
  }

  const payload = { templateRef, values };

  console.log(`[Backstage] Triggering: ${templateRef}`);
  console.log(`[Backstage] Values:`, JSON.stringify(values, null, 2));

  const response = await axios.post(
    `${BACKSTAGE_URL}/api/scaffolder/v2/tasks`,
    payload,
    { headers: headers() }
  );

  const taskId = response.data.id;
  console.log(`[Backstage] Task created: ${taskId}`);
  return taskId;
}

/**
 * Poll a scaffolder task until it completes or fails.
 * @param {string} taskId
 * @param {function} onProgress - called with status string on each change
 * @returns {{ success: boolean, prUrl: string|null, error: string|null }}
 */
export async function waitForTask(taskId, onProgress) {
  const maxWaitMs = 5 * 60 * 1000; // 5 minutes
  const pollIntervalMs = 3000;
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

    if (status !== lastStatus) {
      lastStatus = status;
      if (onProgress) onProgress(status);
    }

    if (status === 'completed') {
      console.log(`[Backstage] Task output:`, JSON.stringify(task, null, 2));
      return { success: true, prUrl: extractPrUrl(task), error: null };
    }

    if (status === 'failed') {
      const failedStep = task.steps?.find(s => s.status === 'failed')?.name || 'unknown step';
      return { success: false, prUrl: null, error: failedStep };
    }
  }

  return { success: false, prUrl: null, error: 'Timed out after 5 minutes' };
}

function extractPrUrl(task) {
  // Try to find links in the output
  const links = task.spec?.output?.links || task.output?.links || [];
  const prLink = links.find(l => l.url?.includes('github.com') && l.url?.includes('/pull/'));
  if (prLink) return prLink.url;
  if (links.length > 0) return links[0].url;

  // Check if the output directly contains a remoteUrl or prUrl
  const output = task.spec?.output || task.output || {};
  if (output.remoteUrl && !output.remoteUrl.includes('${{')) {
    return output.remoteUrl;
  }
  if (output.prUrl && !output.prUrl.includes('${{')) {
    return output.prUrl;
  }

  // Check task steps for any output containing a URL
  const steps = task.steps || [];
  for (const step of steps) {
    if (step.output) {
      const outputStr = typeof step.output === 'string' ? step.output : JSON.stringify(step.output);
      const urlMatch = outputStr.match(/(https:\/\/[^\s]+)/);
      if (urlMatch && urlMatch[1].includes('github.com')) {
        return urlMatch[1];
      }
    }
  }

  return null;
}

/**
 * Health check — verify Backstage is reachable before starting the bot.
 */
export async function checkBackstageHealth() {
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

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}