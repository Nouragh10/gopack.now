const sleep = ms => new Promise(r => setTimeout(r, ms));

const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS ||
  'https://www.gopack.now,https://gopack.now,http://localhost:3000')
  .split(',').map(s => s.trim());

function originAllowed(req) {
  const origin = req.headers.origin || '';
  // Allow same-origin/no-origin requests
  if (!origin) return true;
  // Allow any gopack.now origin (handles www, non-www, and any subdomain)
  if (origin.endsWith('gopack.now')) return true;
  // Allow localhost for development
  if (origin.startsWith('http://localhost')) return true;
  // Check explicit allow list
  return ALLOWED_ORIGINS.includes(origin);
}

// Reject obviously abusive payloads before spending a token on Anthropic.
function validateMessages(messages) {
  if (!Array.isArray(messages) || messages.length === 0 || messages.length > 12) return false;
  let totalChars = 0;
  for (const m of messages) {
    if (!m || typeof m.role !== 'string') return false;
    // content can be a string or an array of content blocks (agentic turns)
    if (typeof m.content === 'string') {
      totalChars += m.content.length;
    } else if (Array.isArray(m.content)) {
      for (const block of m.content) {
        if (block && typeof block.text === 'string') totalChars += block.text.length;
      }
    } else {
      return false;
    }
  }
  return totalChars <= 20000;
}

async function callAnthropic(body, retries = 3) {
  for (let i = 0; i < retries; i++) {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'anthropic-beta': 'web-search-2025-03-05',
      },
      body: JSON.stringify(body),
    });

    if (response.status === 429) {
      const wait = (i + 1) * 8000;
      console.log(`gopack: rate limited, retrying in ${wait}ms`);
      await sleep(wait);
      continue;
    }
    return response;
  }
  throw new Error('Rate limit exceeded after retries. Please try again in a minute.');
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!originAllowed(req)) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: 'Server not configured' });
  }

  const messages = req.body && req.body.messages;
  if (!validateMessages(messages)) {
    return res.status(400).json({ error: 'Invalid request' });
  }

  try {
    // Build a server-controlled request. We never spread the client body, so a
    // caller cannot override the model, inject tools, or run arbitrary prompts
    // against our key.
    const body = {
      model: 'claude-sonnet-4-5',
      max_tokens: Math.min(Number(req.body.max_tokens) || 8000, 8000),
      messages,
      tools: [{ type: 'web_search_20250305', name: 'web_search' }],
    };

    let response = await callAnthropic(body);
    let data = await response.json();

    if (!response.ok) {
      console.error('Anthropic API error:', data);
      return res.status(response.status).json(data);
    }

    // Note: web_search_20250305 is a server-executed tool — Anthropic runs the
    // search itself and returns web_search_tool_result blocks inline in this
    // same response. There is no client-side tool_use round trip needed (and
    // no real tool_result blocks are ever present to read back), so no
    // follow-up loop is required here.

    // Extract all text and find the JSON
    const allText = (data.content || [])
      .filter(b => b.type === 'text')
      .map(b => b.text)
      .join('');

    // Strip citation markup
    const stripped = allText
      .replace(/<cite[^>]*>|<\/cite>/g, '')
      .replace(/\[\d+\]/g, '')
      .trim();

    // Extract JSON object
    const jsonMatch = stripped.match(/\{[\s\S]*\}/);
    const cleanJson = jsonMatch ? jsonMatch[0] : stripped;

    return res.status(200).json({
      content: [{ type: 'text', text: cleanJson }],
    });

  } catch (err) {
    console.error('gopack API error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}