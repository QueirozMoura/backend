import { query } from "../database/db.js";

export const TechnicianModel = {
  async findAll({ available } = {}) {
    const conditions = ["u.deleted_at IS NULL"];
    const params = [];

    if (typeof available === "boolean") {
      params.push(available);
      conditions.push(`t.is_available = $${params.length}`);
    }

    const sql = `
      SELECT
        t.id, t.user_id, t.specialties, t.commission_rate, t.is_available,
        u.name, u.email, u.phone,
        COUNT(so.id) FILTER (WHERE so.status NOT IN ('completed','delivered','cancelled')) AS open_orders
      FROM technicians t
      JOIN users u ON u.id = t.user_id
      LEFT JOIN service_orders so ON so.technician_id = t.id AND so.deleted_at IS NULL
      WHERE ${conditions.join(" AND ")}
      GROUP BY t.id, u.name, u.email, u.phone
      ORDER BY u.name
    `;
    return (await query(sql, params)).rows;
  },

  async findById(id) {
    const sql = `
      SELECT t.*, u.name, u.email, u.phone, u.avatar_url
      FROM technicians t
      JOIN users u ON u.id = t.user_id
      WHERE t.id = $1 AND u.deleted_at IS NULL
    `;
    return (await query(sql, [id])).rows[0] || null;
  },

  async findByUserId(userId) {
    return (
      await query("SELECT * FROM technicians WHERE user_id = $1", [userId])
    ).rows[0] || null;
  },

  async create(userId, { specialties, commission_rate }) {
    const sql = `
      INSERT INTO technicians (user_id, specialties, commission_rate)
      VALUES ($1, $2, $3)
      RETURNING *
    `;
    return (await query(sql, [userId, specialties, commission_rate || 0])).rows[0];
  },

  async update(id, { specialties, commission_rate, is_available }) {
    const sql = `
      UPDATE technicians SET
        specialties     = COALESCE($2, specialties),
        commission_rate = COALESCE($3, commission_rate),
        is_available    = COALESCE($4, is_available)
      WHERE id = $1
      RETURNING *
    `;
    return (await query(sql, [id, specialties, commission_rate, is_available])).rows[0] || null;
  },

  async getProductivity({ start, end } = {}) {
    const sql = `
      SELECT
        u.name AS technician_name,
        COUNT(so.id)                        AS total_orders,
        COUNT(so.id) FILTER (WHERE so.status IN ('completed','delivered')) AS completed_orders,
        SUM(so.labor_cost)                  AS total_labor,
        AVG(
          EXTRACT(EPOCH FROM (so.completed_at - so.created_at)) / 3600
        )::NUMERIC(10,1)                    AS avg_hours_to_complete
      FROM technicians t
      JOIN users u ON u.id = t.user_id
      LEFT JOIN service_orders so
        ON so.technician_id = t.id
        AND so.deleted_at IS NULL
        ${start ? "AND so.created_at >= $1" : ""}
        ${end ? `AND so.created_at <= $${start ? 2 : 1}` : ""}
      WHERE u.deleted_at IS NULL
      GROUP BY t.id, u.name
      ORDER BY completed_orders DESC
    `;

    const params = [];
    if (start) params.push(start);
    if (end) params.push(end);

    return (await query(sql, params)).rows;
  },
};
