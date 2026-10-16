import * as ownerService from './owner.service.js';

export async function dashboard(req, res) {
  res.json(await ownerService.getDashboard(req.user.id));
}

export async function ratings(req, res) {
  res.json(await ownerService.listRatings(req.user.id, req.valid.query));
}
