import * as storesService from './stores.service.js';

export async function browse(req, res) {
  res.json(await storesService.browseStores(req.user.id, req.valid.query));
}

export async function rate(req, res) {
  const { created, ...result } = await storesService.rateStore(
    req.user.id,
    req.valid.params.storeId,
    req.valid.body.rating,
  );
  res.status(created ? 201 : 200).json(result);
}
