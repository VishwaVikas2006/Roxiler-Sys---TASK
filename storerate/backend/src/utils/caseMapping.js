/**
 * snake_case (database) <-> camelCase (JavaScript / API) helpers.
 * Wired into Knex via `wrapIdentifier` and `postProcessResponse` so services
 * can write `createdAt` and receive `createdAt`, while the schema stays idiomatic SQL.
 */

const snakeCache = new Map();

export function snakeCase(value) {
  if (typeof value !== 'string') return value;
  const cached = snakeCache.get(value);
  if (cached) return cached;
  const converted = value.replace(/([a-z\d])([A-Z])/g, '$1_$2').toLowerCase();
  snakeCache.set(value, converted);
  return converted;
}

export function camelCase(value) {
  return value.replace(/_([a-z\d])/g, (_, char) => char.toUpperCase());
}

function isPlainObject(value) {
  if (Object.prototype.toString.call(value) !== '[object Object]') return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

/** Recursively camelCase the keys of query results (rows, arrays of rows, nested JSON). */
export function camelCaseKeys(input) {
  if (Array.isArray(input)) return input.map(camelCaseKeys);
  if (isPlainObject(input)) {
    const output = {};
    for (const [key, value] of Object.entries(input)) {
      output[camelCase(key)] = camelCaseKeys(value);
    }
    return output;
  }
  return input;
}
