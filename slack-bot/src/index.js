// src/index.js
// Main entry point. Pure state machine — no AI.
// Each user message is an answer to the current step's question.

import 'dotenv/config';
import bolt from '@slack/bolt';
import { triggerTemplate, waitForTask, checkBackstageHealth } from './backstage.js';
import { startSession, getSession, hasSession, clearSession } from './sessions.js';
import { FLOWS, TEMPLATE_META, detectTemplate, buildDefaultValues } from './flows.js';

const { App } = bolt;

if (!process.env.SLACK_BOT_TOKEN)      throw new Error('Missing SLACK_BOT_TOKEN in .env');
if (!process.env.SLACK_SIGNING_SECRET) throw new Error('Missing SLACK_SIGNING_SECRET in .env');

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  socketMode: false,
});

// ── Message handler ───────────────────────────────────────────────────────────
app.message(async ({ message, say, client }) => {
  if (message.bot_id || message.subtype) return;

  const userId  = message.user;
  const text    = (message.text || '').trim();
  if (!text) return;

  console.log(`[Bot] ${userId}: "${text}"`);
  const lowerText = text.toLowerCase();

  // ── Cancel ──────────────────────────────────────────────────────────────────
  const cancelWords = ['cancel', 'stop', 'nevermind', 'never mind', 'abort', 'quit', 'exit'];
  if (cancelWords.some(w => lowerText.includes(w))) {
    if (hasSession(userId)) {
      clearSession(userId);
      await say('Cancelled. Type `help` to see what I can do. 👋');
    } else {
      await say('No active session. Type `help` to see what I can do.');
    }
    return;
  }

  // ── Help ─────────────────────────────────────────────────────────────────────
  if (['help', 'hi', 'hello', 'hey'].includes(lowerText)) {
    await say(buildHelpText());
    return;
  }

  // ── No active session — detect which template they want ──────────────────────
  if (!hasSession(userId)) {
    const templateKey = detectTemplate(text);
    if (!templateKey) {
      await say(
        `I didn't recognise that. Here's what I can set up:\n\n${buildTemplateList()}\n\n` +
        `Just tell me what you need — e.g. _"aws infrastructure"_ or _"onboard a client"_.`
      );
      return;
    }

    startSession(userId, templateKey);
    const meta      = TEMPLATE_META[templateKey];
    const firstStep = FLOWS[templateKey][0];
    await say(`${meta.emoji} *${meta.label}* — let's set this up.\n\n${firstStep.ask}`);
    return;
  }

  // ── Active session ────────────────────────────────────────────────────────────
  const session = getSession(userId);

  // ── Awaiting confirmation (session.step is the string 'confirm') ──────────────
  if (session.step === 'confirm') {
    if (['yes', 'y', 'yep', 'yeah', 'confirm', 'go', 'proceed'].includes(lowerText)) {
      await handleTrigger(session, say, client, message.channel, userId);
    } else if (['no', 'n', 'nope', 'change', 'edit'].includes(lowerText)) {
      clearSession(userId);
      await say("Okay, cancelled. Start again whenever you're ready.");
    } else {
      await say('Please reply `yes` to proceed or `no` to cancel.');
    }
    return;
  }

  // ── Normal step — validate and advance ───────────────────────────────────────
  const flow        = FLOWS[session.templateName];
  const currentStep = flow[session.step];

  const error = currentStep.validate(text);
  if (error) {
    await say(`❌ ${error}\n\n${currentStep.ask}`);
    return; // stay on same step, don't advance
  }

  session.data[currentStep.key] = currentStep.transform(text);
  session.step++;

  // ── All steps answered — show summary ────────────────────────────────────────
  if (session.step >= flow.length) {
    await say(buildSummary(session.templateName, session.data));
    session.step = 'confirm'; // switch to confirmation mode
    return;
  }

  // ── Ask the next question ─────────────────────────────────────────────────────
  await say(flow[session.step].ask);
});

// ── Trigger the template ──────────────────────────────────────────────────────
async function handleTrigger(session, say, client, channel, userId) {
  const { templateName, data } = session;
  const finalValues = buildDefaultValues(templateName, data);

  const workingMsg = await say(
    `🚀 *Triggering: \`${templateName}\`*\n_Connecting to Backstage..._`
  );

  let taskId;
  try {
    taskId = await triggerTemplate(templateName, finalValues);
  } catch (err) {
    console.error('[Backstage] Error:', err.message);
    const detail = err.response?.data ? `\n\`${JSON.stringify(err.response.data)}\`` : '';
    await say(
      `❌ *Failed to trigger template*\nError: \`${err.message}\`${detail}\n\n` +
      `Check Backstage is running at \`${process.env.BACKSTAGE_URL}\` and the token is correct.`
    );
    clearSession(userId);
    return;
  }

  await updateMessage(client, channel, workingMsg.ts,
    `⏳ *Running...*\nTask: \`${taskId}\`\n_Waiting for Backstage to finish..._`
  );

  const result = await waitForTask(taskId, status => {
    console.log(`[Backstage] Task ${taskId}: ${status}`);
  });

  clearSession(userId);

  if (result.success) {
    const prLine = result.prUrl
      ? `\n\n🔗 *PR opened:* ${result.prUrl}`
      : '\n\n_(PR link not in task output — check Backstage UI)_';
    await updateMessage(client, channel, workingMsg.ts,
      `✅ *Done!* Template \`${templateName}\` completed.${prLine}`
    );
  } else {
    await updateMessage(client, channel, workingMsg.ts,
      `❌ *Template failed* at step: \`${result.error}\`\n` +
      `Full logs: ${process.env.BACKSTAGE_URL}/create/tasks/${taskId}`
    );
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildSummary(templateName, data) {
  const meta  = TEMPLATE_META[templateName];
  const lines = [`${meta.emoji} *${meta.label}* — ready to trigger.\n`];
  for (const [key, value] of Object.entries(data)) {
    lines.push(`• *${key}:* \`${value}\``);
  }
  lines.push('\nType `yes` to proceed or `no` to cancel.');
  return lines.join('\n');
}

function buildHelpText() {
  return (
    `*Opt IT Infrastructure Bot* 🤖\n\n` +
    `I trigger Backstage templates for you — no browser needed.\n\n` +
    `*Available templates:*\n${buildTemplateList()}\n\n` +
    `*Commands:*\n` +
    `• Just say what you need — e.g. _"aws infrastructure"_ or _"onboard a client"_\n` +
    `• \`cancel\` — abort current session\n` +
    `• \`help\` — show this message`
  );
}

function buildTemplateList() {
  return Object.entries(TEMPLATE_META)
    .map(([key, meta]) => `• ${meta.emoji} \`${key}\` — ${meta.label}`)
    .join('\n');
}

async function updateMessage(client, channel, ts, text) {
  try {
    await client.chat.update({ channel, ts, text });
  } catch (err) {
    console.error('[Slack] Failed to update message:', err.message);
  }
}

// ── Start ─────────────────────────────────────────────────────────────────────
(async () => {
  const port = parseInt(process.env.PORT || '3000');

  console.log(`[Startup] Checking Backstage at ${process.env.BACKSTAGE_URL}...`);
  const ok = await checkBackstageHealth();
  console.log(ok
    ? `[Startup] ✅ Backstage is reachable`
    : `[Startup] ⚠️  Backstage not reachable — bot will start anyway`
  );

  await app.start(port);
  console.log(`[Startup] ✅ Bot running on port ${port}`);
  console.log(`[Startup] Slack Events API URL: http://YOUR-SERVER:${port}/slack/events`);
})();