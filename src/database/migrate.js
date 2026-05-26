import { readFileSync, readdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import pg from "pg";

const { Pool } = pg;
const __dirname = dirname(fileURLToPath(import.meta.url));

const pool = new Pool({
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD || "postgre",
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || "assistencia_tecnica",
});

async function ensureMigrationsTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id         SERIAL      PRIMARY KEY,
      filename   VARCHAR(255) UNIQUE NOT NULL,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

async function getAppliedMigrations(client) {
  const result = await client.query(
    "SELECT filename FROM schema_migrations ORDER BY filename"
  );
  return new Set(result.rows.map((r) => r.filename));
}

async function runMigrations() {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    await ensureMigrationsTable(client);

    const applied = await getAppliedMigrations(client);
    const migrationsDir = join(__dirname, "migrations");

    const files = readdirSync(migrationsDir)
      .filter((f) => f.endsWith(".sql"))
      .sort();

    let count = 0;

    for (const file of files) {
      if (applied.has(file)) {
        console.log(`  [skip] ${file}`);
        continue;
      }

      const sql = readFileSync(join(migrationsDir, file), "utf8");
      console.log(`  [run]  ${file}`);

      await client.query(sql);
      await client.query(
        "INSERT INTO schema_migrations (filename) VALUES ($1)",
        [file]
      );

      count++;
    }

    await client.query("COMMIT");

    if (count === 0) {
      console.log("Nenhuma migration pendente.");
    } else {
      console.log(`${count} migration(s) aplicada(s) com sucesso.`);
    }
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Erro ao executar migrations:", err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

console.log("Executando migrations...");
runMigrations();
