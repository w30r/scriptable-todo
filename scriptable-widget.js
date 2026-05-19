// TodoWidget
const API_BASE_URL = "https://scriptable-todo.onrender.com/api";

// Read home screen widget parameter (e.g., "daily", "ui", "nui", "uni")
const displayCategory = args.widgetParameter
  ? args.widgetParameter.toLowerCase().trim()
  : "all";

const TAG_MAP = {
  daily: "!daily",
  ui: "!ui",
  nui: "!nui",
  uni: "!uni",
};

// Theme Config
const COLORS = {
  bg: new Color("#1c1c1e"),
  panelBg: new Color("#2c2c2e"), // For medium widget left panel
  textMuted: new Color("#8e8e93"),
  textDark: new Color("#636366"),
  accent: new Color("#0a84ff"),
  success: new Color("#30d158"),
};

const w = new ListWidget();
w.url = "https://meor-todo-web.vercel.app";
w.backgroundColor = COLORS.bg;
w.setPadding(10, 12, 10, 12);

// Fetch data early to use across layouts
let todos = [];
let total = 0,
  completed = 0,
  pending = 0;
let errorOccurred = false;

try {
  const req = new Request(`${API_BASE_URL}/todos`);
  req.timeoutInterval = 10;
  const allTodos = await req.loadJSON();

  todos = allTodos;
  if (displayCategory !== "all" && TAG_MAP[displayCategory]) {
    todos = allTodos.filter((t) => t.title.includes(TAG_MAP[displayCategory]));
  }

  total = todos.length;
  completed = todos.filter((t) => t.completed).length;
  pending = total - completed;
} catch (e) {
  errorOccurred = true;
  console.error(e);
}

// Get Dynamic Header String
function getHeaderTitle() {
  if (displayCategory === "daily") return "📅 Daily Focus";
  if (displayCategory === "ui") return "🔥 Do First";
  if (displayCategory === "nui") return "⏳ Schedule";
  if (displayCategory === "uni") return "⚡ Quick Tasks";
  return "📝 Todo";
}

// Clean Tags from Strings
function cleanTaskTitle(title) {
  let clean = title;
  Object.values(TAG_MAP).forEach((tag) => {
    clean = clean.replace(tag, "");
  });
  return clean.trim();
}

// --- LAYOUT GENERATION ---

