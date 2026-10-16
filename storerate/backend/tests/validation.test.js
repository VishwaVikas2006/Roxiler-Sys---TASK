import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  nameRule,
  emailRule,
  addressRule,
  passwordRule,
  ratingRule,
  listQueryRule,
} from '../src/validation/rules.js';
import { escapeLike } from '../src/utils/listQuery.js';
import { snakeCase, camelCaseKeys } from '../src/utils/caseMapping.js';

const ok = (rule, value) => rule.safeParse(value).success;

describe('name rule (20-60 chars)', () => {
  test('rejects 19, accepts 20 and 60, rejects 61', () => {
    assert.equal(ok(nameRule, 'a'.repeat(19)), false);
    assert.equal(ok(nameRule, 'a'.repeat(20)), true);
    assert.equal(ok(nameRule, 'a'.repeat(60)), true);
    assert.equal(ok(nameRule, 'a'.repeat(61)), false);
  });
  test('trims surrounding whitespace before measuring', () => {
    assert.equal(ok(nameRule, `   ${'a'.repeat(19)}   `), false);
    assert.equal(nameRule.parse(`  ${'a'.repeat(20)}  `), 'a'.repeat(20));
  });
});

describe('email rule', () => {
  test('accepts standard emails and lower-cases them', () => {
    assert.equal(emailRule.parse('  Priya.N@Example.COM '), 'priya.n@example.com');
  });
  test('rejects malformed emails', () => {
    for (const bad of ['plain', 'missing@tld', '@no-local.com', 'spaces in@x.com', '']) {
      assert.equal(ok(emailRule, bad), false, `expected "${bad}" to be rejected`);
    }
  });
});

describe('address rule (max 400)', () => {
  test('requires a value and caps at 400', () => {
    assert.equal(ok(addressRule, ''), false);
    assert.equal(ok(addressRule, 'a'.repeat(400)), true);
    assert.equal(ok(addressRule, 'a'.repeat(401)), false);
  });
});

describe('password rule (8-16, uppercase, special)', () => {
  test('accepts a compliant password', () => {
    assert.equal(ok(passwordRule, 'Abcdef1!'), true);
    assert.equal(ok(passwordRule, 'Abcdefghijklmn1!'), true); // 16 chars
  });
  test('rejects too short / too long', () => {
    assert.equal(ok(passwordRule, 'Abcde1!'), false); // 7
    assert.equal(ok(passwordRule, 'Abcdefghijklmno1!'), false); // 17
  });
  test('rejects missing uppercase or special character', () => {
    assert.equal(ok(passwordRule, 'abcdefg1!'), false);
    assert.equal(ok(passwordRule, 'Abcdefg12'), false);
  });
  test('reports one message per failed rule', () => {
    const result = passwordRule.safeParse('weak');
    const messages = result.error.issues.map((i) => i.message);
    assert.equal(messages.length, 3);
  });
});

describe('rating rule (integer 1-5)', () => {
  test('boundaries', () => {
    assert.equal(ok(ratingRule, 0), false);
    assert.equal(ok(ratingRule, 1), true);
    assert.equal(ok(ratingRule, 5), true);
    assert.equal(ok(ratingRule, 6), false);
    assert.equal(ok(ratingRule, 3.5), false);
    assert.equal(ok(ratingRule, '4'), false);
  });
});

describe('list query rule', () => {
  const schema = listQueryRule(['name', 'email'], 'name');
  test('applies defaults', () => {
    assert.deepEqual(schema.parse({}), { sortBy: 'name', order: 'asc', page: 1, limit: 10 });
  });
  test('coerces numbers and rejects unknown sort fields / oversized pages', () => {
    assert.deepEqual(schema.parse({ page: '3', limit: '25', order: 'desc', sortBy: 'email' }), {
      sortBy: 'email',
      order: 'desc',
      page: 3,
      limit: 25,
    });
    assert.equal(schema.safeParse({ sortBy: 'password_hash' }).success, false);
    assert.equal(schema.safeParse({ limit: 101 }).success, false);
    assert.equal(schema.safeParse({ page: 0 }).success, false);
  });
});

describe('helpers', () => {
  test('escapeLike escapes wildcard characters', () => {
    assert.equal(escapeLike('100%_sure\\'), '100\\%\\_sure\\\\');
  });
  test('case mapping round-trips', () => {
    assert.equal(snakeCase('averageRating'), 'average_rating');
    assert.equal(snakeCase('already_snake'), 'already_snake');
    assert.deepEqual(camelCaseKeys([{ created_at: 1, owner: { owner_id: 2 } }]), [
      { createdAt: 1, owner: { ownerId: 2 } },
    ]);
  });
});
