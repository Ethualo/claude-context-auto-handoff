#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import * as fs from 'fs';
import * as path from 'path';

// 1. MCP 서버 인스턴스 초기화
const server = new McpServer({
  name: 'context-handoff-manager',
  version: '1.0.0'
});

// 2. AI가 호출할 '핸드오프 요약본 생성' 도구(Tool) 등록
server.tool(
  'generate_handoff_manifest',
  {
    summary: z.string().describe('현재 세션의 핵심 작업 내용, 설계 결정 사항 및 현재 아키텍처 스택에 대한 압축 요약'),
    nextSteps: z.array(z.string()).describe('다음 세션에서 AI가 인계받아 즉시 시작해야 할 할 일(Todo) 목록'),
    blockers: z.string().optional().describe('현재 해결하지 못했거나 흐름을 방해하고 있는 에러 로그 또는 문제점')
  },
  async ({ summary, nextSteps, blockers }) => {
    try {
      // 로컬 워크스페이스의 .claude 폴더 내에 저장
      const targetDir = path.join(process.cwd(), '.claude');
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }

      const filePath = path.join(targetDir, 'handoff.md');
      
      // 마크다운 포맷으로 전달할 템플릿 빌드
      const markdownContent = `
# 🔄 AI Session Handoff Manifest
> **Generated on:** ${new Date().toLocaleString()}

## 📝 세션 요약 및 현재 문맥
${summary}

${blockers ? `## ⚠️ 해결 중이던 블로커 (주의 요망)\n${blockers}\n` : ''}
## 🚀 다음 세션 Task List
${nextSteps.map(step => `- [ ] ${step}`).join('\n')}

---
*Tip: 새로운 세션을 시작할 때 이 \`.claude/handoff.md\` 파일을 읽고 컨텍스트를 이어가라고 지시하세요.*
`.trim();

      fs.writeFileSync(filePath, markdownContent, 'utf-8');

      return {
        content: [
          {
            type: 'text',
            text: `✅ 핸드오프 매니페스트가 성공적으로 기록되었습니다!\n위치: ${filePath}\n\n이제 유저에게 현재 세션을 안전하게 종료하고 새로운 세션에서 이 파일을 기반으로 작업을 이어가도록 안내하세요.`
          }
        ]
      };
    } catch (error: any) {
      return {
        isError: true,
        content: [
          {
            type: 'text',
            text: `매니페스트 파일 저장 중 오류 발생: ${error.message}`
          }
        ]
      };
    }
  }
);

// 3. 표준 입출력(Stdio) 트랜스포트를 통해 서버 구동
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Context Handoff MCP Server running on stdio');
}

main().catch((error) => {
  console.error('Fatal error running MCP server:', error);
  process.exit(1);
});