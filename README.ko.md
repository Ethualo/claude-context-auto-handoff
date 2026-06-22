# claude-context-auto-handoff

**[English](README.md)** | 한국어

컨텍스트 압축 또는 세션 종료 직전, 다음 세션이 현재 맥락을 그대로 이어받을 수 있도록 핸드오프 문서를 자동으로 작성하는 Claude Code 플러그인.

![npm version](https://img.shields.io/npm/v/claude-context-auto-handoff)
![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)
![Claude Code](https://img.shields.io/badge/Claude%20Code-%E2%89%A51.0.0-orange)

---

## 개요

Claude의 컨텍스트 창이 가득 차면 대화가 자동으로 압축됩니다. 이 시점에 내린 설계 결정, 해결 중이던 버그, 다음 할 일이 흐릿해집니다. 이 플러그인은 `PreCompact`와 `Stop` 이벤트를 감지해 압축 전에 AI가 직접 핸드오프 문서를 작성하도록 합니다. 다음 세션은 그 파일 하나로 즉시 이어집니다.

---

## 구성 요소

### 도구 (Tools)

- **`generate_handoff_manifest`** — 현재 프로젝트의 `.claude/handoff.md`에 구조화된 핸드오프 문서를 저장합니다.

| 파라미터 | 타입 | 필수 | 설명 |
|----------|------|------|------|
| `summary` | `string` | ✅ | 핵심 결정 사항, 마일스톤, 현재 아키텍처 상태 요약 |
| `nextSteps` | `string[]` | ✅ | 다음 세션에서 즉시 이어받을 할 일 목록 |
| `blockers` | `string` | ❌ | 미해결 에러 또는 막혀 있는 문제 |

### 훅 (Hooks)

| 이벤트 | 동작 |
|--------|------|
| `PreCompact` | 컨텍스트 압축 직전 `generate_handoff_manifest` 호출 지시 |
| `Stop` | 작업 단위 완료 시점에 `generate_handoff_manifest` 호출 지시 |

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

### MCP 수동 설정

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

---

## 사용법

설치 후 자동으로 동작합니다. 생성된 문서는 프로젝트 루트의 `.claude/handoff.md`에 저장됩니다.

새 세션에서 이어받으려면:

```
.claude/handoff.md 읽고 이어서 진행해줘.
```

세션 도중 수동으로 저장하려면:

```
지금까지 내용을 핸드오프 문서로 저장해줘.
```

### 출력 형식

```markdown
# 🔄 AI Session Handoff Manifest
> Generated on: 2026-06-22 15:30

## 📝 세션 요약 및 현재 문맥
...

## ⚠️ 해결 중이던 블로커
...

## 🚀 다음 세션 Task List
- [ ] ...
```

---

## 요구사항

- Claude Code ≥ 1.0.0
- Node.js ≥ 18

## 라이선스

MIT
