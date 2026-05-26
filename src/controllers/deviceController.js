import { DeviceModel } from "../models/deviceModel.js";
import { createError } from "../middlewares/errorHandler.js";

export const DeviceController = {
  async list(req, res, next) {
    try {
      const { client_id, limit, offset } = req.query;
      const devices = await DeviceModel.findAll({
        clientId: client_id,
        limit: Number(limit) || 50,
        offset: Number(offset) || 0,
      });
      res.json(devices);
    } catch (err) {
      next(err);
    }
  },

  async get(req, res, next) {
    try {
      const device = await DeviceModel.findById(req.params.id);
      if (!device) throw createError(404, "Aparelho não encontrado.");
      res.json(device);
    } catch (err) {
      next(err);
    }
  },

  async create(req, res, next) {
    try {
      const { client_id, category, brand_id, brand_name, model, serial_number, color, notes } = req.body;
      if (!client_id || !category) throw createError(400, "client_id e category são obrigatórios.");
      const device = await DeviceModel.create({ client_id, category, brand_id, brand_name, model, serial_number, color, notes });
      res.status(201).json(device);
    } catch (err) {
      next(err);
    }
  },

  async update(req, res, next) {
    try {
      const device = await DeviceModel.update(req.params.id, req.body);
      if (!device) throw createError(404, "Aparelho não encontrado.");
      res.json(device);
    } catch (err) {
      next(err);
    }
  },

  async delete(req, res, next) {
    try {
      const deleted = await DeviceModel.softDelete(req.params.id);
      if (!deleted) throw createError(404, "Aparelho não encontrado.");
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  },

  async getBrands(req, res, next) {
    try {
      res.json(await DeviceModel.getBrands());
    } catch (err) {
      next(err);
    }
  },
};
