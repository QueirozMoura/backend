import { query } from "../database/db.js";

export const ClientModel = {
  async findAll({ limit = 50, offset = 0, search, is_active } = {}) {
    const params = [];
    const conditions = ["c.deleted_at IS NULL"];

    if (typeof is_active === "boolean") {
      params.push(is_active);
      conditions.push(`c.is_active = $${params.length}`);
    }

    if (search) {
      params.push(search);
      conditions.push(
        `(c.name ILIKE '%' || $${params.length} || '%' OR c.cpf ILIKE '%' || $${params.length} || '%' OR c.phone ILIKE '%' || $${params.length} || '%' OR c.email ILIKE '%' || $${params.length} || '%')`
      );
    }

    params.push(limit, offset);

    const sql = `
      SELECT
        c.id, c.name, c.cpf, c.email, c.phone, c.phone_secondary,
        c.is_active, c.created_at,
        COUNT(DISTINCT d.id) AS total_devices,
        COUNT(DISTINCT so.id) AS total_orders
      FROM clients c
      LEFT JOIN devices d ON d.client_id = c.id AND d.deleted_at IS NULL
      LEFT JOIN service_orders so ON so.client_id = c.id AND so.deleted_at IS NULL
      WHERE ${conditions.join(" AND ")}
      GROUP BY c.id
      ORDER BY c.name
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `;

    return (await query(sql, params)).rows;
  },

  async findById(id) {
    const sql = `
      SELECT
        c.*,
        COALESCE(
          json_agg(ca ORDER BY ca.is_primary DESC) FILTER (WHERE ca.id IS NOT NULL),
          '[]'
        ) AS addresses
      FROM clients c
      LEFT JOIN client_addresses ca ON ca.client_id = c.id
      WHERE c.id = $1 AND c.deleted_at IS NULL
      GROUP BY c.id
    `;
    return (await query(sql, [id])).rows[0] || null;
  },

  async findByCpf(cpf) {
    return (
      await query("SELECT id, name, cpf FROM clients WHERE cpf = $1 AND deleted_at IS NULL", [cpf])
    ).rows[0] || null;
  },

  async create({ name, cpf, email, phone, phone_secondary, notes }) {
    const sql = `
      INSERT INTO clients (name, cpf, email, phone, phone_secondary, notes)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    return (await query(sql, [name, cpf, email, phone, phone_secondary, notes])).rows[0];
  },

  async update(id, { name, cpf, email, phone, phone_secondary, notes, is_active }) {
    const sql = `
      UPDATE clients SET
        name            = COALESCE($2, name),
        cpf             = COALESCE($3, cpf),
        email           = COALESCE($4, email),
        phone           = COALESCE($5, phone),
        phone_secondary = COALESCE($6, phone_secondary),
        notes           = COALESCE($7, notes),
        is_active       = COALESCE($8, is_active)
      WHERE id = $1 AND deleted_at IS NULL
      RETURNING *
    `;
    return (await query(sql, [id, name, cpf, email, phone, phone_secondary, notes, is_active])).rows[0] || null;
  },

  async softDelete(id) {
    const result = await query(
      "UPDATE clients SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL",
      [id]
    );
    return result.rowCount > 0;
  },

  // Endereços
  async addAddress(clientId, { street, number, complement, neighborhood, city, state, zip_code, is_primary }) {
    if (is_primary) {
      await query("UPDATE client_addresses SET is_primary = FALSE WHERE client_id = $1", [clientId]);
    }
    const sql = `
      INSERT INTO client_addresses (client_id, street, number, complement, neighborhood, city, state, zip_code, is_primary)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;
    return (await query(sql, [clientId, street, number, complement, neighborhood, city, state, zip_code, is_primary || false])).rows[0];
  },

  async getAddresses(clientId) {
    return (
      await query("SELECT * FROM client_addresses WHERE client_id = $1 ORDER BY is_primary DESC", [clientId])
    ).rows;
  },

  async getDevices(clientId) {
    const sql = `
      SELECT d.*, db.name AS brand_name_catalog
      FROM devices d
      LEFT JOIN device_brands db ON db.id = d.brand_id
      WHERE d.client_id = $1 AND d.deleted_at IS NULL
      ORDER BY d.created_at DESC
    `;
    return (await query(sql, [clientId])).rows;
  },
};
