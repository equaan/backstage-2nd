// src/index.js
// Main entry point. Sets up the Slack Bolt app, handles all incoming messages,
// and orchestrates the AI conversation + Backstage template triggering.

import 'dotenv/config';
import bolt from '@slack/bolt';
import { chat, parseTrigger } from './ai.js';
import { triggerTemplate, waitForTask, checkBackstageHealth } from './backstage.js';
import { getSession, addMessage, clearSession, hasSession } from './sessions.js';

const { App } = bolt;

// ── Startup checks ────────────────────────────────────────────────────────────
if (!process.env.SLACK_BOT_TOKEN) throw new Error('Missing SLACK_BOT_TOKEN in .env');
if (!process.env.SLACK_SIGNING_SECRET) throw new Error('Missing SLACK_SIGNING_SECRET in .env');
if (!process.env.AI_API_KEY) throw new Error('Missing AI_API_KEY in .env');

// ── Slack app setup ───────────────────────────────────────────────────────────
const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  socketMode: false, // We use HTTP mode (Events API), not WebSocket
});

// ── Message handler ───────────────────────────────────────────────────────────
// This fires when:
// 1. Someone sends a DM directly to the bot
// 2. Someone @mentions the bot in a channel
app.message(async ({ message, say, client }) => {
  // Ignore bot messages (including our own replies) to avoid loops
  if (message.bot_id || message.subtype) return;

  const userId = message.user;
  const text = (message.text || '').trim();

  if (!text) return;

  console.log(`[Bot] Message from ${userId}: "${text}"`);

  // ── Cancel command ──────────────────────────────────────────────────────────
  const cancelWords = ['cancel', 'stop', 'nevermind', 'never mind', 'abort', 'quit', 'exit'];
  if (cancelWords.some(w => text.toLowerCase().includes(w))) {
    if (hasSession(userId)) {
      clearSession(userId);
      await say('Cancelled. Session cleared. Say hi whenever you want to start again! 👋');
    } else {
      await say("No active session to cancel. Say `hi` or describe what you want to set up!");
    }
    return;
  }

  // ── Status command ──────────────────────────────────────────────────────────
  if (text.toLowerCase() === 'status' || text.toLowerCase() === 'help') {
    await say(helpText());
    return;
  }

  // ── Show typing indicator while we process ──────────────────────────────────
  // This shows the "..." bubble in Slack while the AI thinks
  await postTyping(client, message.channel);

  // ── Add user message to conversation history ────────────────────────────────
  addMessage(userId, 'user', text);
  const session = getSession(userId);

  let aiResponse;
  try {
    aiResponse = await chat(session.messages);
  } catch (err) {
    console.error('[AI] Error:', err.message);
    await say(`❌ AI error: ${err.message}\n\nPlease try again.`);
    return;
  }

  // Store the AI's reply in conversation history
  addMessage(userId, 'assistant', aiResponse);

  // ── Check if the AI wants to trigger a template ─────────────────────────────
  const trigger = parseTrigger(aiResponse);

  if (trigger) {
    // The AI has collected all fields and the user confirmed — fire the template!
    await handleTemplateTrigger(trigger, userId, say, client, message.channel);
  } else {
    // Normal conversational reply — just send it back to Slack
    // Strip the JSON block if it accidentally appeared in a non-trigger message
    const cleanResponse = aiResponse.replace(/```json[\s\S]*?```/g, '').trim();
    await say(cleanResponse);
  }
});

