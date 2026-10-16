import { z } from 'zod';
import { nameRule, emailRule, addressRule, passwordRule } from '../../validation/rules.js';

export const registerSchema = z.object({
  name: nameRule,
  email: emailRule,
  address: addressRule,
  password: passwordRule,
});

export const loginSchema = z.object({
  email: emailRule,
  password: z.string({ required_error: 'Password is required' }).min(1, 'Password is required'),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z
      .string({ required_error: 'Current password is required' })
      .min(1, 'Current password is required'),
    newPassword: passwordRule,
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    path: ['newPassword'],
    message: 'New password must be different from the current password',
  });
