/**
 * Seed: cria ou corrige o usuário administrador inicial.
 *
 * Uso:
 *   ADMIN_EMAIL=admin@exemplo.com ADMIN_PASSWORD=SenhaForte123 node src/database/seeds/admin.js
 *
 * Ou com os valores padrão (apenas para desenvolvimento local):
 *   node src/database/seeds/admin.js
 */

import bcrypt from "bcryptjs";
import pg from "pg";

const { Pool } = pg;

const pool = new Pool({
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD || "postgre",
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || "assistencia_tecnica",
});

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@assistencia.com";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "Admin@1234";
const ADMIN_NAME = process.env.ADMIN_NAME || "Administrador";

async function seedAdmin() {
  const client = await pool.connect();

  try {
    console.log(`Gerando hash bcrypt para "${ADMIN_EMAIL}"...`);
    const password_hash = await bcrypt.hash(ADMIN_PASSWORD, 10);

    // Upsert: insere se não existir, atualiza se já existir com hash placeholder
    const result = await client.query(
      `
      INSERT INTO users (name, email, password_hash, role)
      VALUES ($1, $2, $3, 'admin')
      ON CONFLICT (email) DO UPDATE
        SET name          = EXCLUDED.name,
            password_hash = EXCLUDED.password_hash,
            role          = 'admin',
            is_active     = TRUE,
            deleted_at    = NULL
      RETURNING id, name, email, role
      `,
      [ADMIN_NAME, ADMIN_EMAIL, password_hash]
    );

    const user = result.rows[0];
    console.log("Administrador configurado com sucesso:");
    console.log(`  id:    ${user.id}`);
    console.log(`  nome:  ${user.name}`);
    console.log(`  email: ${user.email}`);
    console.log(`  role:  ${user.role}`);
    console.log(`  senha: ${ADMIN_PASSWORD}`);
    console.log("\nALTERE a senha após o primeiro login em produção!");
  } finally {
    client.release();
    await pool.end();
  }
}

console.log("Executando seed do administrador...");
seedAdmin().catch((err) => {
  console.error("Erro no seed:", err.message);
  process.exit(1);
});
