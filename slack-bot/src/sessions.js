// src/sessions.js
// Per-user state machine sessions.
// No AI — each user has a current step index and collected data.
// State is in-memory and lost on restart, which is fine for a bot.

const sessions = new Map();
const SESSION_TTL_MS = 30 * 60 * 1000; // 30 minutes

/**
 * Start a new session for a user on a given template flow.
 */
export function startSession(userId, templateName) {
  sessions.set(userId, {
    userId,
    templateName,
    step: 0,          // index into the flow's steps array
    data: {},         // answers collected so far
    lastActivityAt: Date.now(),
  });
}

/**
 * Get the current session for a user. Returns null if none.
 */
export function getSession(userId) {
  const session = sessions.get(userId);
  if (!session) return null;
  session.lastActivityAt = Date.now();
  return session;
}

/**
 * Check if a user has an active session.
 */
export function hasSession(userId) {
  return sessions.has(userId);
}

/**
 * Clear the session (after template triggered or user cancels).
 */
export function clearSession(userId) {
  sessions.delete(userId);
}

// Expire stale sessions every 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [userId, session] of sessions.entries()) {
    if (now - session.lastActivityAt > SESSION_TTL_MS) {
      sessions.delete(userId);
      console.log(`[Sessions] Expired session for ${userId}`);
    }
  }
}, 10 * 60 * 1000);