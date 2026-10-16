import { describe, it, expect } from 'vitest';
import {
  validateName,
  validateEmail,
  validateAddress,
  validatePassword,
  passwordChecks,
  validateForm,
} from './validators.js';

describe('validators (mirror of backend rules)', () => {
  it('name must be 20-60 characters', () => {
    expect(validateName('a'.repeat(19))).toMatch(/between 20 and 60/);
    expect(validateName('a'.repeat(20))).toBeNull();
    expect(validateName('a'.repeat(60))).toBeNull();
    expect(validateName('a'.repeat(61))).toMatch(/between 20 and 60/);
    expect(validateName('   ')).toBe('Name is required');
  });

  it('email must look like an email', () => {
    expect(validateEmail('priya@example.com')).toBeNull();
    expect(validateEmail('nope')).toMatch(/valid email/);
    expect(validateEmail('')).toBe('Email is required');
  });

  it('address is required and max 400', () => {
    expect(validateAddress('Kukatpally')).toBeNull();
    expect(validateAddress('a'.repeat(401))).toMatch(/400/);
    expect(validateAddress('')).toBe('Address is required');
  });

  it('password needs 8-16 chars, an uppercase and a special character', () => {
    expect(validatePassword('Secret@123')).toBeNull();
    expect(validatePassword('secret@123')).toMatch(/uppercase/);
    expect(validatePassword('Secret123')).toMatch(/special/);
    expect(validatePassword('S@1')).toMatch(/8-16/);
    expect(validatePassword('Secret@1234567890')).toMatch(/8-16/);
    expect(passwordChecks('Abcdefg!').every((c) => c.ok)).toBe(true);
  });

  it('validateForm collects only failing fields', () => {
    const errors = validateForm(
      { name: 'short', email: 'ok@example.com' },
      { name: validateName, email: validateEmail },
    );
    expect(Object.keys(errors)).toEqual(['name']);
  });
});
