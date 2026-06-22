#!/usr/bin/env node
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

if (process.platform === 'win32') {
  execSync(`powershell -ExecutionPolicy Bypass -File "${join(__dirname, 'setup.ps1')}"`, { stdio: 'inherit' });
} else {
  execSync(`bash "${join(__dirname, 'setup.sh')}"`, { stdio: 'inherit' });
}
