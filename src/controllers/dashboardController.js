import { ServiceOrderModel } from "../models/serviceOrderModel.js";
import { PaymentModel } from "../models/paymentModel.js";
import { query } from "../database/db.js";

export const DashboardController = {
  async summary(req, res, next) {
    try {
      const [statusCounts, financial, lowStock, recentOrders] = await Promise.all([
        // Contagem de OS por status
        ServiceOrderModel.countByStatus(),

        // Resumo financeiro do mês atual
        PaymentModel.getFinancialSummary({
          start: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          end: new Date(),
        }),

        // Peças com estoque abaixo do mínimo
        query(`
          SELECT p.id, p.name, p.part_number, s.quantity, s.minimum_quantity
          FROM parts p
          JOIN stock s ON s.part_id = p.id
          WHERE s.quantity <= s.minimum_quantity AND p.is_active = TRUE AND p.deleted_at IS NULL
          LIMIT 10
        `),

        // OSs recentes
        query(`
          SELECT so.order_number, so.status, so.priority, c.name AS client_name,
                 d.model AS device_model, so.created_at
          FROM service_orders so
          JOIN clients c ON c.id = so.client_id
          JOIN devices d ON d.id = so.device_id
          WHERE so.deleted_at IS NULL AND so.status NOT IN ('delivered', 'cancelled')
          ORDER BY
            CASE so.priority WHEN 'urgent' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END,
            so.created_at DESC
          LIMIT 10
        `),
      ]);

      res.json({
        orders_by_status: statusCounts,
        financial_month: financial,
        low_stock_alerts: lowStock.rows,
        recent_orders: recentOrders.rows,
      });
    } catch (err) {
      next(err);
    }
  },

  async revenueChart(req, res, next) {
    try {
      const { start, end } = req.query;
      const startDate = start || new Date(new Date().getFullYear(), new Date().getMonth() - 2, 1).toISOString();
      const endDate = end || new Date().toISOString();

      res.json(await ServiceOrderModel.revenueByPeriod(startDate, endDate));
    } catch (err) {
      next(err);
    }
  },
};
