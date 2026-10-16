import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { validate } from '../../middleware/validate.js';
import { authRateLimiter } from '../../middleware/rateLimit.js';
import { registerSchema, loginSchema, changePasswordSchema } from './auth.validation.js';
import * as controller from './auth.controller.js';

export const authRouter = Router();

authRouter.post('/register', authRateLimiter, validate({ body: registerSchema }), controller.register);
authRouter.post('/login', authRateLimiter, validate({ body: loginSchema }), controller.login);
authRouter.get('/me', authenticate, controller.me);
authRouter.patch(
  '/password',
  authenticate,
  validate({ body: changePasswordSchema }),
  controller.changePassword,
);
// Logout is client-side: the stateless JWT is simply discarded by the client.
