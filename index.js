const express = require("express");
const path = require("path");
const { version } = require("./package.json");
const db = require("./db");

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const MAX_TODOS = 100;

app.get("/health", async (req, res) => {
  try {
    await db.pool.query("SELECT 1");
    res.json({ status: "ok" });
  } catch {
    res.status(503).json({ status: "db unavailable" });
  }
});

app.get("/api/info", (req, res) => {
  res.json({
    version,
    node: process.version,
    uptime: Math.round(process.uptime()),
  });
});

app.get("/api/todos", async (req, res) => {
  const { rows } = await db.pool.query("SELECT id, text, done FROM todos ORDER BY id");
  res.json(rows);
});

app.post("/api/todos", async (req, res) => {
  const text = String(req.body?.text ?? "").trim();
  if (!text) return res.status(400).json({ error: "text is required" });
  if (text.length > 200) return res.status(400).json({ error: "text is too long" });

  const { rows: countRows } = await db.pool.query("SELECT COUNT(*)::int AS n FROM todos");
  if (countRows[0].n >= MAX_TODOS) return res.status(400).json({ error: "too many todos" });

  const { rows } = await db.pool.query(
    "INSERT INTO todos (text) VALUES ($1) RETURNING id, text, done",
    [text]
  );
  res.status(201).json(rows[0]);
});

app.patch("/api/todos/:id", async (req, res) => {
  const { rows } = await db.pool.query(
    "UPDATE todos SET done = $1 WHERE id = $2 RETURNING id, text, done",
    [Boolean(req.body?.done), Number(req.params.id) || 0]
  );
  if (rows.length === 0) return res.status(404).json({ error: "not found" });

  res.json(rows[0]);
});

app.delete("/api/todos/:id", async (req, res) => {
  const { rowCount } = await db.pool.query("DELETE FROM todos WHERE id = $1", [
    Number(req.params.id) || 0,
  ]);
  if (rowCount === 0) return res.status(404).json({ error: "not found" });

  res.status(204).end();
});

app.use((err, req, res, next) => {
  // error จากฝั่ง client เช่น JSON ผิดรูปแบบ (body-parser ใส่ status 4xx มาให้)
  if (err.status >= 400 && err.status < 500) {
    return res.status(err.status).json({ error: err.message });
  }
  console.error(err);
  res.status(500).json({ error: "internal server error" });
});

const PORT = process.env.PORT || 3000;

db.init()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Listening on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Failed to connect to database:", err.message);
    process.exit(1);
  });
