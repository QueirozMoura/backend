import { ServiceOrderModel } from "../models/serviceOrderModel.js";
import { StockModel } from "../models/stockModel.js";
import { createError } from "../middlewares/errorHandler.js";
import { withTransaction } from "../database/db.js";

// Status válidos para transições
const VALID_TRANSITIONS = {
  open:             ["in_diagnosis", "cancelled"],
  in_diagnosis:     ["waiting_approval", "in_progress", "cancelled"],
  waiting_approval: ["approved", "cancelled"],
  approved:         ["in_progress", "waiting_parts"],
  in_progress:      ["waiting_parts", "completed"],
  waiting_parts:    ["in_progress", "cancelled"],
  completed:        ["delivered"],
  delivered:        [],
  cancelled:        [],
};

export const ServiceOrderController = {
  async list(req, res, next) {
    try {
      const { limit, offset, status, technician_id, client_id, priority, search } = req.query;

      // Técnicos só veem suas próprias OSs
      const filterTechnicianId =
        req.user.role === "technician" ? req.user.technician_id : technician_id;

      const orders = await ServiceOrderModel.findAll({
        limit: Number(limit) || 50,
        offset: Number(offset) || 0,
        status,
        technician_id: filterTechnicianId,
        client_id,
        priority,
        search,
      });
      res.json(orders);
    } catch (err) {
      next(err);
    }
  },

  async get(req, res, next) {
    try {
      const order = await ServiceOrderModel.findById(req.params.id);
      if (!order) throw createError(404, "Ordem de serviço não encontrada.");
      res.json(order);
    } catch (err) {
      next(err);
    }
  },

  async create(req, res, next) {
    try {
      const { client_id, device_id, priority, reported_issue, technician_id, internal_notes, estimated_completion_date, labor_cost, warranty_days } = req.body;

      if (!client_id || !device_id || !reported_issue) {
        throw createError(400, "client_id, device_id e reported_issue são obrigatórios.");
      }

      const order = await ServiceOrderModel.create({
        client_id, device_id, technician_id,
        created_by: req.user.id,
        priority, reported_issue, internal_notes,
        estimated_completion_date, labor_cost, warranty_days,
      });

      res.status(201).json(order);
    } catch (err) {
      next(err);
    }
  },

  async update(req, res, next) {
    try {
      const order = await ServiceOrderModel.update(req.params.id, req.body);
      if (!order) throw createError(404, "Ordem de serviço não encontrada.");
      res.json(order);
    } catch (err) {
      next(err);
    }
  },

  async changeStatus(req, res, next) {
    try {
      const { status, notes } = req.body;
      if (!status) throw createError(400, "Novo status é obrigatório.");

      const current = await ServiceOrderModel.findById(req.params.id);
      if (!current) throw createError(404, "Ordem de serviço não encontrada.");

      const allowed = VALID_TRANSITIONS[current.status] || [];
      if (!allowed.includes(status)) {
        throw createError(400, `Transição de '${current.status}' para '${status}' não é permitida.`);
      }

      const updated = await ServiceOrderModel.changeStatus(
        req.params.id, status, req.user.id, notes
      );

      res.json(updated);
    } catch (err) {
      next(err);
    }
  },

  async addPart(req, res, next) {
    try {
      const { part_id, quantity, unit_price } = req.body;
      if (!part_id || !quantity || !unit_price) {
        throw createError(400, "part_id, quantity e unit_price são obrigatórios.");
      }

      const entry = await ServiceOrderModel.addPart(req.params.id, { part_id, quantity, unit_price });

      // Registra saída do estoque
      await StockModel.addMovement({
        part_id,
        user_id: req.user.id,
        movement_type: "out",
        quantity,
        reference_id: req.params.id,
        reference_type: "service_order",
        notes: `Usado na OS ${req.params.id}`,
      });

      res.status(201).json(entry);
    } catch (err) {
      next(err);
    }
  },

  async removePart(req, res, next) {
    try {
      const removed = await ServiceOrderModel.removePart(req.params.partEntryId);
      if (!removed) throw createError(404, "Peça não encontrada na OS.");
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  },

  async delete(req, res, next) {
    try {
      if (req.user.role !== "admin") throw createError(403, "Apenas administradores podem excluir OSs.");
      const deleted = await ServiceOrderModel.softDelete(req.params.id);
      if (!deleted) throw createError(404, "Ordem de serviço não encontrada.");
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  },
};
