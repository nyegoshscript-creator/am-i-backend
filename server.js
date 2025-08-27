const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 10000;

// Simple health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Motivation endpoint
app.get('/motivation', async (req, res) => {
  const requiredKey = process.env.BACKEND_API_KEY || '';
  const providedKey = req.get('x-api-key') || '';

  // Require API key if one is configured
  if (requiredKey && providedKey !== requiredKey) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const role = (req.query.role || 'general').toLowerCase();

  // If you haven’t set OPENAI_API_KEY yet, return a safe fallback
  if (!process.env.OPENAI_API_KEY) {
    return res.json({
      message: `You matter and your work makes a difference. Keep going, ${role}.`
    });
  }

  try {
    const prompt = `Write a short (1–2 sentence) encouraging message tailored to a ${role} first responder. Keep it supportive, kind, and professional.`;

    // Node 18+ has global fetch
    const resp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are a supportive wellness companion for emergency responders.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 120
      })
    });

    const data = await resp.json();
    if (!resp.ok) {
      return res.status(500).json({ error: 'openai_error', details: data });
    }

    const message = data.choices?.[0]?.message?.content?.trim() || 'Stay safe and take care.';
    return res.json({ message });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'server_error' });
  }
});

app.listen(PORT, () => {
  console.log(`listening on ${PORT}`);
});
