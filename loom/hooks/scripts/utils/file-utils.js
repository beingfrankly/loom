import { readFileSync, existsSync } from 'node:fs';
import { dirname, basename, join } from 'node:path';
import { homedir } from 'node:os';
import { Verdict } from './constants.js';

/**
 * Check if a review file exists and contains APPROVED verdict
 * @param {string} reviewFilePath - Path to the review file
 * @returns {boolean}
 */
export function checkReviewApproved(reviewFilePath) {
  if (!existsSync(reviewFilePath)) {
    return false;
  }

  try {
    const content = readFileSync(reviewFilePath, 'utf-8');
    // Check for APPROVED verdict (case-insensitive, allowing for markdown formatting)
    // Matches: **Verdict:** APPROVED or Verdict: APPROVED
    return /^\*\*Verdict:\*\*.*APPROVED|^Verdict:.*APPROVED/im.test(content);
  } catch {
    return false;
  }
}

/**
 * Extract verdict from text (APPROVED, NEEDS_REVISION, or REJECTED)
 * @param {string} text - Text to search for verdict
 * @returns {string|null} The verdict or null if not found
 */
export function extractVerdict(text) {
  if (!text) return null;

  if (/APPROVED/i.test(text)) {
    return Verdict.APPROVED;
  }
  if (/NEEDS_REVISION/i.test(text)) {
    return Verdict.NEEDS_REVISION;
  }
  if (/REJECTED/i.test(text)) {
    return Verdict.REJECTED;
  }
  return null;
}

/**
 * Extract session directory from prompt text
 * Looks for ticket ID pattern in .claude/loom/threads/ paths
 * @param {string} prompt - Prompt text to search
 * @returns {string|null} The session directory path or null
 */
export function extractSessionDir(prompt) {
  if (!prompt) return null;

  // Match ticket ID - flexible pattern to support various formats:
  // - PROJ-123 (Jira style)
  // - PROJ-123-456 (multi-segment)
  // - feature/auth-flow (branch-style with slashes)
  // - abc_123 (underscore style)
  // Captures any sequence of word chars, hyphens, underscores, and forward slashes
  const match = prompt.match(/\.claude\/loom\/threads\/([\w\-\/]+?)(?:\/[\w\-]+\.md|$|\s|['"`])/);
  if (!match) return null;

  const ticketId = match[1];

  // Search for the session directory in common locations
  const searchBases = [process.cwd(), homedir()];

  for (const base of searchBases) {
    const candidatePath = join(base, '.claude', 'loom', 'threads', ticketId);
    if (existsSync(candidatePath)) {
      return candidatePath;
    }
  }

  return null;
}

/**
 * Check if a file path is a loom artifact (in .claude/loom/threads/)
 * @param {string} filePath - Path to check
 * @returns {boolean}
 */
export function isLoomArtifactPath(filePath) {
  return filePath && filePath.includes('.claude/loom/threads/');
}

/**
 * Get session directory and filename from a loom artifact path
 * @param {string} filePath - Path to the artifact
 * @returns {{ sessionDir: string, filename: string } | null}
 */
export function parseArtifactPath(filePath) {
  if (!isLoomArtifactPath(filePath)) {
    return null;
  }

  return {
    sessionDir: dirname(filePath),
    filename: basename(filePath)
  };
}

/**
 * Get ticket ID from session directory path
 * @param {string} sessionDir - Session directory path
 * @returns {string} The ticket ID (last component of path)
 */
export function getTicketId(sessionDir) {
  return basename(sessionDir);
}
