const sleep = ms => new Promise(r => setTimeout(r, ms));

const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS ||
  'https://www.gopack.now,https://gopack.now,http://localhost:3000')
  .split(',').map(s => s.trim());

function originAllowed(req) {
  const origin = req.headers.origin || '';
  if (!origin) return true;
  return ALLOWED_ORIGINS.includes(origin);
}

function validateMessages(messages) {
  if (!Array.isArray(messages) || messages.length === 0 || messages.length > 4) return false;
  let totalChars = 0;
  for (const m of messages) {
    if (!m || typeof m.role !== 'string' || typeof m.content !== 'string') return false;
    totalChars += m.content.length;
  }
  return totalChars <= 6000;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!originAllowed(req)) return res.status(403).json({ error: 'Forbidden' });
  if (!process.env.ANTHROPIC_API_KEY) return res.status(500).json({ error: 'Server not configured' });

  const messages = req.body && req.body.messages;
  if (!validateMessages(messages)) return res.status(400).json({ error: 'Invalid request' });

  // Server-controlled request — the client cannot override the model or token budget.
  const body = {
    model: 'claude-sonnet-4-5',
    max_tokens: Math.min(Number(req.body.max_tokens) || 1500, 1500),
    messages,
  };

  try {
    let response;
    for (let i = 0; i < 3; i++) {
      response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify(body),
      });
      if (response.status !== 429) break;
      await sleep((i + 1) * 5000);
    }

    const data = await response.json();
    if (!response.ok) return res.status(response.status).json(data);

    const text = (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('');
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const clean = jsonMatch ? jsonMatch[0] : text;

    return res.status(200).json({ content: [{ type: 'text', text: clean }] });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
