import { PaymentModel } from "../models/paymentModel.js";
import { createError } from "../middlewares/errorHandler.js";

export const PaymentController = {
  async listByOrder(req, res, next) {
    try {
      res.json(await PaymentModel.findByOrderId(req.params.orderId));
    } catch (err) {
      next(err);
    }
  },

  async register(req, res, next) {
    try {
      const service_order_id = req.params.orderId || req.body.service_order_id;
      const { amount, method, installments, notes } = req.body;

      if (!service_order_id || !amount || !method) {
        throw createError(400, "service_order_id, amount e method são obrigatórios.");
      }

      const payment = await PaymentModel.create({
        service_order_id,
        received_by: req.user.id,
        amount: Number(amount),
        method,
        installments: Number(installments) || 1,
        notes,
      });

      res.status(201).json(payment);
    } catch (err) {
      next(err);
    }
  },

  async financialSummary(req, res, next) {
    try {
      const { start, end } = req.query;
      res.json(await PaymentModel.getFinancialSummary({ start, end }));
    } catch (err) {
      next(err);
    }
  },
};
