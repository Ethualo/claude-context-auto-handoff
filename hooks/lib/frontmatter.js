import * as fs from 'fs';
import * as path from 'path';

const STALE_DAYS = 7;

export function resolveProjectRoot(input) {
  return process.env.CLAUDE_PROJECT_DIR || (input && input.cwd) || process.cwd();
}

export function readStdinJson() {
  try {
    const raw = fs.readFileSync(0, 'utf-8');
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

// Returns null when the handoff is missing, unparseable, or older than STALE_DAYS.
export function readHandoff(projectRoot) {
  const handoffPath = path.join(projectRoot, '.claude', 'handoff.md');
  if (!fs.existsSync(handoffPath)) return null;

  let raw;
  try {
    raw = fs.readFileSync(handoffPath, 'utf-8');
  } catch {
    return null;
  }

  const match = raw.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return null;

  const fields = {};
  for (const line of match[1].split('\n')) {
    const idx = line.indexOf(':');
    if (idx === -1) continue;
    fields[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
  }

  if (!fields.date) return null;

  const ageDays = (Date.now() - new Date(fields.date).getTime()) / 86400000;
  if (!Number.isFinite(ageDays) || ageDays > STALE_DAYS) return null;

  const keywords = (fields.keywords || '')
    .split(',')
    .map((k) => k.trim().toLowerCase())
    .filter(Boolean);

  return { path: handoffPath, raw, fields, ageDays, keywords };
}
