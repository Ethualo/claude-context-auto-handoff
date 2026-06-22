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

const CONTEXT_THRESHOLD = parseInt(process.env.CONTEXT_THRESHOLD ?? '70', 10);

server.tool(
  'generate_handoff_manifest',
  {
    summary: z.string().describe('Full recap of work done this session'),
    nextSteps: z.array(z.string()).describe('Tasks to continue immediately in the next session'),
    taskDescription: z.string().optional().describe('The final goal of this work'),
    currentStatus: z.string().optional().describe('What is done vs what remains'),
    keyDecisions: z.array(z.string()).optional().describe('Architecture choices and why — prevents post-compaction amnesia'),
    failedApproaches: z.array(z.string()).optional().describe('Already-failed attempts — prevents repeating mistakes next session'),
    blockers: z.string().optional().describe('Unresolved errors or blockers')
  },
  async ({ summary, nextSteps, taskDescription, currentStatus, keyDecisions, failedApproaches, blockers }) => {
    try {
      const claudeDir = path.join(process.cwd(), '.claude');
      const handoffsDir = path.join(claudeDir, 'handoffs');

      if (!fs.existsSync(claudeDir)) fs.mkdirSync(claudeDir, { recursive: true });
      if (!fs.existsSync(handoffsDir)) fs.mkdirSync(handoffsDir, { recursive: true });

      const now = new Date();
      const displayTime = now.toLocaleString();
      const timestamp = now.toISOString().replace(/[:.]/g, '-');

      const content = buildMarkdown({ summary, nextSteps, taskDescription, currentStatus, keyDecisions, failedApproaches, blockers, displayTime });

      const mainPath = path.join(claudeDir, 'handoff.md');
      fs.writeFileSync(mainPath, content, 'utf-8');

      const archivePath = path.join(handoffsDir, `handoff-${timestamp}.md`);
      fs.writeFileSync(archivePath, content, 'utf-8');

      return {
        content: [{
          type: 'text',
          text: `Handoff saved.\nLatest: ${mainPath}\nArchive: ${archivePath}\n[Handoff Guard] threshold: ${CONTEXT_THRESHOLD}% | run /resume in next session`
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
  summary: string;
  nextSteps: string[];
  taskDescription?: string;
  currentStatus?: string;
  keyDecisions?: string[];
  failedApproaches?: string[];
  blockers?: string;
  displayTime: string;
}): string {
  const { summary, nextSteps, taskDescription, currentStatus, keyDecisions, failedApproaches, blockers, displayTime } = params;

  const sections: string[] = [
    `# AI Session Handoff Manifest`,
    `> **Generated:** ${displayTime}`,
    ``
  ];

  if (taskDescription) {
    sections.push(`## Task Description\n${taskDescription}\n`);
  }

  sections.push(`## Summary\n${summary}\n`);

  if (currentStatus) {
    sections.push(`## Current Status\n${currentStatus}\n`);
  }

  if (keyDecisions && keyDecisions.length > 0) {
    sections.push(`## Key Decisions\n${keyDecisions.map(d => `- ${d}`).join('\n')}\n`);
  }

  if (failedApproaches && failedApproaches.length > 0) {
    sections.push(`## Failed Approaches (DO NOT RETRY)\n${failedApproaches.map(f => `- ${f}`).join('\n')}\n`);
  }

  if (blockers) {
    sections.push(`## Active Blockers\n${blockers}\n`);
  }

  sections.push(`## Next Steps\n${nextSteps.map(s => `- [ ] ${s}`).join('\n')}\n`);
  sections.push(`---\n*Run \`/resume\` in the next session to restore this context.*`);

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