import { ApiError } from '../utils/ApiError.js';

const SOURCES = ['params', 'query', 'body'];

/**
 * Validate request parts with zod schemas.
 * Parsed (and transformed) values are exposed on `req.valid.{params,query,body}`;
 * in Express 5 `req.query` is read-only, so we never mutate the originals.
 *
 * @param {{ params?: import('zod').ZodTypeAny, query?: import('zod').ZodTypeAny, body?: import('zod').ZodTypeAny }} schemas
 */
export function validate(schemas) {
  return (req, _res, next) => {
    const valid = req.valid ?? {};
    const details = [];

    for (const source of SOURCES) {
      const schema = schemas[source];
      if (!schema) continue;

      const result = schema.safeParse(req[source] ?? {});
      if (result.success) {
        valid[source] = result.data;
      } else {
        for (const issue of result.error.issues) {
          details.push({ field: issue.path.join('.') || source, message: issue.message });
        }
      }
    }

    if (details.length > 0) {
      return next(ApiError.validation(details));
    }
    req.valid = valid;
    return next();
  };
}
