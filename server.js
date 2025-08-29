const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 10000;

// --- Config from env ---
const BACKEND_API_KEY = process.env.BACKEND_API_KEY;   // your shared secret for the /motivation route
const OPENAI_API_KEY  = process.env.OPENAI_API_KEY;    // your OpenAI key

// --- Simple public health check ---
app.get("/health", (_req, res) => {
  res.json({ status: "ok", message: "Backend is running!" });
});

// --- Auth guard for protected routes (uses x-backend-api-key header) ---
function requireBackendKey(req, res, next) {
  const key = req.header("x-backend-api-key");
  if (!BACKEND_API_KEY || key !== BACKEND_API_KEY) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}

// --- Fallback messages if OpenAI fails for any reason ---
const FALLBACK = {
  general: "Keep pushing, you're stronger than you think!",
  fitness: "One more rep — progress is built today!",
  work:    "Stay focused, your effort will pay off!"
};

function buildPrompt(role) {
  const persona =
    role === "fitness" ? "a supportive fitness coach" :
    role === "work"    ? "a kind productivity mentor" :
                         "a warm, friendly wellness guide";

  return `You are ${persona}.
Write ONE short, uplifting, practical motivation line (max 18 words).
No emojis, no hashtags, no quotes.`;
}

// --- Call OpenAI via Chat Completions (stable path) ---
async function getOpenAIMessage(role) {
  if (!OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not set");
  }

  const prompt = buildPrompt(role);

  const resp = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: 60
    })
  });

  if (!resp.ok) {
    const txt = await resp.text().catch(() => "");
    throw new Error(`OpenAI error: ${resp.status} ${txt}`);
  }

  const data = await resp.json();
  const text = (data.choices?.[0]?.message?.content || "").trim();
  if (!text) throw new Error("Empty response from OpenAI");
  return text;
}

// --- /motivation (protected) ---
// Usage: GET /motivation?role=fitness  (role = general|fitness|work)
app.get("/motivation", requireBackendKey, async (req, res) => {
  const role = (req.query.role || "general").toString().toLowerCase();
  try {
    const message = await getOpenAIMessage(role);
    res.json({ role, message, source: "openai" });
  } catch (_err) {
    res.json({ role, message: FALLBACK[role] || FALLBACK.general, source: "fallback" });
  }
});

// --- Start server ---
app.listen(PORT, () => {
  console.log(`✅ Server is running on port ${PORT}`);
});
