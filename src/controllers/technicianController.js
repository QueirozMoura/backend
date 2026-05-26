import { TechnicianModel } from "../models/technicianModel.js";
import { createError } from "../middlewares/errorHandler.js";

export const TechnicianController = {
  async list(req, res, next) {
    try {
      const { available } = req.query;
      res.json(await TechnicianModel.findAll({
        available: available !== undefined ? available === "true" : undefined,
      }));
    } catch (err) {
      next(err);
    }
  },

  async get(req, res, next) {
    try {
      const technician = await TechnicianModel.findById(req.params.id);
      if (!technician) throw createError(404, "Técnico não encontrado.");
      res.json(technician);
    } catch (err) {
      next(err);
    }
  },

  async update(req, res, next) {
    try {
      const updated = await TechnicianModel.update(req.params.id, req.body);
      if (!updated) throw createError(404, "Técnico não encontrado.");
      res.json(updated);
    } catch (err) {
      next(err);
    }
  },

  async getProductivity(req, res, next) {
    try {
      const { start, end } = req.query;
      res.json(await TechnicianModel.getProductivity({ start, end }));
    } catch (err) {
      next(err);
    }
  },
};
