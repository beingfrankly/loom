import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Initialize state.json for a new loom session
 * @param {string} sessionDir - Path to the session directory
 * @param {string} ticketId - Ticket identifier
 * @returns {{ success: boolean, message: string, state?: object }}
 */
export function initState(sessionDir, ticketId) {
  if (!sessionDir || !ticketId) {
    return { success: false, message: 'Usage: initState(sessionDir, ticketId)' };
  }

  const stateFile = join(sessionDir, 'state.json');

  // Don't overwrite existing state
  if (existsSync(stateFile)) {
    return { success: true, message: `State file already exists at ${stateFile}` };
  }

  // Ensure directory exists
  if (!existsSync(sessionDir)) {
    mkdirSync(sessionDir, { recursive: true });
  }

  const timestamp = new Date().toISOString();
  const state = {
    ticket: ticketId,
    phase: 'context',
    context_reviewed: false,
    plan_reviewed: false,
    tasks_reviewed: false,
    current_task_id: null,
    task_status: null,
    cycle_count: 0,
    started_at: timestamp,
    last_updated: timestamp
  };

  writeFileSync(stateFile, JSON.stringify(state, null, 2));
  return { success: true, message: `Initialized state.json for ${ticketId}`, state };
}

/**
 * Read state.json or a specific field
 * @param {string} sessionDir - Path to the session directory
 * @param {string} [field] - Optional field name to read
 * @returns {{ success: boolean, value?: any, message?: string }}
 */
export function readState(sessionDir, field = null) {
  if (!sessionDir) {
    return { success: false, message: 'Usage: readState(sessionDir, [field])' };
  }

  const stateFile = join(sessionDir, 'state.json');

  if (!existsSync(stateFile)) {
    return { success: false, message: `No state.json found at ${stateFile}` };
  }

  try {
    const content = readFileSync(stateFile, 'utf-8');
    const state = JSON.parse(content);

    if (field === null) {
      return { success: true, value: state };
    }

    const value = state[field];
    return { success: true, value: value !== undefined ? value : null };
  } catch (err) {
    return { success: false, message: `Error reading state: ${err.message}` };
  }
}

/**
 * Update state.json fields atomically
 * @param {string} sessionDir - Path to the session directory
 * @param {object} updates - Object with field:value pairs to update
 * @returns {{ success: boolean, message: string, state?: object }}
 */
export function updateState(sessionDir, updates) {
  if (!sessionDir) {
    return { success: false, message: 'Usage: updateState(sessionDir, updates)' };
  }

  const stateFile = join(sessionDir, 'state.json');

  if (!existsSync(stateFile)) {
    return { success: false, message: `No state.json found at ${stateFile}` };
  }

  try {
    const content = readFileSync(stateFile, 'utf-8');
    const state = JSON.parse(content);

    // Apply updates
    for (const [key, value] of Object.entries(updates)) {
      state[key] = value;
    }

    // Always update last_updated timestamp
    state.last_updated = new Date().toISOString();

    writeFileSync(stateFile, JSON.stringify(state, null, 2));
    return { success: true, message: 'State updated successfully', state };
  } catch (err) {
    return { success: false, message: `Failed to update state: ${err.message}` };
  }
}

/**
 * Read a single field from state (convenience wrapper)
 * @param {string} sessionDir - Path to the session directory
 * @param {string} field - Field name to read
 * @returns {any} The field value or null if not found
 */
export function readStateField(sessionDir, field) {
  const result = readState(sessionDir, field);
  return result.success ? result.value : null;
}
