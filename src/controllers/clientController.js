import { ClientModel } from "../models/clientModel.js";
import { createError } from "../middlewares/errorHandler.js";

export const ClientController = {
  async list(req, res, next) {
    try {
      const { limit, offset, search, is_active } = req.query;
      const clients = await ClientModel.findAll({
        limit: Number(limit) || 50,
        offset: Number(offset) || 0,
        search,
        is_active: is_active !== undefined ? is_active === "true" : undefined,
      });
      res.json(clients);
    } catch (err) {
      next(err);
    }
  },

  async get(req, res, next) {
    try {
      const client = await ClientModel.findById(req.params.id);
      if (!client) throw createError(404, "Cliente não encontrado.");
      res.json(client);
    } catch (err) {
      next(err);
    }
  },

  async create(req, res, next) {
    try {
      const { name, cpf, email, phone, phone_secondary, notes } = req.body;
      if (!name) throw createError(400, "Nome é obrigatório.");

      if (cpf) {
        const existing = await ClientModel.findByCpf(cpf);
        if (existing) throw createError(409, "CPF já cadastrado.");
      }

      const client = await ClientModel.create({ name, cpf, email, phone, phone_secondary, notes });
      res.status(201).json(client);
    } catch (err) {
      next(err);
    }
  },

  async update(req, res, next) {
    try {
      const client = await ClientModel.update(req.params.id, req.body);
      if (!client) throw createError(404, "Cliente não encontrado.");
      res.json(client);
    } catch (err) {
      next(err);
    }
  },

  async delete(req, res, next) {
    try {
      const deleted = await ClientModel.softDelete(req.params.id);
      if (!deleted) throw createError(404, "Cliente não encontrado.");
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  },

  async getDevices(req, res, next) {
    try {
      const devices = await ClientModel.getDevices(req.params.id);
      res.json(devices);
    } catch (err) {
      next(err);
    }
  },

  async addAddress(req, res, next) {
    try {
      const address = await ClientModel.addAddress(req.params.id, req.body);
      res.status(201).json(address);
    } catch (err) {
      next(err);
    }
  },
};
