import pg from "pg";

const { Pool } = pg;

export const pool = new Pool({
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD || "postgre",
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || "assistencia_tecnica",
  max: 20,                // máximo de conexões no pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on("error", (err) => {
  console.error("Erro inesperado no pool do PostgreSQL:", err.message);
});

// Helper: executa query com tratamento de erros
export async function query(text, params) {
  const start = Date.now();
  const result = await pool.query(text, params);
  const duration = Date.now() - start;

  if (process.env.NODE_ENV === "development") {
    console.log("query", { text: text.substring(0, 80), duration, rows: result.rowCount });
  }

  return result;
}

// Helper: transação com rollback automático em caso de erro
export async function withTransaction(fn) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}
