import { StockModel } from "../models/stockModel.js";
import { PartModel } from "../models/partModel.js";
import { createError } from "../middlewares/errorHandler.js";

export const StockController = {
  async listStock(req, res, next) {
    try {
      const { low_stock } = req.query;
      res.json(await StockModel.getAll({ low_stock: low_stock === "true" }));
    } catch (err) {
      next(err);
    }
  },

  async listMovements(req, res, next) {
    try {
      const { part_id, limit, offset, movement_type } = req.query;
      res.json(await StockModel.getMovements({
        part_id,
        limit: Number(limit) || 50,
        offset: Number(offset) || 0,
        movement_type,
      }));
    } catch (err) {
      next(err);
    }
  },

  async registerMovement(req, res, next) {
    try {
      const { part_id, movement_type, quantity, supplier_id, unit_cost, notes } = req.body;

      if (!part_id || !movement_type || !quantity) {
        throw createError(400, "part_id, movement_type e quantity são obrigatórios.");
      }

      const movement = await StockModel.addMovement({
        part_id,
        user_id: req.user.id,
        supplier_id,
        movement_type,
        quantity: Number(quantity),
        unit_cost,
        notes,
      });

      res.status(201).json(movement);
    } catch (err) {
      next(err);
    }
  },

  async listParts(req, res, next) {
    try {
      const { limit, offset, search, category, low_stock } = req.query;
      res.json(await PartModel.findAll({
        limit: Number(limit) || 50,
        offset: Number(offset) || 0,
        search, category,
        low_stock: low_stock === "true",
      }));
    } catch (err) {
      next(err);
    }
  },

  async getPart(req, res, next) {
    try {
      const part = await PartModel.findById(req.params.id);
      if (!part) throw createError(404, "Peça não encontrada.");
      res.json(part);
    } catch (err) {
      next(err);
    }
  },

  async createPart(req, res, next) {
    try {
      const { name } = req.body;
      if (!name) throw createError(400, "Nome da peça é obrigatório.");
      const part = await PartModel.create(req.body);
      res.status(201).json(part);
    } catch (err) {
      next(err);
    }
  },

  async updatePart(req, res, next) {
    try {
      const part = await PartModel.update(req.params.id, req.body);
      if (!part) throw createError(404, "Peça não encontrada.");
      res.json(part);
    } catch (err) {
      next(err);
    }
  },

  async deletePart(req, res, next) {
    try {
      const deleted = await PartModel.softDelete(req.params.id);
      if (!deleted) throw createError(404, "Peça não encontrada.");
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  },
};
