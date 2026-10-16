import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import { validate } from '../../middleware/validate.js';
import { ownerRatingsQuerySchema } from './owner.validation.js';
import * as controller from './owner.controller.js';

export const ownerRouter = Router();

ownerRouter.use(authenticate, authorize('store_owner'));

ownerRouter.get('/dashboard', controller.dashboard);
ownerRouter.get('/ratings', validate({ query: ownerRatingsQuerySchema }), controller.ratings);
