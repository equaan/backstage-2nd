// src/sessions.js
// Manages per-user conversation state in memory.
// Each Slack user gets their own isolated conversation history with the AI.
// State is lost on server restart — that's fine for a bot like this.

const sessions = new Map();

// How long to keep a session alive with no activity (30 minutes)
const SESSION_TTL_MS = 30 * 60 * 1000;

/**
 * Get or create a session for a Slack user.
 * @param {string} userId - Slack user ID (e.g. "U12345678")
 */
export function getSession(userId) {
  if (!sessions.has(userId)) {
    sessions.set(userId, {
      userId,
      messages: [],       // Full conversation history sent to the AI
      createdAt: Date.now(),
      lastActivityAt: Date.now(),
    });
  }
  const session = sessions.get(userId);
  session.lastActivityAt = Date.now();
  return session;
}

/**
 * Add a message to the user's conversation history.
 * @param {string} userId
 * @param {'user'|'assistant'} role
 * @param {string} content
 */
export function addMessage(userId, role, content) {
  const session = getSession(userId);
  session.messages.push({ role, content });
  session.lastActivityAt = Date.now();
}

/**
 * Clear the conversation history for a user (after a template is triggered,
 * or when the user says "cancel").
 */
export function clearSession(userId) {
  sessions.delete(userId);
}

/**
 * Check if a user has an active session.
 */
export function hasSession(userId) {
  return sessions.has(userId) && sessions.get(userId).messages.length > 0;
}

// Clean up stale sessions every 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [userId, session] of sessions.entries()) {
    if (now - session.lastActivityAt > SESSION_TTL_MS) {
      sessions.delete(userId);
      console.log(`[Sessions] Expired session for ${userId}`);
    }
  }
}, 10 * 60 * 1000);