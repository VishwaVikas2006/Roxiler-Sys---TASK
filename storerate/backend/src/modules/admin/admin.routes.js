import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import { validate } from '../../middleware/validate.js';
import {
  listUsersQuerySchema,
  listStoresQuerySchema,
  createUserSchema,
  createStoreSchema,
  userIdParamsSchema,
} from './admin.validation.js';
import * as controller from './admin.controller.js';

export const adminRouter = Router();

// Every admin endpoint requires an authenticated System Administrator.
adminRouter.use(authenticate, authorize('admin'));

adminRouter.get('/dashboard', controller.dashboard);

adminRouter.get('/users', validate({ query: listUsersQuerySchema }), controller.listUsers);
adminRouter.post('/users', validate({ body: createUserSchema }), controller.createUser);
adminRouter.get('/users/:id', validate({ params: userIdParamsSchema }), controller.getUser);

adminRouter.get('/stores', validate({ query: listStoresQuerySchema }), controller.listStores);
adminRouter.post('/stores', validate({ body: createStoreSchema }), controller.createStore);
