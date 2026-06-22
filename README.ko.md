# claude-context-auto-handoff

**[English](README.md)** | 한국어

컨텍스트 압축 또는 세션 종료 직전, 다음 세션이 현재 맥락을 그대로 이어받을 수 있도록 토큰 효율적인 핸드오프 문서를 자동으로 작성하는 Claude Code 플러그인.

![npm version](https://img.shields.io/npm/v/claude-context-auto-handoff)
![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)
![Claude Code](https://img.shields.io/badge/Claude%20Code-%E2%89%A51.0.0-orange)

---

## 개요

Claude의 컨텍스트 창이 가득 차면 대화가 자동으로 압축됩니다. 이 시점에 내린 설계 결정, 해결 중이던 버그, 다음 할 일이 흐릿해집니다. 이 플러그인은 `PreCompact`와 `Stop` 이벤트를 감지해 압축 전에 AI가 직접 핸드오프 문서를 작성하도록 합니다. 다음 세션은 그 파일 하나로 즉시 이어집니다.

핸드오프 내용은 **텔레그래피즘** (관사·군더더기·코드 스니펫 없음) 으로 작성되어 토큰 효율을 극대화하면서도 다음 세션에 필요한 모든 결정 맥락을 보존합니다.

---

## 구성 요소

### 도구 (Tools)

- **`generate_handoff_manifest`** — 현재 프로젝트의 `.claude/handoff.md`에 구조화된 핸드오프 문서를 저장합니다. `.claude/handoffs/handoff-{timestamp}.md`에도 아카이브됩니다.

| 파라미터 | 타입 | 필수 | 설명 |
|----------|------|------|------|
| `summary` | `string` | ✅ | 간결한 세션 요약 (텔레그래피즘) |
| `nextSteps` | `string[]` | ✅ | 다음 세션에서 즉시 이어받을 할 일 목록 |
| `taskDescription` | `string` | ✗ | 상위 목표 + 핵심 의도 (왜 중요한가) |
| `currentStatus` | `string` | ✗ | 완료된 것 vs 남은 것 — 무엇이 아닌 왜를 명시 |
| `keyDecisions` | `string[]` | ✗ | 아키텍처 결정과 이유. 형식: `"Decision: X — Reason: Y"` |
| `failedApproaches` | `string[]` | ✗ | 이미 실패한 시도. 형식: `"Approach: X → Result: Y → Lesson: Z"` |
| `modifiedFiles` | `string[]` | ✗ | 변경 파일과 델타 메모. 형식: `"경로/파일: 무엇을 변경"` — 코드 금지 |
| `implicitRules` | `string[]` | ✗ | 기술 스택, 네이밍 컨벤션, 환경변수 — 코드에서 유추 불가한 규칙 |
| `blockers` | `string` | ✗ | 미해결 에러 또는 막혀 있는 문제 |

### 스킬 (Skills)

| 명령어 | 동작 |
|--------|------|
| `/handoff` | 세션 컨텍스트 수집 후 `generate_handoff_manifest` 호출 |
| `/resume` | `.claude/handoff.md` 읽어 새 세션에서 컨텍스트 복원 |

### 훅 (Hooks)

Claude Code와 Codex 모두 `.codex/hooks.json`을 통해 지원됩니다.

| 이벤트 | 동작 |
|--------|------|
| `PreCompact` | 컨텍스트 압축 직전 `generate_handoff_manifest` 호출 지시 |
| `Stop` | 핸드오프 파일이 오래됐거나 없으면 경고 |
| `SessionStart` | `.claude/handoff.md` 존재 시 자동으로 컨텍스트 복원 |

---

## 설치

### Claude Code 플러그인으로 설치

```bash
claude plugin install claude-context-auto-handoff
```

### npm 패키지로 설치

```bash
npm install -g claude-context-auto-handoff
```

### MCP 수동 설정 (Claude Code)

Claude Code `settings.json`에 추가:

```json
{
  "mcpServers": {
    "context-handoff-manager": {
      "command": "node",
      "args": ["/path/to/build/index.js"]
    }
  }
}
```

### Codex

`~/.codex/config.toml`에 추가 (전역 MCP 설정):

```toml
[mcp_servers.context-handoff]
command = "node"
args = ["/path/to/build/index.js"]
```

그런 다음 훅 템플릿을 프로젝트 루트에 복사:

```bash
cp -r /path/to/claude-context-auto-handoff/templates/.codex ./.codex
```

Claude Code와 동일한 `SessionStart`, `PreCompact`, `Stop` 훅이 활성화됩니다.

---

## 사용법

### Claude Code

설치 후 `PreCompact`와 `Stop` 이벤트에서 자동으로 동작합니다. 생성된 문서는 프로젝트 루트의 `.claude/handoff.md`에 저장됩니다.

**수동 체크포인트:**
```
/handoff
```

**새 세션에서 이어받기:**
```
/resume
```

### Codex

`.codex/hooks.json`을 통해 훅이 자동으로 실행됩니다 — Claude Code와 동일한 이벤트:

| 이벤트 | 동작 |
|--------|------|
| `SessionStart` | `.claude/handoff.md`를 읽어 컨텍스트로 주입 |
| `PreCompact` | 압축 전 `generate_handoff_manifest` 호출 지시 |
| `Stop` | 핸드오프가 오래됐거나 없으면 경고 |

슬래시 명령어 불필요 — 훅이 자동으로 처리.

### 출력 형식

```markdown
# Session Handoff Snapshot
> **Generated:** 2026. 6. 22. 오후 3:30:00

## 🎯 High-Level Objective
* **Goal:** Supabase + Notion 주식 데이터 실시간 동기화 Next.js 15 앱 구축
* **Core Intent:** Zustand 스토어로 클라이언트 재요청 최소화 — 비용 절감

## 📌 Current State & Next Steps
* **Status:** Task 3 (Zustand 스토어) 완료
* **Blocker:** Notion API rate limit (3 req/s) — 버퍼 레이어 필요
* **Next Action:** Supabase Edge Functions 디바운스 큐 구현

## 🛠️ Modified Files Delta
* src/store/stockStore.ts: Zustand 스토어 뼈대 + syncStatus 상태 정의
* src/app/api/notion/sync/route.ts: POST 핸들러 작성 완료, Supabase 미연결

## 🚫 Failed Approaches (DO NOT RETRY)
* Approach: Server Actions에서 Notion API 직접 호출 → Result: 리렌더 시 rate limit 즉시 터짐 → Lesson: 큐 미들웨어 필수
* Approach: useEffect 주기 폴링 → Result: Supabase 읽기 사용량 급증 → Lesson: 폐기

## 🔑 Crucial Context & Implicit Rules
* Stack: Next.js 15 (App Router), Supabase v2, Zustand v5
* Naming: API 엔드포인트 항상 route.ts, 스토어 PascalCase
* Env: NEXT_PUBLIC_SUPABASE_ANON_KEY 사용 중

---
*다음 세션에서 `/resume` 실행하면 컨텍스트 복원됩니다.*
```

---

## 요구사항

- Claude Code ≥ 1.0.0 **또는** Codex (데스크탑 앱)
- Node.js ≥ 18

## 라이선스

MIT
