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
    keywords: z.array(z.string()).max(8).optional().describe('Short topic/feature tags (e.g. file names, feature names) used to match a future session prompt for auto-resume. Write in English, lowercase, 1-3 words each.'),
    workingDirectory: z.string().optional().describe('Absolute path to the project root where handoff.md should be written. Required on Windows where process.cwd() may return System32.')
  },
  async ({ summary, nextSteps, taskDescription, currentStatus, keyDecisions, failedApproaches, blockers, modifiedFiles, implicitRules, keywords, workingDirectory }) => {
    try {
      const projectRoot = workingDirectory || process.env['CLAUDE_PROJECT_DIR'] || process.cwd();
      const claudeDir = path.join(projectRoot, '.claude');
      const handoffsDir = path.join(claudeDir, 'handoffs');

      fs.mkdirSync(claudeDir, { recursive: true });
      fs.mkdirSync(handoffsDir, { recursive: true });

      const now = new Date();
      const displayTime = now.toLocaleString();
      const timestamp = now.toISOString().replace(/[:.]/g, '-');

      const content = buildMarkdown({ summary, nextSteps, taskDescription, currentStatus, keyDecisions, failedApproaches, blockers, modifiedFiles, implicitRules, keywords, displayTime, project: path.basename(projectRoot), isoDate: now.toISOString() });

      const mainPath = path.join(claudeDir, 'handoff.md');
      fs.writeFileSync(mainPath, content, 'utf-8');

      const dateDir = path.join(handoffsDir, now.toISOString().slice(0, 10));
      fs.mkdirSync(dateDir, { recursive: true });
      const archivePath = path.join(dateDir, `handoff-${timestamp}.md`);
      fs.writeFileSync(archivePath, content, 'utf-8');

      appendIndexEntry(handoffsDir, {
        isoDate: now.toISOString(),
        keywords: keywords ?? [],
        headline: taskDescription || summary || nextSteps[0] || '(no summary)',
        relativePath: path.relative(handoffsDir, archivePath).replace(/\\/g, '/')
      });

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

function appendIndexEntry(handoffsDir: string, entry: {
  isoDate: string;
  keywords: string[];
  headline: string;
  relativePath: string;
}): void {
  const indexPath = path.join(handoffsDir, 'index.md');
  const headline = entry.headline.replace(/\|/g, '-').replace(/\s+/g, ' ').trim().slice(0, 120);
  const keywords = entry.keywords.join(', ') || '(none)';
  const line = `${entry.isoDate} | ${keywords} | ${headline} | ${entry.relativePath}\n`;

  fs.appendFileSync(indexPath, line, 'utf-8');

  const lines = fs.readFileSync(indexPath, 'utf-8').split('\n').filter(Boolean);
  const excess = lines.length - 50;
  if (excess > 0) {
    fs.writeFileSync(indexPath, lines.slice(excess).join('\n') + '\n', 'utf-8');
  }
}

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
  keywords?: string[];
  displayTime: string;
  project: string;
  isoDate: string;
}): string {
  const { summary, nextSteps, taskDescription, currentStatus, keyDecisions, failedApproaches, blockers, modifiedFiles, implicitRules, keywords, displayTime, project, isoDate } = params;

  const frontmatter = [
    `---`,
    `date: ${isoDate}`,
    `project: ${project}`,
    `next_steps_count: ${nextSteps.length}`,
    `has_blockers: ${Boolean(blockers)}`,
    `keywords: ${(keywords ?? []).join(', ')}`,
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

  sections.push(`---\n*A short hint surfaces on session start; full context loads only if your next prompt matches a keyword above, or via manual \`/handoff-resume\`.*`);

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