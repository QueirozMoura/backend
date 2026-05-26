import { query } from "../database/db.js";

export const UserModel = {
  async findAll({ limit = 50, offset = 0, role, search } = {}) {
    const params = [];
    const conditions = ["deleted_at IS NULL"];

    if (role) {
      params.push(role);
      conditions.push(`role = $${params.length}`);
    }

    if (search) {
      params.push(`%${search}%`);
      conditions.push(`(name ILIKE $${params.length} OR email ILIKE $${params.length})`);
    }

    params.push(limit, offset);

    const sql = `
      SELECT id, name, email, role, phone, avatar_url, is_active, last_login_at, created_at
      FROM users
      WHERE ${conditions.join(" AND ")}
      ORDER BY name
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `;

    return (await query(sql, params)).rows;
  },

  async findById(id) {
    const sql = `
      SELECT id, name, email, role, phone, avatar_url, is_active, last_login_at, created_at, updated_at
      FROM users
      WHERE id = $1 AND deleted_at IS NULL
    `;
    return (await query(sql, [id])).rows[0] || null;
  },

  async findByEmail(email) {
    const sql = `
      SELECT id, name, email, password_hash, role, is_active, deleted_at
      FROM users
      WHERE email = $1
    `;
    return (await query(sql, [email])).rows[0] || null;
  },

  async create({ name, email, password_hash, role, phone }) {
    const sql = `
      INSERT INTO users (name, email, password_hash, role, phone)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, name, email, role, phone, is_active, created_at
    `;
    return (await query(sql, [name, email, password_hash, role || "attendant", phone])).rows[0];
  },

  async update(id, { name, phone, avatar_url, is_active }) {
    const sql = `
      UPDATE users
      SET name = COALESCE($2, name),
          phone = COALESCE($3, phone),
          avatar_url = COALESCE($4, avatar_url),
          is_active = COALESCE($5, is_active)
      WHERE id = $1 AND deleted_at IS NULL
      RETURNING id, name, email, role, phone, avatar_url, is_active, updated_at
    `;
    return (await query(sql, [id, name, phone, avatar_url, is_active])).rows[0] || null;
  },

  async updatePassword(id, password_hash) {
    await query("UPDATE users SET password_hash = $2 WHERE id = $1", [id, password_hash]);
  },

  async updateLastLogin(id) {
    await query("UPDATE users SET last_login_at = NOW() WHERE id = $1", [id]);
  },

  async softDelete(id) {
    const result = await query(
      "UPDATE users SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL",
      [id]
    );
    return result.rowCount > 0;
  },

  // Refresh tokens
  async saveRefreshToken(userId, tokenHash, expiresAt) {
    await query(
      "INSERT INTO user_refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)",
      [userId, tokenHash, expiresAt]
    );
  },

  async findRefreshToken(tokenHash) {
    const sql = `
      SELECT id, user_id, expires_at, revoked_at
      FROM user_refresh_tokens
      WHERE token_hash = $1
    `;
    return (await query(sql, [tokenHash])).rows[0] || null;
  },

  async revokeRefreshToken(tokenHash) {
    await query(
      "UPDATE user_refresh_tokens SET revoked_at = NOW() WHERE token_hash = $1",
      [tokenHash]
    );
  },

  async revokeAllUserTokens(userId) {
    await query(
      "UPDATE user_refresh_tokens SET revoked_at = NOW() WHERE user_id = $1 AND revoked_at IS NULL",
      [userId]
    );
  },
};
