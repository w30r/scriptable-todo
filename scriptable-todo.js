// Scriptable Todo - Single script for widget + full UI
// Configure your API URL below
const API_BASE_URL = "https://7be2-180-74-71-109.ngrok-free.app/api";

const widgetFamily = args.widgetFamily || "medium";
const action = args.queryParameters?.action;

class TodoManager {
  constructor() {
    this.todos = [];
  }

  async fetchTodos() {
    try {
      const url = `${API_BASE_URL}/todos`;
      const req = new Request(url);
      this.todos = await req.loadJSON();
    } catch (e) {
      this.todos = [];
      console.error("Failed to fetch:", e);
    }
  }

  async addTodo(title) {
    try {
      const url = `${API_BASE_URL}/todos`;
      const req = new Request(url);
      req.method = "POST";
      req.headers = Object.assign(req.headers || {}, {
        "Content-Type": "application/json",
      });
      req.body = JSON.stringify({ title });
      const result = await req.loadJSON();
      this.todos.unshift(result);
      return result;
    } catch (e) {
      console.error("Failed to add:", e);
      return null;
    }
  }

  async toggleTodo(id) {
    try {
      const todo = this.todos.find((t) => t._id === id);
      if (!todo) return null;

      const url = `${API_BASE_URL}/todos/${id}`;
      const req = new Request(url);
      req.method = "PUT";
      req.headers = Object.assign(req.headers || {}, {
        "Content-Type": "application/json",
      });
      req.body = JSON.stringify({ completed: !todo.completed });
      const result = await req.loadJSON();

      const index = this.todos.findIndex((t) => t._id === id);
      if (index !== -1) this.todos[index] = result;

      return result;
    } catch (e) {
      console.error("Failed to toggle:", e);
      return null;
    }
  }

  async deleteTodo(id) {
    try {
      const url = `${API_BASE_URL}/todos/${id}`;
      const req = new Request(url);
      req.method = "DELETE";
      await req.loadJSON();
      this.todos = this.todos.filter((t) => t._id !== id);
      return true;
    } catch (e) {
      console.error("Failed to delete:", e);
      return null;
    }
  }
}

// ============ WIDGET MODE ============

function createWidget(todos, scriptName) {
  const widget = new ListWidget();

  const headerStack = widget.addText("📝 Todos");
  headerStack.font = Font.boldSystemFont(16);
  headerStack.textColor = new Color("#ffffff");

  widget.addSpacer(8);

  const completedCount = todos.filter((t) => t.completed).length;
  const pendingCount = todos.length - completedCount;
  const summaryStack = widget.addText(
    `${pendingCount} pending • ${completedCount} done`,
  );
  summaryStack.font = Font.systemFont(11);
  summaryStack.textColor = new Color("#aaaaaa");

  widget.addSpacer(6);

  const maxDisplay =
    widgetFamily === "small" ? 2 : widgetFamily === "medium" ? 5 : 8;
  const displayTodos = todos.slice(0, maxDisplay);

  displayTodos.forEach((todo) => {
    const rowStack = widget.addStack();
    rowStack.layoutHorizontally();
    rowStack.centerAlignContent();

    const checkbox = rowStack.addText(todo.completed ? "☑" : "☐");
    checkbox.font = Font.systemFont(14);
    checkbox.textColor = todo.completed
      ? new Color("#4CAF50")
      : new Color("#888888");

    const spacer = rowStack.addText(" ");
    spacer.font = Font.systemFont(14);

    const titleText = rowStack.addText(todo.title);
    titleText.font = Font.systemFont(12);
    titleText.textColor = todo.completed
      ? new Color("#666666")
      : new Color("#ffffff");
    if (todo.completed) {
      titleText.textOpacity = 0.6;
    }

    widget.addSpacer(2);
  });

  if (todos.length > maxDisplay) {
    const moreText = widget.addText(`+${todos.length - maxDisplay} more`);
    moreText.font = Font.systemFont(10);
    moreText.textColor = new Color("#888888");
  }

  const fullUrl = `scriptable://run/${scriptName}?action=full`;
  widget.url = fullUrl;

  return widget;
}

