import { query, withTransaction } from "../database/db.js";

export const StockModel = {
  async getAll({ low_stock = false } = {}) {
    const havingClause = low_stock
      ? "AND s.quantity <= s.minimum_quantity"
      : "";

    const sql = `
      SELECT
        p.id AS part_id, p.name AS part_name, p.part_number,
        p.category, p.unit, p.cost_price, p.sale_price,
        COALESCE(s.quantity, 0) AS quantity,
        COALESCE(s.minimum_quantity, 0) AS minimum_quantity,
        s.location,
        s.updated_at AS last_updated
      FROM parts p
      LEFT JOIN stock s ON s.part_id = p.id
      WHERE p.deleted_at IS NULL AND p.is_active = TRUE
      ${havingClause}
      ORDER BY p.name
    `;
    return (await query(sql)).rows;
  },

  async getMovements({ part_id, limit = 50, offset = 0, movement_type } = {}) {
    const params = [];
    const conditions = [];

    if (part_id) {
      params.push(part_id);
      conditions.push(`sm.part_id = $${params.length}`);
    }
    if (movement_type) {
      params.push(movement_type);
      conditions.push(`sm.movement_type = $${params.length}::stock_movement_type`);
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    params.push(limit, offset);

    const sql = `
      SELECT
        sm.*, p.name AS part_name, u.name AS user_name,
        sup.name AS supplier_name
      FROM stock_movements sm
      JOIN parts p ON p.id = sm.part_id
      LEFT JOIN users u ON u.id = sm.user_id
      LEFT JOIN suppliers sup ON sup.id = sm.supplier_id
      ${whereClause}
      ORDER BY sm.created_at DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `;
    return (await query(sql, params)).rows;
  },

  async addMovement({ part_id, user_id, supplier_id, movement_type, quantity, unit_cost, reference_id, reference_type, notes }) {
    if (movement_type === "out" || movement_type === "adjustment") {
      const current = await query("SELECT quantity FROM stock WHERE part_id = $1", [part_id]);
      const currentQty = current.rows[0]?.quantity || 0;
      if (currentQty < quantity) {
        throw Object.assign(new Error("Estoque insuficiente."), { status: 400 });
      }
    }

    const sql = `
      INSERT INTO stock_movements
        (part_id, user_id, supplier_id, movement_type, quantity, unit_cost, reference_id, reference_type, notes)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;
    return (await query(sql, [
      part_id, user_id, supplier_id, movement_type,
      quantity, unit_cost, reference_id, reference_type, notes,
    ])).rows[0];
  },

  async getCurrentQuantity(partId) {
    const result = await query("SELECT quantity FROM stock WHERE part_id = $1", [partId]);
    return result.rows[0]?.quantity || 0;
  },
};
