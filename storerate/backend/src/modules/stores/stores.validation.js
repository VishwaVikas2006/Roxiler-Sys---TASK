import { z } from 'zod';
import { idRule, filterRule, listQueryRule, ratingRule } from '../../validation/rules.js';

export const BROWSE_SORT_FIELDS = ['name', 'address', 'rating', 'myRating'];

export const browseStoresQuerySchema = listQueryRule(BROWSE_SORT_FIELDS, 'name', {
  /** Free-text search matching store name OR address. */
  q: filterRule,
  name: filterRule,
  address: filterRule,
});

export const storeIdParamsSchema = z.object({ storeId: idRule });

export const rateStoreSchema = z.object({ rating: ratingRule });
