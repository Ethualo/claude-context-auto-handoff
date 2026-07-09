# context-handoff-mcp-server -- one-line setup for Windows (PowerShell)
# Usage: irm https://raw.githubusercontent.com/Ethualo/context-handoff-mcp-server/main/scripts/setup.ps1 | iex

$ErrorActionPreference = "Stop"

$PluginName = "claude-context-handoff"
$HooksTarget = "$env:USERPROFILE\.claude\hooks.json"

Write-Host "[Handoff Setup] Installing $PluginName..."

# 1. npm global install (builds TypeScript)
npm install -g claude-context-auto-handoff

# 2. Register hooks.json (warn if already exists)
$NpmRoot = (npm root -g).Trim()
$HooksSrc = Join-Path $NpmRoot "claude-context-auto-handoff\hooks\hooks.json"

if (Test-Path $HooksTarget) {
  Write-Host "[Handoff Setup] WARNING: $HooksTarget already exists."
  Write-Host "  Manually merge contents from: $HooksSrc"
} else {
  $HooksDir = Split-Path $HooksTarget
  if (-not (Test-Path $HooksDir)) { New-Item -ItemType Directory -Force $HooksDir | Out-Null }
  Copy-Item $HooksSrc $HooksTarget
  Write-Host "[Handoff Setup] hooks.json registered: $HooksTarget"
}

Write-Host ""
Write-Host "[Handoff Setup] Done!"
Write-Host ""
Write-Host "  Usage:"
Write-Host "    /handoff-save    -- save current session"
Write-Host "    /handoff-resume  -- restore previous session"
Write-Host ""
Write-Host "  SessionStart hook auto-restores previous context on session open."
