#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import * as fs from 'fs';
import * as path from 'path';

const server = new McpServer({
  name: 'context-handoff-manager',
  version: '1.0.0'
});


server.tool(
  'generate_handoff_manifest',
  {
    summary: z.string().optional().describe('Detailed session recap — omit if other fields cover it'),
    nextSteps: z.array(z.string()).describe('Tasks to continue immediately in the next session'),
    taskDescription: z.string().optional().describe('High-level goal + core intent (why this matters). Use telegraphese — drop articles/pronouns.'),
    currentStatus: z.string().optional().describe('What is done vs what remains. State why, not just what.'),
    keyDecisions: z.array(z.string()).optional().describe('Architecture choices and why — prevents post-compaction amnesia. Format: "Decision: X — Reason: Y"'),
    failedApproaches: z.array(z.string()).optional().describe('Already-failed attempts. Format each: "Approach: X → Result: Y → Lesson: Z". Prevents repeating mistakes.'),
    blockers: z.string().optional().describe('Unresolved errors or blockers'),
    modifiedFiles: z.array(z.string()).optional().describe('Changed files with delta notes. Format: "path/to/file: what changed" — NO code snippets, path+delta only.'),
    implicitRules: z.array(z.string()).optional().describe('Tech stack, naming conventions, env vars, implicit project rules — anything not derivable from reading code')
  },
  async ({ summary, nextSteps, taskDescription, currentStatus, keyDecisions, failedApproaches, blockers, modifiedFiles, implicitRules }) => {
    try {
      const claudeDir = path.join(process.cwd(), '.claude');
      const handoffsDir = path.join(claudeDir, 'handoffs');

      if (!fs.existsSync(claudeDir)) fs.mkdirSync(claudeDir, { recursive: true });
      if (!fs.existsSync(handoffsDir)) fs.mkdirSync(handoffsDir, { recursive: true });

      const now = new Date();
      const displayTime = now.toLocaleString();
      const timestamp = now.toISOString().replace(/[:.]/g, '-');

      const content = buildMarkdown({ summary, nextSteps, taskDescription, currentStatus, keyDecisions, failedApproaches, blockers, modifiedFiles, implicitRules, displayTime });

      const mainPath = path.join(claudeDir, 'handoff.md');
      fs.writeFileSync(mainPath, content, 'utf-8');

      const archivePath = path.join(handoffsDir, `handoff-${timestamp}.md`);
      fs.writeFileSync(archivePath, content, 'utf-8');

      return {
        content: [{
          type: 'text',
          text: `Handoff saved.\nLatest: ${mainPath}\nArchive: ${archivePath}`
        }]
      };
    } catch (error: any) {
      return {
        isError: true,
        content: [{ type: 'text', text: `Save error: ${error.message}` }]
      };
    }
  }
);

function buildMarkdown(params: {
  summary?: string;
  nextSteps: string[];
  taskDescription?: string;
  currentStatus?: string;
  keyDecisions?: string[];
  failedApproaches?: string[];
  blockers?: string;
  modifiedFiles?: string[];
  implicitRules?: string[];
  displayTime: string;
}): string {
  const { summary, nextSteps, taskDescription, currentStatus, keyDecisions, failedApproaches, blockers, modifiedFiles, implicitRules, displayTime } = params;

  const sections: string[] = [
    `# Session Handoff Snapshot`,
    `> **Generated:** ${displayTime}`,
    ``
  ];

  if (taskDescription) {
    sections.push(`## 🎯 High-Level Objective\n* **Goal:** ${taskDescription}\n`);
  }

  const stateLines: string[] = [];
  if (currentStatus) stateLines.push(`* **Status:** ${currentStatus}`);
  if (blockers) stateLines.push(`* **Blocker:** ${blockers}`);
  if (nextSteps.length > 0) stateLines.push(`* **Next Action:** ${nextSteps[0]}`);
  if (stateLines.length > 0) {
    sections.push(`## 📌 Current State & Next Steps\n${stateLines.join('\n')}\n`);
    if (nextSteps.length > 1) {
      sections.push(`### Remaining Queue\n${nextSteps.slice(1).map(s => `- [ ] ${s}`).join('\n')}\n`);
    }
  } else {
    sections.push(`## 📌 Next Steps\n${nextSteps.map(s => `- [ ] ${s}`).join('\n')}\n`);
  }

  if (modifiedFiles && modifiedFiles.length > 0) {
    sections.push(`## 🛠️ Modified Files Delta\n${modifiedFiles.map(f => `* ${f}`).join('\n')}\n`);
  }

  if (failedApproaches && failedApproaches.length > 0) {
    sections.push(`## 🚫 Failed Approaches (DO NOT RETRY)\n${failedApproaches.map(f => `* ${f}`).join('\n')}\n`);
  }

  if (implicitRules && implicitRules.length > 0) {
    sections.push(`## 🔑 Crucial Context & Implicit Rules\n${implicitRules.map(r => `* ${r}`).join('\n')}\n`);
  }

  if (keyDecisions && keyDecisions.length > 0) {
    sections.push(`## Key Decisions\n${keyDecisions.map(d => `- ${d}`).join('\n')}\n`);
  }

  if (summary) {
    sections.push(`## Summary\n${summary}\n`);
  }

  sections.push(`---\n*Context is auto-restored on session start. Manual restore: \`/resume\`*`);

  return sections.join('\n');
}

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Context Handoff MCP Server running on stdio');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});