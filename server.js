require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const todoRoutes = require("./src/routes/todos");
const shoppingRoutes = require("./src/routes/shopping");
const progressRoutes = require("./src/routes/progress");
const elsaContextRoutes = require("./src/routes/elsacontext");
const elsaTaskRoutes = require("./src/routes/elsa-tasks");
const timesheetRoutes = require("./src/routes/timesheet");
const telegramBot = require("./src/bot");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.use("/api/todos", todoRoutes);
app.use("/api/shopping", shoppingRoutes);
app.use("/api/progress", progressRoutes);
app.use("/api/elsacontext", elsaContextRoutes);
app.use("/api/elsa-tasks", elsaTaskRoutes);
app.use("/api/timesheet", timesheetRoutes);

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

const connectDB = async (retries = 5, retryDelayMs = 5000) => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await mongoose.connect(process.env.MONGO_URI, {
        serverSelectionTimeoutMS: 30000,
        socketTimeoutMS: 45000,
      });
      console.log("MongoDB connected");
      return;
    } catch (err) {
      if (attempt === retries) {
        console.error("MongoDB connection error:", err.message);
        process.exit(1);
      }
      console.warn(
        `MongoDB connection failed (attempt ${attempt}/${retries}): ${err.message}. Retrying in ${retryDelayMs / 1000}s`
      );
      await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
    }
  }
};

if (require.main === module) {
  (async () => {
    await connectDB();
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
    try {
      telegramBot.start();
    } catch (err) {
      console.error("Bot init error:", err.message);
    }
  })();
}

module.exports = app;
