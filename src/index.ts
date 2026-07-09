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
    summary: z.string().optional().describe('Detailed session recap in English — omit if other fields cover it'),
    nextSteps: z.array(z.string()).describe('Tasks to continue immediately in the next session. Write in English.'),
    taskDescription: z.string().optional().describe('High-level goal + core intent (why this matters). Use telegraphese — drop articles/pronouns. Write in English.'),
    currentStatus: z.string().optional().describe('What is done vs what remains. State why, not just what. Write in English.'),
    keyDecisions: z.array(z.string()).optional().describe('Architecture choices and why — prevents post-compaction amnesia. Format: "Decision: X — Reason: Y". Write in English.'),
    failedApproaches: z.array(z.string()).optional().describe('Already-failed attempts. Format each: "Approach: X → Result: Y → Lesson: Z". Prevents repeating mistakes. Write in English.'),
    blockers: z.string().optional().describe('Unresolved errors or blockers. Write in English.'),
    modifiedFiles: z.array(z.string()).optional().describe('Changed files with delta notes. Format: "path/to/file: what changed" — NO code snippets, path+delta only.'),
    implicitRules: z.array(z.string()).optional().describe('Tech stack, naming conventions, env vars, implicit project rules — anything not derivable from reading code. Write in English.'),
    workingDirectory: z.string().optional().describe('Absolute path to the project root where handoff.md should be written. Required on Windows where process.cwd() may return System32.')
  },
  async ({ summary, nextSteps, taskDescription, currentStatus, keyDecisions, failedApproaches, blockers, modifiedFiles, implicitRules, workingDirectory }) => {
    try {
      const projectRoot = workingDirectory || process.env['CLAUDE_PROJECT_DIR'] || process.cwd();
      const claudeDir = path.join(projectRoot, '.claude');
      const handoffsDir = path.join(claudeDir, 'handoffs');

      fs.mkdirSync(claudeDir, { recursive: true });
      fs.mkdirSync(handoffsDir, { recursive: true });

      const now = new Date();
      const displayTime = now.toLocaleString();
      const timestamp = now.toISOString().replace(/[:.]/g, '-');

      const content = buildMarkdown({ summary, nextSteps, taskDescription, currentStatus, keyDecisions, failedApproaches, blockers, modifiedFiles, implicitRules, displayTime, project: path.basename(projectRoot), isoDate: now.toISOString() });

      const mainPath = path.join(claudeDir, 'handoff.md');
      fs.writeFileSync(mainPath, content, 'utf-8');

      const dateDir = path.join(handoffsDir, now.toISOString().slice(0, 10));
      fs.mkdirSync(dateDir, { recursive: true });
      const archivePath = path.join(dateDir, `handoff-${timestamp}.md`);
      fs.writeFileSync(archivePath, content, 'utf-8');

      pruneHandoffs(handoffsDir, 50);

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

function pruneHandoffs(handoffsDir: string, keep: number): void {
  const dateDirs = fs.readdirSync(handoffsDir, { withFileTypes: true }).filter(d => d.isDirectory());

  const files = dateDirs.flatMap(d => {
    const dirPath = path.join(handoffsDir, d.name);
    return fs.readdirSync(dirPath).map(name => ({ path: path.join(dirPath, name), name }));
  });

  files.sort((a, b) => a.name.localeCompare(b.name));
  const excess = files.length - keep;
  if (excess > 0) {
    files.slice(0, excess).forEach(f => fs.unlinkSync(f.path));
  }

  for (const d of dateDirs) {
    const dirPath = path.join(handoffsDir, d.name);
    if (fs.readdirSync(dirPath).length === 0) fs.rmdirSync(dirPath);
  }
}

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
  project: string;
  isoDate: string;
}): string {
  const { summary, nextSteps, taskDescription, currentStatus, keyDecisions, failedApproaches, blockers, modifiedFiles, implicitRules, displayTime, project, isoDate } = params;

  const frontmatter = [
    `---`,
    `date: ${isoDate}`,
    `project: ${project}`,
    `next_steps_count: ${nextSteps.length}`,
    `has_blockers: ${Boolean(blockers)}`,
    `---`,
    ``
  ].join('\n');

  const sections: string[] = [
    frontmatter,
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

  sections.push(`---\n*Context is auto-restored on session start. Manual restore: \`/handoff-resume\`*`);

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