import { ApiError } from '../utils/ApiError.js';

/**
 * Role-based access control. Must run after `authenticate`.
 * @example router.use(authenticate, authorize('admin'))
 */
export function authorize(...allowedRoles) {
  return (req, _res, next) => {
    if (!req.user) {
      return next(ApiError.unauthorized());
    }
    if (!allowedRoles.includes(req.user.role)) {
      return next(ApiError.forbidden());
    }
    return next();
  };
}
