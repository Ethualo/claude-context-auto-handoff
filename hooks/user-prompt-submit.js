#!/usr/bin/env node
import { readStdinJson, resolveProjectRoot, readHandoff } from './lib/frontmatter.js';

const input = readStdinJson();
const projectRoot = resolveProjectRoot(input);
const handoff = readHandoff(projectRoot);

if (!handoff || handoff.keywords.length === 0) process.exit(0);

const prompt = String(input.prompt || '').toLowerCase();
const matched = handoff.keywords.some((keyword) => prompt.includes(keyword));

if (!matched) process.exit(0);

console.log(JSON.stringify({
  hookSpecificOutput: {
    hookEventName: 'UserPromptSubmit',
    additionalContext: handoff.raw
  }
}));
