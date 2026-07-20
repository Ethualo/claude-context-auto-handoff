# claude-context-auto-handoff

English | **[한국어](README.ko.md)**

Claude Code plugin that automatically saves session context and generates token-efficient handoff manifests before Claude compacts or stops.

![npm version](https://img.shields.io/npm/v/claude-context-auto-handoff)
![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)

---

## Requirements

- **Node.js 18+** — must be on `PATH` as `node`
- **Claude Code** or **Codex** — plugin and hooks require Claude Code CLI or Codex CLI

---

## Overview

Claude's context window eventually fills and compacts — losing design decisions, active blockers, and next steps mid-session. This plugin hooks into `PreCompact` and `Stop` events to trigger an AI-authored handoff document before that happens, so the next session picks up exactly where this one left off.

Handoff content is written in **telegraphese** (no articles, no filler, no code snippets) and structured to maximize token efficiency while preserving all decision context the next session needs.

Drafting (typically 3-6k tokens per save) is delegated to a Haiku subagent, which also calls `generate_handoff_manifest` itself — the draft never round-trips through the main-session model.

---

## Components

### Tools

- **`generate_handoff_manifest`** — Writes a structured `.claude/handoff.md` to the current project directory. Also archives to `.claude/handoffs/{YYYY-MM-DD}/handoff-{timestamp}.md` (auto-pruned to the most recent 50 archive files) and upserts a one-line entry in `.claude/handoffs/index.md` — a compact, grep-friendly index (date, keywords, headline, path) for searching past handoffs without opening every archive file. Repeat saves within the same session (e.g. both `PreCompact` and `Stop` firing in one long session) update that session's own archive file and index line in place instead of piling up near-duplicates — each MCP server process gets one session id, tagged in the `session:` frontmatter field.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `nextSteps` | `string[]` | ✅ | Ordered todo list for the next session |
| `summary` | `string` | ✗ | Terse session recap (telegraphese) — omit if other fields cover it |
| `taskDescription` | `string` | ✗ | High-level goal + core intent (why this matters) |
| `currentStatus` | `string` | ✗ | What is done vs what remains — state why, not just what |
| `keyDecisions` | `string[]` | ✗ | Architecture choices and reasons. Format: `"Decision: X — Reason: Y"` |
| `failedApproaches` | `string[]` | ✗ | Already-failed attempts. Format: `"Approach: X → Result: Y → Lesson: Z"` |
| `modifiedFiles` | `string[]` | ✗ | Changed files with delta notes. Format: `"path/to/file: what changed"` — no code |
| `implicitRules` | `string[]` | ✗ | Tech stack, naming conventions, env vars — anything not derivable from reading code |
| `blockers` | `string` | ✗ | Unresolved errors or open questions |
| `workingDirectory` | `string` | ✗ | Absolute path to the project root to write handoff.md to — needed on Windows where `process.cwd()` may resolve to System32 |

### Skills

| Command | Behavior |
|---------|----------|
| `/handoff-save` | Delegate to a Haiku subagent that drafts session context and calls `generate_handoff_manifest` itself — keeps the 3-6k token draft off the (usually pricier) main-session model |
| `/handoff-resume` | Read `.claude/handoff.md` and restore context in a new session |
| `/handoff-search` | Grep `.claude/handoffs/index.md` for a topic and surface matching past sessions — no database, no embeddings |

### Hooks

Claude Code hooks are built-in. Codex hooks require copying `templates/.codex` to your project root (see [Codex installation](#codex)).

| Event | Behavior |
|-------|----------|
| `PreCompact` | Prompts the model to invoke the `handoff-save` skill (Haiku subagent) before context compression |
| `Stop` | Warns if handoff is stale or missing after each response |
| `SessionStart` | Surfaces a short hint (age, topics) if a handoff exists — full content loads via keyword match or `/handoff-resume` |
| `UserPromptSubmit` | If your prompt matches a keyword from the last handoff, injects the full handoff content as context automatically |

---

## Quick Start

**Linux / macOS**
```bash
curl -fsSL https://raw.githubusercontent.com/Ethualo/context-handoff-mcp-server/main/scripts/setup.sh | bash
# Also set up Codex (hooks + handoff-drafter subagent + AGENTS.md):
curl -fsSL https://raw.githubusercontent.com/Ethualo/context-handoff-mcp-server/main/scripts/setup.sh | bash -s -- --codex
```

**Windows (PowerShell)**
```powershell
irm https://raw.githubusercontent.com/Ethualo/context-handoff-mcp-server/main/scripts/setup.ps1 -OutFile setup.ps1
.\setup.ps1          # Claude Code only
.\setup.ps1 -Codex   # also set up Codex (hooks + handoff-drafter subagent + AGENTS.md)
```

**npm (cross-platform)**
```bash
npm install -g claude-context-auto-handoff
claude-context-handoff-setup           # Claude Code only
claude-context-handoff-setup --codex   # also set up Codex
```

---

## Installation

### As a Claude Code plugin

```bash
claude plugin install claude-context-auto-handoff
```

### As an npm package

```bash
npm install -g claude-context-auto-handoff
claude-context-handoff-setup  # hooks.json 자동 배치, --codex 붙이면 Codex도 함께 설정
```

### Manual MCP configuration (Claude Code)

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

### Codex

Add to `~/.codex/config.toml` (global MCP config):

```toml
[mcp_servers.context-handoff]
command = "node"
args = ["/path/to/build/index.js"]
```

Then copy the hook templates and instructions to your project root:

```bash
cp -r /path/to/claude-context-auto-handoff/templates/.codex ./.codex
cp /path/to/claude-context-auto-handoff/templates/AGENTS.md ./AGENTS.md
```

This enables the same `SessionStart`, `PreCompact`, and `Stop` hooks as Claude Code, plus a `handoff-drafter` subagent (`.codex/agents/handoff-drafter.toml`) that drafts and saves the handoff so it doesn't run in your main thread.

---

## Usage

### Claude Code

All four hooks fire automatically — `SessionStart` surfaces a short hint if a handoff exists, `UserPromptSubmit` auto-loads full context when your prompt matches a saved keyword, `PreCompact` saves before compression, `Stop` warns if handoff is stale. Generated manifests are saved to `.claude/handoff.md`.

**Manual checkpoint:**
```
/handoff-save
```

**Manual resume (if keyword match didn't trigger):**
```
/handoff-resume
```

**Search past sessions:**
```
/handoff-search <topic>
```

### Codex

Same three hooks fire automatically via `.codex/hooks.json`. No slash commands — hooks handle everything.

| Event | Behavior |
|-------|----------|
| `SessionStart` | Reads `.claude/handoff.md` and injects content as context |
| `PreCompact` | Prompts Codex to delegate to the `handoff-drafter` subagent before compression |
| `Stop` | Warns if handoff is stale (>5 min) or missing |

### Output format

```markdown
# Session Handoff Snapshot
> **Generated:** 6/22/2026, 3:30:00 PM

## 🎯 High-Level Objective
* **Goal:** Build Next.js 15 app syncing Supabase + Notion stock data in real-time
* **Core Intent:** Minimize client re-fetches via Zustand store — cost control

## 📌 Current State & Next Steps
* **Status:** Task 3 (Zustand store) complete
* **Blocker:** Notion API rate limit (3 req/s) — buffer layer needed
* **Next Action:** Implement Supabase Edge Functions debounce queue

## 🛠️ Modified Files Delta
* src/store/stockStore.ts: Zustand store skeleton + syncStatus state
* src/app/api/notion/sync/route.ts: POST handler written, Supabase not wired yet

## 🚫 Failed Approaches (DO NOT RETRY)
* Approach: Call Notion API directly from Server Actions → Result: Rate limit hit on re-render → Lesson: Queue middleware mandatory
* Approach: useEffect polling → Result: Supabase read usage spike → Lesson: Abandoned

## 🔑 Crucial Context & Implicit Rules
* Stack: Next.js 15 (App Router), Supabase v2, Zustand v5
* Naming: API endpoints always route.ts, PascalCase store names
* Env: NEXT_PUBLIC_SUPABASE_ANON_KEY active

---
*A short hint surfaces on session start; full context loads only if your next prompt matches a keyword above, or via manual `/handoff-resume`.*
```

---

## License

MIT
