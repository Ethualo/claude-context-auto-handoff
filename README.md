# claude-context-auto-handoff

English | **[한국어](README.ko.md)**

Claude Code plugin that automatically saves session context and generates handoff manifests before Claude compacts or stops.

![npm version](https://img.shields.io/npm/v/claude-context-auto-handoff)
![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)
![Claude Code](https://img.shields.io/badge/Claude%20Code-%E2%89%A51.0.0-orange)

---

## Overview

Claude's context window eventually fills and compacts — losing design decisions, active blockers, and next steps mid-session. This plugin hooks into `PreCompact` and `Stop` events to trigger an AI-authored handoff document before that happens, so the next session picks up exactly where this one left off.

---

## Components

### Tools

- **`generate_handoff_manifest`** — Writes a structured `.claude/handoff.md` to the current project directory.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `summary` | `string` | ✅ | Key decisions, milestones, and current architecture state |
| `nextSteps` | `string[]` | ✅ | Ordered todo list for the next session |
| `blockers` | `string` | ❌ | Unresolved errors or open questions |

### Hooks

| Event | Behavior |
|-------|----------|
| `PreCompact` | Prompts Claude to call `generate_handoff_manifest` before context compression |
| `Stop` | Prompts Claude to call `generate_handoff_manifest` when a task unit completes |

---

## Installation

### As a Claude Code plugin

```bash
claude plugin install claude-context-auto-handoff
```

### As an npm package

```bash
npm install -g claude-context-auto-handoff
```

### Manual MCP configuration

Add to your Claude Code `settings.json`:

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

## Usage

Once installed, the plugin runs automatically. Generated manifests are saved to `.claude/handoff.md` in your project root.

To resume in a new session:

```
.claude/handoff.md 읽고 이어서 진행해줘.
```

To checkpoint manually at any time:

```
지금까지 내용을 핸드오프 문서로 저장해줘.
```

### Output format

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

## Requirements

- Claude Code ≥ 1.0.0
- Node.js ≥ 18

## License

MIT
