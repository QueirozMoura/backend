import { query, withTransaction } from "../database/db.js";

export const PaymentModel = {
  async findByOrderId(serviceOrderId) {
    const sql = `
      SELECT
        p.*,
        u.name AS received_by_name,
        COALESCE(
          json_agg(pi ORDER BY pi.installment_number) FILTER (WHERE pi.id IS NOT NULL), '[]'
        ) AS installments_detail
      FROM payments p
      LEFT JOIN users u ON u.id = p.received_by
      LEFT JOIN payment_installments pi ON pi.payment_id = p.id
      WHERE p.service_order_id = $1
      GROUP BY p.id, u.name
      ORDER BY p.created_at
    `;
    return (await query(sql, [serviceOrderId])).rows;
  },

  async create({ service_order_id, received_by, amount, method, installments, notes }) {
    return withTransaction(async (client) => {
      const paymentResult = await client.query(
        `INSERT INTO payments (service_order_id, received_by, amount, method, installments, notes, status, paid_at)
         VALUES ($1, $2, $3, $4, $5, $6, 'paid', NOW())
         RETURNING *`,
        [service_order_id, received_by, amount, method, installments || 1, notes]
      );
      const payment = paymentResult.rows[0];

      if (installments && installments > 1) {
        const installmentAmount = (amount / installments).toFixed(2);
        const today = new Date();

        for (let i = 1; i <= installments; i++) {
          const dueDate = new Date(today);
          dueDate.setMonth(today.getMonth() + i - 1);

          await client.query(
            `INSERT INTO payment_installments (payment_id, installment_number, amount, due_date, status)
             VALUES ($1, $2, $3, $4, 'pending')`,
            [payment.id, i, installmentAmount, dueDate.toISOString().split("T")[0]]
          );
        }
      }

      return payment;
    });
  },

  async getFinancialSummary({ start, end } = {}) {
    const conditions = ["p.status = 'paid'"];
    const params = [];

    if (start) { params.push(start); conditions.push(`p.paid_at >= $${params.length}`); }
    if (end)   { params.push(end);   conditions.push(`p.paid_at <= $${params.length}`); }

    const sql = `
      SELECT
        COUNT(DISTINCT p.id)                                   AS total_payments,
        SUM(p.amount)                                          AS total_revenue,
        SUM(p.amount) FILTER (WHERE p.method = 'cash')        AS revenue_cash,
        SUM(p.amount) FILTER (WHERE p.method = 'pix')         AS revenue_pix,
        SUM(p.amount) FILTER (WHERE p.method = 'credit_card') AS revenue_credit_card,
        SUM(p.amount) FILTER (WHERE p.method = 'debit_card')  AS revenue_debit_card,
        COUNT(*) FILTER (WHERE so.status = 'delivered')        AS orders_delivered
      FROM payments p
      JOIN service_orders so ON so.id = p.service_order_id
      WHERE ${conditions.join(" AND ")}
    `;
    return (await query(sql, params)).rows[0];
  },
};
