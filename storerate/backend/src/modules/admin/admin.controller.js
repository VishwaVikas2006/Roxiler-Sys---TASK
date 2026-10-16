import * as adminService from './admin.service.js';

export async function dashboard(_req, res) {
  res.json(await adminService.getDashboardStats());
}

export async function listUsers(req, res) {
  res.json(await adminService.listUsers(req.valid.query));
}

export async function createUser(req, res) {
  const user = await adminService.createUser(req.valid.body);
  res.status(201).json({ user });
}

export async function getUser(req, res) {
  res.json(await adminService.getUserDetails(req.valid.params.id));
}

export async function listStores(req, res) {
  res.json(await adminService.listStores(req.valid.query));
}

export async function createStore(req, res) {
  const store = await adminService.createStore(req.valid.body);
  res.status(201).json({ store });
}