async function createSmallWidget(todos, scriptName) {
  const w = new ListWidget();

  const title = w.addText("📝 Todos");
  title.font = Font.boldSystemFont(14);
  title.textColor = new Color("#ffffff");

  w.addSpacer(6);

  const pending = todos.filter((t) => !t.completed).length;
  const count = w.addText(`${pending}`);
  count.font = Font.boldSystemFont(32);
  count.textColor = new Color("#4CAF50");

  const label = w.addText("pending");
  label.font = Font.systemFont(10);
  label.textColor = new Color("#888888");

  const fullUrl = `scriptable://run/${scriptName}?action=full`;
  w.url = fullUrl;

  return w;
}

async function runWidgetMode() {
  const scriptName = "Todo";
  const manager = new TodoManager();
  await manager.fetchTodos();

  if (widgetFamily === "small") {
    const widget = await createSmallWidget(manager.todos, scriptName);
    Script.setWidget(widget);
  } else {
    const widget = createWidget(manager.todos, scriptName);
    Script.setWidget(widget);
  }

  Script.complete();
}

// ============ FULL UI MODE ============

async function showFullUI() {
  const manager = new TodoManager();
  await manager.fetchTodos();

  let needsRefresh = true;

  while (true) {
    if (needsRefresh) {
      await manager.fetchTodos();
      needsRefresh = false;
    }

    const items = manager.todos.map((t) => ({
      title: `${t.completed ? "☑" : "☐"} ${t.title}`,
      action: "toggle",
    }));

    items.push({ title: "➕ Add New Todo", action: "add" });

    const alert = new Alert();
    alert.title = `Todos (${manager.todos.length})`;

    items.forEach((item) => {
      alert.addAction(item.title);
    });

    alert.addCancelAction("Cancel");

    const pressed = await alert.presentAlert();

    if (pressed === -1 || pressed >= manager.todos.length) {
      if (pressed === manager.todos.length && pressed !== -1) {
        const inputAlert = new Alert();
        inputAlert.title = "Add Todo";
        inputAlert.addTextField("What needs to be done?");
        inputAlert.addAction("Add");
        inputAlert.addCancelAction("Cancel");

        const inputPressed = await inputAlert.presentAlert();
        if (inputPressed === 0) {
          const title = inputAlert.textFieldValue(0).trim();
          if (title) {
            await manager.addTodo(title);
            needsRefresh = true;
          }
        }
      }
      break;
    }

    const selectedTodo = manager.todos[pressed];

    const detailAlert = new Alert();
    detailAlert.title = selectedTodo.title;
    detailAlert.message = `Status: ${selectedTodo.completed ? "Done ✓" : "Pending"}\nCreated: ${new Date(selectedTodo.createdAt).toLocaleString()}`;

    if (selectedTodo.completed) {
      detailAlert.addAction("Mark as Pending");
    } else {
      detailAlert.addAction("Mark as Done");
    }
    detailAlert.addAction("Delete");
    detailAlert.addCancelAction("Cancel");

    const detailPressed = await detailAlert.presentAlert();

    if (detailPressed === 0) {
      await manager.toggleTodo(selectedTodo._id);
      needsRefresh = true;
    } else if (detailPressed === 1) {
      const confirmAlert = new Alert();
      confirmAlert.title = "Delete Todo";
      confirmAlert.message = `Delete "${selectedTodo.title}"?`;
      confirmAlert.addAction("Delete");
      confirmAlert.addCancelAction("Cancel");

      const confirmPressed = await confirmAlert.presentAlert();
      if (confirmPressed === 0) {
        await manager.deleteTodo(selectedTodo._id);
        needsRefresh = true;
      }
    }
  }
}

// ============ MAIN ============

if (action === "full") {
  await showFullUI();
} else {
  await runWidgetMode();
}
