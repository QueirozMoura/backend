import { query, withTransaction } from "../database/db.js";

export const ServiceOrderModel = {
  async findAll({ limit = 50, offset = 0, status, technician_id, client_id, priority, search } = {}) {
    const params = [];
    const conditions = ["so.deleted_at IS NULL"];

    if (status) {
      params.push(status);
      conditions.push(`so.status = $${params.length}::service_order_status`);
    }
    if (technician_id) {
      params.push(technician_id);
      conditions.push(`so.technician_id = $${params.length}`);
    }
    if (client_id) {
      params.push(client_id);
      conditions.push(`so.client_id = $${params.length}`);
    }
    if (priority) {
      params.push(priority);
      conditions.push(`so.priority = $${params.length}::priority_level`);
    }
    if (search) {
      params.push(`%${search}%`);
      conditions.push(
        `(so.order_number ILIKE $${params.length} OR c.name ILIKE $${params.length} OR so.reported_issue ILIKE $${params.length})`
      );
    }

    params.push(limit, offset);

    const sql = `
      SELECT
        so.id, so.order_number, so.status, so.priority,
        so.reported_issue, so.labor_cost, so.final_amount,
        so.created_at, so.updated_at, so.estimated_completion_date,
        c.id AS client_id, c.name AS client_name, c.phone AS client_phone,
        d.category AS device_category, d.model AS device_model,
        COALESCE(db.name, d.brand_name) AS device_brand,
        u.name AS technician_name
      FROM service_orders so
      JOIN clients c ON c.id = so.client_id
      JOIN devices d ON d.id = so.device_id
      LEFT JOIN device_brands db ON db.id = d.brand_id
      LEFT JOIN technicians t ON t.id = so.technician_id
      LEFT JOIN users u ON u.id = t.user_id
      WHERE ${conditions.join(" AND ")}
      ORDER BY
        CASE so.priority WHEN 'urgent' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END,
        so.created_at DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `;

    return (await query(sql, params)).rows;
  },

  async findById(id) {
    const sql = `
      SELECT
        so.*,
        c.name AS client_name, c.phone AS client_phone, c.email AS client_email,
        d.category AS device_category, d.model AS device_model,
        d.serial_number AS device_serial,
        COALESCE(db.name, d.brand_name) AS device_brand,
        u_tech.name AS technician_name,
        u_created.name AS created_by_name,
        COALESCE(
          json_agg(
            json_build_object(
              'id', sop.id,
              'part_id', sop.part_id,
              'part_name', p.name,
              'quantity', sop.quantity,
              'unit_price', sop.unit_price,
              'total_price', sop.total_price
            ) ORDER BY sop.created_at
          ) FILTER (WHERE sop.id IS NOT NULL), '[]'
        ) AS parts,
        COALESCE(
          json_agg(
            json_build_object(
              'status_from', ssh.status_from,
              'status_to', ssh.status_to,
              'notes', ssh.notes,
              'changed_by', u_hist.name,
              'created_at', ssh.created_at
            ) ORDER BY ssh.created_at
          ) FILTER (WHERE ssh.id IS NOT NULL), '[]'
        ) AS status_history
      FROM service_orders so
      JOIN clients c ON c.id = so.client_id
      JOIN devices d ON d.id = so.device_id
      LEFT JOIN device_brands db ON db.id = d.brand_id
      LEFT JOIN technicians t ON t.id = so.technician_id
      LEFT JOIN users u_tech ON u_tech.id = t.user_id
      LEFT JOIN users u_created ON u_created.id = so.created_by
      LEFT JOIN service_order_parts sop ON sop.service_order_id = so.id
      LEFT JOIN parts p ON p.id = sop.part_id
      LEFT JOIN service_order_status_history ssh ON ssh.service_order_id = so.id
      LEFT JOIN users u_hist ON u_hist.id = ssh.changed_by
      WHERE so.id = $1 AND so.deleted_at IS NULL
      GROUP BY so.id, c.name, c.phone, c.email, d.category, d.model, d.serial_number,
               db.name, d.brand_name, u_tech.name, u_created.name
    `;
    return (await query(sql, [id])).rows[0] || null;
  },

  async create({ client_id, device_id, technician_id, created_by, priority, reported_issue, internal_notes, estimated_completion_date, labor_cost, warranty_days }) {
    const sql = `
      INSERT INTO service_orders
        (client_id, device_id, technician_id, created_by, priority, reported_issue, internal_notes, estimated_completion_date, labor_cost, warranty_days, order_number)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, '')
      RETURNING *
    `;
    return (await query(sql, [
      client_id, device_id, technician_id, created_by,
      priority || "medium", reported_issue, internal_notes,
      estimated_completion_date, labor_cost || 0, warranty_days || 0,
    ])).rows[0];
  },

  async update(id, fields) {
    const allowed = [
      "technician_id", "priority", "diagnosis", "solution",
      "internal_notes", "estimated_completion_date", "labor_cost",
      "discount", "warranty_days",
    ];

    const setClauses = [];
    const params = [id];

    for (const key of allowed) {
      if (fields[key] !== undefined) {
        params.push(fields[key]);
        setClauses.push(`${key} = $${params.length}`);
      }
    }

    if (setClauses.length === 0) return null;

    const sql = `
      UPDATE service_orders SET ${setClauses.join(", ")}
      WHERE id = $1 AND deleted_at IS NULL
      RETURNING *
    `;
    return (await query(sql, params)).rows[0] || null;
  },

  async changeStatus(id, statusTo, changedBy, notes) {
    return withTransaction(async (client) => {
      const current = await client.query(
        "SELECT status FROM service_orders WHERE id = $1 AND deleted_at IS NULL FOR UPDATE",
        [id]
      );
      if (!current.rows[0]) return null;

      const statusFrom = current.rows[0].status;

      const extraFields = {};
      if (statusTo === "completed") extraFields.completed_at = "NOW()";
      if (statusTo === "delivered") extraFields.delivered_at = "NOW()";

      const extraSql = Object.keys(extraFields)
        .map((k) => `${k} = ${extraFields[k]}`)
        .join(", ");

      const updateSql = `
        UPDATE service_orders
        SET status = $2::service_order_status ${extraSql ? ", " + extraSql : ""}
        WHERE id = $1
        RETURNING *
      `;
      const updated = await client.query(updateSql, [id, statusTo]);

      await client.query(
        "INSERT INTO service_order_status_history (service_order_id, changed_by, status_from, status_to, notes) VALUES ($1, $2, $3, $4, $5)",
        [id, changedBy, statusFrom, statusTo, notes]
      );

      return updated.rows[0];
    });
  },

  // Peças da OS
  async addPart(serviceOrderId, { part_id, quantity, unit_price }) {
    const sql = `
      INSERT INTO service_order_parts (service_order_id, part_id, quantity, unit_price)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;
    return (await query(sql, [serviceOrderId, part_id, quantity, unit_price])).rows[0];
  },

  async removePart(partEntryId) {
    const result = await query("DELETE FROM service_order_parts WHERE id = $1", [partEntryId]);
    return result.rowCount > 0;
  },

  async softDelete(id) {
    const result = await query(
      "UPDATE service_orders SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL",
      [id]
    );
    return result.rowCount > 0;
  },

  // Dashboard / Relatórios
  async countByStatus() {
    const sql = `
      SELECT status, COUNT(*) AS total
      FROM service_orders
      WHERE deleted_at IS NULL
      GROUP BY status
    `;
    return (await query(sql)).rows;
  },

  async revenueByPeriod(start, end) {
    const sql = `
      SELECT
        DATE_TRUNC('day', p.paid_at) AS day,
        SUM(p.amount) AS total
      FROM payments p
      JOIN service_orders so ON so.id = p.service_order_id
      WHERE p.status = 'paid'
        AND p.paid_at BETWEEN $1 AND $2
        AND so.deleted_at IS NULL
      GROUP BY 1
      ORDER BY 1
    `;
    return (await query(sql, [start, end])).rows;
  },
};
