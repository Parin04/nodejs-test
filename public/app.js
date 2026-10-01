const list = document.getElementById("list");
const form = document.getElementById("add-form");
const input = document.getElementById("new-text");
const empty = document.getElementById("empty");
const errorEl = document.getElementById("error");
const count = document.getElementById("count");

async function api(method, url, body) {
  const res = await fetch(url, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `HTTP ${res.status}`);
  }
  return res.status === 204 ? null : res.json();
}

function showError(err) {
  errorEl.textContent = err ? `เกิดข้อผิดพลาด: ${err.message}` : "";
  errorEl.hidden = !err;
}

function render(todos) {
  list.replaceChildren(
    ...todos.map((todo) => {
      const li = document.createElement("li");
      li.className = todo.done ? "done" : "";

      const check = document.createElement("input");
      check.type = "checkbox";
      check.checked = todo.done;
      check.addEventListener("change", () =>
        run(() => api("PATCH", `/api/todos/${todo.id}`, { done: check.checked }))
      );

      const text = document.createElement("span");
      text.textContent = todo.text;

      const del = document.createElement("button");
      del.className = "del";
      del.textContent = "×";
      del.setAttribute("aria-label", `ลบ ${todo.text}`);
      del.addEventListener("click", () => run(() => api("DELETE", `/api/todos/${todo.id}`)));

      li.append(check, text, del);
      return li;
    })
  );

  empty.hidden = todos.length > 0;
  const left = todos.filter((t) => !t.done).length;
  count.textContent = `เหลือ ${left} จาก ${todos.length} งาน`;
}

async function load() {
  render(await api("GET", "/api/todos"));
}

async function run(action) {
  try {
    await action();
    showError(null);
  } catch (err) {
    showError(err);
  }
  await load().catch(showError);
}

form.addEventListener("submit", (e) => {
  e.preventDefault();
  const text = input.value.trim();
  if (!text) return;
  input.value = "";
  run(() => api("POST", "/api/todos", { text }));
});

load().catch(showError);

api("GET", "/api/info")
  .then((info) => {
    document.getElementById("info").textContent = `v${info.version} · Node ${info.node}`;
  })
  .catch(() => {});
