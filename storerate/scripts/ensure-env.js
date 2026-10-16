#!/usr/bin/env node
/**
 * Creates backend/.env from backend/.env.example on first setup (cross-platform,
 * so `npm run setup` works the same on Windows, macOS and Linux). Never overwrites.
 */
import { existsSync, copyFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const target = resolve(root, 'backend/.env');
const example = resolve(root, 'backend/.env.example');

if (existsSync(target)) {
  console.log('[setup] backend/.env already exists - leaving it untouched');
} else {
  copyFileSync(example, target);
  console.log('[setup] created backend/.env from .env.example (edit DATABASE_URL / JWT_SECRET if needed)');
}
