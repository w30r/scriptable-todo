// Scriptable Todo Manager - Full UI for managing todos
// Run this script in the Scriptable app for full CRUD functionality
// Configure your API URL below
const API_BASE_URL = "https://7be2-180-74-71-109.ngrok-free.app/api";

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
      req.headers = Object.assign(req.headers || {}, { "Content-Type": "application/json" });
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
      req.headers = Object.assign(req.headers || {}, { "Content-Type": "application/json" });
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
      return false;
    }
  }
}

async function showMainMenu() {
  const manager = new TodoManager();
  await manager.fetchTodos();

  let selectedIndex = -1;
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

    items.forEach((item, i) => {
      alert.addAction(item.title);
    });

    alert.addCancelAction("Cancel");

    const pressed = await alert.presentAlert();
    selectedIndex = pressed;

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

await showMainMenu();
