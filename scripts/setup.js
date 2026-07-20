#!/usr/bin/env node
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const withCodex = process.argv.slice(2).includes('--codex');

if (process.platform === 'win32') {
  const codexFlag = withCodex ? ' -Codex' : '';
  execSync(`powershell -ExecutionPolicy Bypass -File "${join(__dirname, 'setup.ps1')}"${codexFlag}`, { stdio: 'inherit' });
} else {
  const codexFlag = withCodex ? ' --codex' : '';
  execSync(`bash "${join(__dirname, 'setup.sh')}"${codexFlag}`, { stdio: 'inherit' });
}
