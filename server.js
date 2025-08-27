import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import OpenAI from "openai";

const app = express();
app.use(cors());
app.use(bodyParser.json());

const oa = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const cache = new Map();
const ttlMs = (parseInt(process.env.DAILY_CACHE_TTL_MINUTES || "1440", 10)) * 60 * 1000;

function requireKey(req, res, next) {
  if (req.header("X-API-Key") !== process.env.BACKEND_API_KEY) {
    return res.status(401).json({ error: "Unauthorised" });
  }
  next();
}

// Daily motivation
app.get("/api/motivation", requireKey, async (req, res) => {
  const role = (req.query.role || "general").toString();
  const todayKey = `m:${role}:${new Date().toISOString().slice(0,10)}`;
  const hit = cache.get(todayKey);
  if (hit && (Date.now() - hit.t) < ttlMs) return res.json({ message: hit.v });

  const prompt = `Write a supportive 2–3 sentence daily motivation for a ${role} first responder. Be empathetic, practical, and non-clinical.`;
  const r = await oa.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    max_tokens: 140
  });
  const message = r.choices[0].message.content.trim();
  cache.set(todayKey, { v: message, t: Date.now() });
  res.json({ message });
});

// Wellness companion
app.post("/api/wellness", requireKey, async (req, res) => {
  const { message, role = "general", userId } = req.body || {};
  if (!message) return res.status(400).json({ error: "message required" });

  const system = `You are a supportive wellness companion for emergency workers (${role}). Keep replies under 120 words. Avoid medical diagnosis; suggest healthy coping ideas and community resources.`;
  const r = await oa.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: system },
      { role: "user", content: message }
    ],
    max_tokens: 220
  });
  res.json({ reply: r.choices[0].message.content.trim(), userId });
});

app.get("/", (_req, res) => res.json({ ok: true }));

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`API listening on :${port}`));
