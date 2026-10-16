import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import { validate } from '../../middleware/validate.js';
import { browseStoresQuerySchema, storeIdParamsSchema, rateStoreSchema } from './stores.validation.js';
import * as controller from './stores.controller.js';

export const storesRouter = Router();

// Browsing and rating stores is a Normal User capability.
storesRouter.use(authenticate, authorize('user'));

storesRouter.get('/', validate({ query: browseStoresQuerySchema }), controller.browse);
// PUT = idempotent "set my rating": creates on first call (201), modifies afterwards (200).
storesRouter.put(
  '/:storeId/rating',
  validate({ params: storeIdParamsSchema, body: rateStoreSchema }),
  controller.rate,
);