if (config.runsInWidget && config.widgetFamily === "medium") {
  // ==========================================
  // MEDIUM WIDGET: LEFT (INFO) / RIGHT (TASKS)
  // ==========================================
  const mainStack = w.addStack();
  mainStack.layoutHorizontally();
  mainStack.topAlignContent(); // Ensures columns align perfectly at the top

  // LEFT COLUMN (Info Panel)
  const leftCol = mainStack.addStack();
  leftCol.layoutVertically();
  leftCol.backgroundColor = COLORS.panelBg;
  leftCol.cornerRadius = 8;
  leftCol.setPadding(10, 10, 10, 10);
  leftCol.size = new Size(115, 115); // Explicit size bounding box

  const title = leftCol.addText(getHeaderTitle());
  title.font = Font.boldSystemFont(12);
  title.textColor = new Color("#ffffff");

  leftCol.addSpacer(4);

  const dateFormatter = new DateFormatter();
  dateFormatter.dateFormat = "EEEE, MMM d";
  const dateText = leftCol.addText(dateFormatter.string(new Date()));
  dateText.font = Font.systemFont(9);
  dateText.textColor = COLORS.textMuted;

  leftCol.addSpacer(); // Pushes status down

  if (!errorOccurred && total > 0) {
    const statusText = leftCol.addText(`${pending} remaining`);
    statusText.font = Font.semiboldSystemFont(11);
    statusText.textColor = COLORS.accent;

    leftCol.addSpacer(4);

    // Progress Bar Background
    const progressBg = leftCol.addStack();
    progressBg.layoutHorizontally(); // Needs horizontal tracking layout
    progressBg.backgroundColor = new Color("#3a3a3c");
    progressBg.cornerRadius = 2;
    progressBg.size = new Size(95, 4);

    // Progress Bar Fill
    const progressFill = progressBg.addStack();
    progressFill.backgroundColor =
      completed > 0 ? COLORS.success : new Color("#48484a");
    progressFill.cornerRadius = 2;
    const fillWidth = total > 0 ? (completed / total) * 95 : 0;
    progressFill.size = new Size(fillWidth, 4);

    // CRITICAL: This extra trailing spacer inside the background forces the fill to anchor LEFT-TO-RIGHT
    progressBg.addSpacer();
  } else if (total === 0 && !errorOccurred) {
    const statusText = leftCol.addText("All caught up! 🎉");
    statusText.font = Font.systemFont(10);
    statusText.textColor = COLORS.success;
  }

  mainStack.addSpacer(14); // Split gap

  // RIGHT COLUMN (Tasks)
  const rightCol = mainStack.addStack();
  rightCol.layoutVertically();

  if (errorOccurred) {
    const errorText = rightCol.addText("Error loading tasks");
    errorText.font = Font.systemFont(11);
    errorText.textColor = new Color("#ff453a");
  } else if (total > 0) {
    const maxItems = 6;
    const displayTodos = todos.slice(0, maxItems);

    displayTodos.forEach((t) => {
      const rowStack = rightCol.addStack();
      rowStack.layoutHorizontally();
      rowStack.centerAlignContent();

      const indicator = rowStack.addText(t.completed ? "✓ " : "○ ");
      indicator.font = Font.boldSystemFont(11);
      indicator.textColor = t.completed ? COLORS.success : COLORS.accent;

      const titleText = rowStack.addText(cleanTaskTitle(t.title));
      titleText.font = Font.systemFont(11);
      titleText.textColor = t.completed
        ? COLORS.textDark
        : new Color("#ffffff");
      if (t.completed) titleText.textOpacity = 0.5;
      titleText.lineLimit = 1;

      rightCol.addSpacer(4);
    });

    if (todos.length > maxItems) {
      const moreText = rightCol.addText(`+ ${todos.length - maxItems} more...`);
      moreText.font = Font.italicSystemFont(9);
      moreText.textColor = COLORS.textDark;
    }
  } else {
    rightCol.addSpacer(20);
    const emptyText = rightCol.addText("Nothing to show.");
    emptyText.font = Font.systemFont(11);
    emptyText.textColor = COLORS.textDark;
  }

  // Clean up alignment layout
  rightCol.addSpacer();

  // CRITICAL: Forcing the right column to aggressively stretch to full width of widget
  mainStack.addSpacer();
} else {
  // ==========================================
  // SMALL WIDGET
  // ==========================================
  const headerStack = w.addStack();
  headerStack.layoutHorizontally();
  headerStack.centerAlignContent();

  const title = headerStack.addText(getHeaderTitle());
  title.font = Font.boldSystemFont(11);
  title.textColor = new Color("#ffffff");

  headerStack.addSpacer();

  const dateFormatter = new DateFormatter();
  dateFormatter.dateFormat = "MMM d";
  const dateText = headerStack.addText(dateFormatter.string(new Date()));
  dateText.font = Font.systemFont(8);
  dateText.textColor = COLORS.textMuted;

  w.addSpacer(3);

  if (errorOccurred) {
    w.addSpacer(4);
    const errorText = w.addText("Error loading tasks");
    errorText.font = Font.systemFont(10);
    errorText.textColor = new Color("#ff453a");
  } else if (total > 0) {
    const progressStack = w.addStack();
    progressStack.layoutHorizontally();
    progressStack.centerAlignContent();

    const statusText = progressStack.addText(`${pending} left`);
    statusText.font = Font.systemFont(9);
    statusText.textColor = COLORS.textMuted;

    progressStack.addSpacer(4);

    const progressBg = progressStack.addStack();
    progressBg.layoutHorizontally();
    progressBg.backgroundColor = new Color("#3a3a3c");
    progressBg.cornerRadius = 1;
    progressBg.size = new Size(50, 3);

    const progressFill = progressBg.addStack();
    progressFill.backgroundColor =
      completed > 0 ? COLORS.success : new Color("#48484a");
    progressFill.cornerRadius = 1;
    const fillWidth = total > 0 ? (completed / total) * 50 : 0;
    progressFill.size = new Size(fillWidth, 3);

    progressBg.addSpacer(); // Anchors Left-To-Right expansion in small widget too

    w.addSpacer(4);

    const maxItems = 5;
    const displayTodos = todos.slice(0, maxItems);

    displayTodos.forEach((t) => {
      const rowStack = w.addStack();
      rowStack.layoutHorizontally();
      rowStack.centerAlignContent();

      const indicator = rowStack.addText(t.completed ? "✓ " : "○ ");
      indicator.font = Font.boldSystemFont(9.5);
      indicator.textColor = t.completed ? COLORS.success : COLORS.accent;

      const titleText = rowStack.addText(cleanTaskTitle(t.title));
      titleText.font = Font.systemFont(9.5);
      titleText.textColor = t.completed
        ? COLORS.textDark
        : new Color("#ffffff");
      if (t.completed) titleText.textOpacity = 0.5;
      titleText.lineLimit = 1;

      w.addSpacer(2);
    });

    if (todos.length > maxItems) {
      const moreText = w.addText(`+ ${todos.length - maxItems} more`);
      moreText.font = Font.italicSystemFont(8);
      moreText.textColor = COLORS.textDark;
    }
  } else {
    w.addSpacer(6);
    const emptyText = w.addText("All done! 🎉");
    emptyText.font = Font.systemFont(10);
    emptyText.textColor = COLORS.textDark;
  }

  w.addSpacer();

  const footerStack = w.addStack();
  footerStack.layoutHorizontally();
  footerStack.addSpacer();
  const refreshDate = new Date(Date.now() + 15 * 60 * 1000);
  const timerText = footerStack.addDate(refreshDate);
  timerText.applyTimerStyle();
  timerText.font = Font.systemFont(7);
  timerText.textColor = new Color("#272729");
}

Script.setWidget(w);
if (config.runsInApp) {
  w.presentMedium();
}
Script.complete();
