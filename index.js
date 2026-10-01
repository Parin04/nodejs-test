const express = require("express");
const path = require("path");
const { version } = require("./package.json");

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// เก็บใน memory: ข้อมูลหายเมื่อ server restart
let todos = [
  { id: 1, text: "Deploy ขึ้น Render", done: true },
  { id: 2, text: "ลองเพิ่ม todo ใหม่", done: false },
];
let nextId = 3;

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.get("/api/info", (req, res) => {
  res.json({
    version,
    node: process.version,
    uptime: Math.round(process.uptime()),
  });
});

app.get("/api/todos", (req, res) => {
  res.json(todos);
});

app.post("/api/todos", (req, res) => {
  const text = String(req.body?.text ?? "").trim();
  if (!text) return res.status(400).json({ error: "text is required" });
  if (text.length > 200) return res.status(400).json({ error: "text is too long" });
  if (todos.length >= 100) return res.status(400).json({ error: "too many todos" });

  const todo = { id: nextId++, text, done: false };
  todos.push(todo);
  res.status(201).json(todo);
});

app.patch("/api/todos/:id", (req, res) => {
  const todo = todos.find((t) => t.id === Number(req.params.id));
  if (!todo) return res.status(404).json({ error: "not found" });

  todo.done = Boolean(req.body?.done);
  res.json(todo);
});

app.delete("/api/todos/:id", (req, res) => {
  const before = todos.length;
  todos = todos.filter((t) => t.id !== Number(req.params.id));
  if (todos.length === before) return res.status(404).json({ error: "not found" });

  res.status(204).end();
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Listening on http://localhost:${PORT}`);
});