// ── Handle the actual template trigger ───────────────────────────────────────
async function handleTemplateTrigger(trigger, userId, say, client, channel) {
  const { template, values } = trigger;

  // Post initial "working on it" message
  const workingMsg = await say(
    `🚀 *Triggering template: \`${template}\`*\n` +
    `_Connecting to Backstage..._`
  );

  let taskId;
  try {
    taskId = await triggerTemplate(template, values);
  } catch (err) {
    console.error('[Backstage] Trigger error:', err.message);
    const details = err.response?.data
      ? `\nDetails: \`${JSON.stringify(err.response.data)}\``
      : '';
    await say(
      `❌ *Failed to trigger template*\n` +
      `Error: \`${err.message}\`\n\n` +
      details +
      `Check that Backstage is running at \`${process.env.BACKSTAGE_URL}\` and your token is valid.`
    );
    clearSession(userId);
    return;
  }

  // Update the message to show we're polling
  await updateMessage(client, channel, workingMsg.ts,
    `⏳ *Template running...*\n` +
    `Task ID: \`${taskId}\`\n` +
    `_Waiting for Backstage to complete the scaffolding..._`
  );

  // Poll until done
  const result = await waitForTask(taskId, async (status) => {
    console.log(`[Backstage] Task ${taskId} status: ${status}`);
  });

  // Clear the session — this conversation is done
  clearSession(userId);

  if (result.success) {
    const prLine = result.prUrl
      ? `\n\n🔗 *Pull Request:* ${result.prUrl}`
      : '\n\n_(PR link not found in task output — check Backstage UI)_';

    await updateMessage(client, channel, workingMsg.ts,
      `✅ *Template completed successfully!*\n` +
      `Template: \`${template}\`${prLine}\n\n` +
      `The PR has been opened on the client repository. Review and merge when ready.`
    );
  } else {
    await updateMessage(client, channel, workingMsg.ts,
      `❌ *Template failed*\n` +
      `Failed at step: \`${result.error}\`\n\n` +
      `Check the Backstage UI for full logs: ${process.env.BACKSTAGE_URL}/create/tasks/${taskId}`
    );
  }
}

// ── Utility: update an existing Slack message ─────────────────────────────────
async function updateMessage(client, channel, ts, text) {
  try {
    await client.chat.update({ channel, ts, text });
  } catch (err) {
    console.error('[Slack] Failed to update message:', err.message);
  }
}

// ── Utility: show typing indicator ────────────────────────────────────────────
async function postTyping(client, channel) {
  try {
    await client.conversations.typing({ channel });
  } catch {
    // Typing indicator is best-effort — ignore failures
  }
}

// ── Help text ─────────────────────────────────────────────────────────────────
function helpText() {
  return `*Opt IT Infrastructure Bot* 🤖

I can trigger Backstage templates for you via conversation.

*Available templates:*
• \`client-onboarding\` ⭐ — Full onboarding (infra + CI/CD + observability + security + containers)
• \`aws-infrastructure\` — AWS with Terraform or CloudFormation
• \`azure-infrastructure\` — Azure
• \`gcp-infrastructure\` — GCP
• \`cicd-pipeline\` — CI/CD pipelines only
• \`observability-stack\` — Prometheus + Grafana + Alertmanager
• \`security-scan\` — Trivy + OWASP scanning
• \`container-setup\` — Dockerfile, K8s, Helm

*Commands:*
• Just describe what you want — I'll ask the right questions
• \`cancel\` — abort current session
• \`status\` / \`help\` — show this message

*Example:* _"I need to onboard a new client called acme-corp on production AWS"_`;
}

// ── Start the server ──────────────────────────────────────────────────────────
(async () => {
  const port = parseInt(process.env.PORT || '3000');

  // Check Backstage connectivity
  console.log(`[Startup] Checking Backstage at ${process.env.BACKSTAGE_URL}...`);
  const backstageOk = await checkBackstageHealth();
  if (backstageOk) {
    console.log(`[Startup] ✅ Backstage is reachable`);
  } else {
    console.warn(`[Startup] ⚠️  Backstage not reachable at ${process.env.BACKSTAGE_URL}`);
    console.warn(`[Startup]    Bot will start anyway — check your BACKSTAGE_URL in .env`);
  }

  await app.start(port);

  console.log(`[Startup] ✅ Slack bot running on port ${port}`);
  console.log(`[Startup] AI provider: ${process.env.AI_PROVIDER || 'groq'}`);
  console.log(`[Startup] Backstage URL: ${process.env.BACKSTAGE_URL}`);
  console.log(`[Startup] Make sure Slack's Events API points to: http://YOUR-SERVER:${port}/slack/events`);
})();
