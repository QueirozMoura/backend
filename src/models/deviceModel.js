import { query } from "../database/db.js";

export const DeviceModel = {
  async findAll({ clientId, limit = 50, offset = 0 } = {}) {
    const params = ["deleted_at IS NULL"];
    const conditions = [];

    if (clientId) {
      conditions.push(`d.client_id = '${clientId}'`);
    }

    const whereClause = conditions.length ? `AND ${conditions.join(" AND ")}` : "";

    const sql = `
      SELECT
        d.*,
        db.name AS brand_name_catalog,
        c.name  AS client_name
      FROM devices d
      LEFT JOIN device_brands db ON db.id = d.brand_id
      LEFT JOIN clients c ON c.id = d.client_id
      WHERE d.deleted_at IS NULL ${clientId ? "AND d.client_id = $1" : ""}
      ORDER BY d.created_at DESC
      LIMIT ${clientId ? "$2" : "$1"} OFFSET ${clientId ? "$3" : "$2"}
    `;

    const queryParams = clientId ? [clientId, limit, offset] : [limit, offset];
    return (await query(sql, queryParams)).rows;
  },

  async findById(id) {
    const sql = `
      SELECT
        d.*,
        db.name AS brand_name_catalog,
        c.name  AS client_name,
        c.phone AS client_phone
      FROM devices d
      LEFT JOIN device_brands db ON db.id = d.brand_id
      LEFT JOIN clients c ON c.id = d.client_id
      WHERE d.id = $1 AND d.deleted_at IS NULL
    `;
    return (await query(sql, [id])).rows[0] || null;
  },

  async create({ client_id, category, brand_id, brand_name, model, serial_number, color, notes }) {
    const sql = `
      INSERT INTO devices (client_id, category, brand_id, brand_name, model, serial_number, color, notes)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;
    return (await query(sql, [client_id, category, brand_id, brand_name, model, serial_number, color, notes])).rows[0];
  },

  async update(id, { category, brand_id, brand_name, model, serial_number, color, notes }) {
    const sql = `
      UPDATE devices SET
        category      = COALESCE($2, category),
        brand_id      = COALESCE($3, brand_id),
        brand_name    = COALESCE($4, brand_name),
        model         = COALESCE($5, model),
        serial_number = COALESCE($6, serial_number),
        color         = COALESCE($7, color),
        notes         = COALESCE($8, notes)
      WHERE id = $1 AND deleted_at IS NULL
      RETURNING *
    `;
    return (await query(sql, [id, category, brand_id, brand_name, model, serial_number, color, notes])).rows[0] || null;
  },

  async softDelete(id) {
    const result = await query(
      "UPDATE devices SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL",
      [id]
    );
    return result.rowCount > 0;
  },

  async getBrands() {
    return (await query("SELECT * FROM device_brands ORDER BY name")).rows;
  },
};
