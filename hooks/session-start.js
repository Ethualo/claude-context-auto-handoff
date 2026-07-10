#!/usr/bin/env node
import { readStdinJson, resolveProjectRoot, readHandoff } from './lib/frontmatter.js';

const input = readStdinJson();
const projectRoot = resolveProjectRoot(input);
const handoff = readHandoff(projectRoot);

if (!handoff) process.exit(0);

const ageLabel = handoff.ageDays < 1
  ? `${Math.max(1, Math.round(handoff.ageDays * 24))}h`
  : `${Math.round(handoff.ageDays)}d`;

const topics = handoff.keywords.length > 0
  ? handoff.keywords.join(', ')
  : '(no keywords tagged)';

const context = `Prior handoff exists (${ageLabel} old, project: ${handoff.fields.project || 'unknown'}). Topics: ${topics}. If continuing that work, mention it or run /handoff-resume.`;

console.log(JSON.stringify({
  hookSpecificOutput: {
    hookEventName: 'SessionStart',
    additionalContext: context
  }
}));
