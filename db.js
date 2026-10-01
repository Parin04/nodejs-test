const { Pool } = require("pg");

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // ต่อจากนอก Render (External URL) ต้องใช้ SSL, ใน Render (Internal URL) ไม่ต้อง
  ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : false,
});

// connection ที่ว่างอยู่หลุด (เช่น DB restart) ไม่ให้ทำ app crash, pool จะต่อใหม่เอง
pool.on("error", (err) => {
  console.error("Idle database connection error:", err.message);
});

async function waitForDb(retries = 10, delayMs = 2000) {
  for (let attempt = 1; ; attempt++) {
    try {
      await pool.query("SELECT 1");
      return;
    } catch (err) {
      if (attempt >= retries) throw err;
      console.log(`Database not ready (${err.message}), retry ${attempt}/${retries}...`);
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
}

async function init() {
  await waitForDb();
  await pool.query(`
    CREATE TABLE IF NOT EXISTS todos (
      id         SERIAL PRIMARY KEY,
      text       VARCHAR(200) NOT NULL,
      done       BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

module.exports = { pool, init };
