import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

// Always load backend/.env regardless of the current working directory.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const NODE_ENV = process.env.NODE_ENV || 'development';
const isTest = NODE_ENV === 'test';
const isProduction = NODE_ENV === 'production';

/** Read an env var, failing fast when it is required and missing. */
function read(name, { required = false, fallback } = {}) {
  const raw = process.env[name];
  const value = raw === undefined || raw === '' ? fallback : raw;
  if (required && (value === undefined || value === '')) {
    throw new Error(`[config] Missing required environment variable: ${name}`);
  }
  return value;
}

function readInt(name, fallback) {
  const value = Number(read(name, { fallback }));
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`[config] ${name} must be a non-negative integer`);
  }
  return value;
}

const JWT_SECRET = read('JWT_SECRET', { required: true });
if (isProduction && JWT_SECRET.length < 32) {
  throw new Error('[config] JWT_SECRET must be at least 32 characters in production');
}

export const env = Object.freeze({
  NODE_ENV,
  isTest,
  isProduction,
  PORT: readInt('PORT', 4000),
  // Tests always run against their own database so `npm test` can never wipe dev data.
  DATABASE_URL: isTest
    ? read('TEST_DATABASE_URL', { required: true })
    : read('DATABASE_URL', { required: true }),
  JWT_SECRET,
  JWT_EXPIRES_IN: read('JWT_EXPIRES_IN', { fallback: '1d' }),
  CLIENT_ORIGIN: read('CLIENT_ORIGIN', { fallback: 'http://localhost:5173' }),
  BCRYPT_ROUNDS: readInt('BCRYPT_ROUNDS', 10),
  AUTH_RATE_LIMIT_MAX: readInt('AUTH_RATE_LIMIT_MAX', 50),
});
