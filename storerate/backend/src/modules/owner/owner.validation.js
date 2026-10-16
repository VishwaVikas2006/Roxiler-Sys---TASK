import { listQueryRule } from '../../validation/rules.js';

export const OWNER_RATING_SORT_FIELDS = ['name', 'email', 'rating', 'createdAt'];

export const ownerRatingsQuerySchema = listQueryRule(OWNER_RATING_SORT_FIELDS, 'createdAt');
