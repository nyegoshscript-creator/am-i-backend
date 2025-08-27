const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 10000;
const BACKEND_API_KEY = process.env.BACKEND_API_KEY || "";

// -------- Public endpoint (no key required) --------
app.get("/health", (req, res) => {
  res.json({ status: "ok", message: "Backend is running!" });
});

// -------- Auth middleware (protect everything below) --------
app.use((req, res, next) => {
  const key = req.header("x-backend-api-key");
  if (!key || key !== BACKEND_API_KEY) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
});

// -------- Protected endpoint --------
app.get("/motivation", (req, res) => {
  const role = (req.query.role || "general").toLowerCase();
  const messages = {
    general: "Keep pushing, you're stronger than you think!",
    fitness: "One more rep — progress is built today!",
    work: "Stay focused, your effort will pay off!",
  };
  res.json({ role, message: messages[role] || messages.general });
});

app.listen(PORT, () => {
  console.log(`✅ Server is running on port ${PORT}`);
});
