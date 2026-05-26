import { query } from "../database/db.js";

export const PartModel = {
  async findAll({ limit = 50, offset = 0, search, category, low_stock } = {}) {
    const params = [];
    const conditions = ["p.deleted_at IS NULL", "p.is_active = TRUE"];

    if (search) {
      params.push(`%${search}%`);
      conditions.push(`(p.name ILIKE $${params.length} OR p.part_number ILIKE $${params.length})`);
    }
    if (category) {
      params.push(category);
      conditions.push(`p.category = $${params.length}`);
    }

    const havingClause = low_stock ? "HAVING COALESCE(s.quantity, 0) <= s.minimum_quantity" : "";

    params.push(limit, offset);

    const sql = `
      SELECT
        p.id, p.name, p.description, p.part_number, p.category,
        p.unit, p.cost_price, p.sale_price, p.is_active,
        COALESCE(s.quantity, 0) AS stock_quantity,
        COALESCE(s.minimum_quantity, 0) AS minimum_quantity,
        s.location
      FROM parts p
      LEFT JOIN stock s ON s.part_id = p.id
      WHERE ${conditions.join(" AND ")}
      ${havingClause}
      ORDER BY p.name
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `;

    return (await query(sql, params)).rows;
  },

  async findById(id) {
    const sql = `
      SELECT p.*, COALESCE(s.quantity, 0) AS stock_quantity,
             COALESCE(s.minimum_quantity, 0) AS minimum_quantity, s.location
      FROM parts p
      LEFT JOIN stock s ON s.part_id = p.id
      WHERE p.id = $1 AND p.deleted_at IS NULL
    `;
    return (await query(sql, [id])).rows[0] || null;
  },

  async create({ name, description, part_number, category, unit, cost_price, sale_price }) {
    const sql = `
      INSERT INTO parts (name, description, part_number, category, unit, cost_price, sale_price)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
    return (await query(sql, [name, description, part_number, category, unit || "unit", cost_price, sale_price])).rows[0];
  },

  async update(id, { name, description, part_number, category, unit, cost_price, sale_price, is_active }) {
    const sql = `
      UPDATE parts SET
        name        = COALESCE($2, name),
        description = COALESCE($3, description),
        part_number = COALESCE($4, part_number),
        category    = COALESCE($5, category),
        unit        = COALESCE($6, unit),
        cost_price  = COALESCE($7, cost_price),
        sale_price  = COALESCE($8, sale_price),
        is_active   = COALESCE($9, is_active)
      WHERE id = $1 AND deleted_at IS NULL
      RETURNING *
    `;
    return (await query(sql, [id, name, description, part_number, category, unit, cost_price, sale_price, is_active])).rows[0] || null;
  },

  async softDelete(id) {
    const result = await query(
      "UPDATE parts SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL",
      [id]
    );
    return result.rowCount > 0;
  },
};
