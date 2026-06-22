# context-handoff-mcp-server — one-line setup for Windows (PowerShell)
# Usage: irm https://raw.githubusercontent.com/Ethualo/context-handoff-mcp-server/main/scripts/setup.ps1 | iex

$ErrorActionPreference = "Stop"

$PluginName = "claude-context-handoff"
$HooksTarget = "$env:USERPROFILE\.claude\hooks.json"

Write-Host "[Handoff Setup] Installing $PluginName..."

# 1. npm global install (builds TypeScript)
npm install -g claude-context-auto-handoff

# 2. hooks.json 등록 (기존 파일이 있으면 경고만)
$NpmRoot = (npm root -g).Trim()
$HooksSrc = Join-Path $NpmRoot "claude-context-auto-handoff\hooks\hooks.json"

if (Test-Path $HooksTarget) {
  Write-Host "[Handoff Setup] WARNING: $HooksTarget 이미 존재합니다."
  Write-Host "  수동으로 $HooksSrc 내용을 병합하세요."
} else {
  $HooksDir = Split-Path $HooksTarget
  if (-not (Test-Path $HooksDir)) { New-Item -ItemType Directory -Force $HooksDir | Out-Null }
  Copy-Item $HooksSrc $HooksTarget
  Write-Host "[Handoff Setup] hooks.json 등록 완료: $HooksTarget"
}

Write-Host ""
Write-Host "[Handoff Setup] 완료!"
Write-Host ""
Write-Host "  임계값 조정 (기본 70%):"
Write-Host "    [System.Environment]::SetEnvironmentVariable('CONTEXT_THRESHOLD','65','User')"
Write-Host ""
Write-Host "  사용법:"
Write-Host "    /handoff  — 현재 세션 저장"
Write-Host "    /resume   — 이전 세션 복원"
Write-Host ""
Write-Host "  SessionStart 훅이 세션 시작 시 자동으로 이전 컨텍스트를 복원합니다."
