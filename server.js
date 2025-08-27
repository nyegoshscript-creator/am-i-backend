const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 10000;

// Health check route
app.get("/health", (req, res) => {
  res.json({ status: "ok", message: "Backend is running!" });
});

// Motivation route
app.get("/motivation", (req, res) => {
  const role = req.query.role || "general";
  const messages = {
    general: "Keep pushing, you're stronger than you think!",
    fitness: "One more rep — progress is built today!",
    work: "Stay focused, your effort will pay off!",
  };
  res.json({ role, message: messages[role] || messages.general });
});

// Start server
app.listen(PORT, () => {
  console.log(`✅ Server is running on port ${PORT}`);
});
