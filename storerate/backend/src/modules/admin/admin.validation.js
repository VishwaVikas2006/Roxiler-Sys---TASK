import { z } from 'zod';
import {
  nameRule,
  emailRule,
  addressRule,
  passwordRule,
  roleRule,
  idRule,
  filterRule,
  booleanFlagRule,
  listQueryRule,
} from '../../validation/rules.js';

export const USER_SORT_FIELDS = ['name', 'email', 'address', 'role', 'createdAt'];
export const STORE_SORT_FIELDS = ['name', 'email', 'address', 'rating', 'createdAt'];

export const listUsersQuerySchema = listQueryRule(USER_SORT_FIELDS, 'name', {
  name: filterRule,
  email: filterRule,
  address: filterRule,
  role: roleRule.optional().or(z.literal('').transform(() => undefined)),
  /** Only store owners that do not own a store yet (for the "Add store" owner picker). */
  unassignedOwners: booleanFlagRule,
});

export const listStoresQuerySchema = listQueryRule(STORE_SORT_FIELDS, 'name', {
  name: filterRule,
  email: filterRule,
  address: filterRule,
});

export const createUserSchema = z.object({
  name: nameRule,
  email: emailRule,
  password: passwordRule,
  address: addressRule,
  role: roleRule,
});

const newOwnerSchema = z.object({
  name: nameRule,
  email: emailRule,
  password: passwordRule,
  address: addressRule,
});

/** A store needs an owner: either an existing store-owner account or a brand new one. */
export const createStoreSchema = z
  .object({
    name: nameRule,
    email: emailRule,
    address: addressRule,
    ownerId: idRule.optional(),
    owner: newOwnerSchema.optional(),
  })
  .superRefine((data, ctx) => {
    if (!data.ownerId && !data.owner) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['ownerId'],
        message: 'Select an existing store owner or provide details for a new one',
      });
    }
    if (data.ownerId && data.owner) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['ownerId'],
        message: 'Provide either ownerId or owner, not both',
      });
    }
  });

export const userIdParamsSchema = z.object({ id: idRule });
