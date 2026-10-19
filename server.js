import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { SAMPLES } from './samples.js';
import { classifyMessages, replyMessages } from './prompts.js';

const HOST = '127.0.0.1'; // local machine only
const PORT = Number(process.env.PORT) || 3000;
const ROOT = new URL('.', import.meta.url);

// Milestone 1: every response is fake, no OpenRouter calls are made.
const FAKE = true;
// Extra dropdown entry in fake mode, so the "Invalid format" path can be tested.
const FAKE_INVALID_MODEL = 'fake/always-invalid-json';

// Must match the allowed values written in prompts.js.
const ALLOWED = {
  category: ['billing', 'bug', 'feature request', 'account access', 'other'],
  urgency: ['low', 'medium', 'high'],
  sentiment: ['negative', 'neutral', 'positive'],
};

// Re-read on every request, so edits to models.json apply on page refresh.
async function loadConfig() {
  return JSON.parse(await readFile(new URL('models.json', ROOT), 'utf8'));
}

// Strict: the whole output must be a JSON object with allowed values. No fence stripping.
function validateClassification(raw) {
  let parsed;
  try {
    parsed = JSON.parse(String(raw).trim());
  } catch {
    return { ok: false, reason: 'Output is not valid JSON.' };
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { ok: false, reason: 'Output is not a JSON object.' };
  }
  for (const [field, values] of Object.entries(ALLOWED)) {
    if (!values.includes(parsed[field])) {
      return { ok: false, reason: `"${field}" is missing or not one of: ${values.join(', ')}.` };
    }
  }
  return {
    ok: true,
    parsed: { category: parsed.category, urgency: parsed.urgency, sentiment: parsed.sentiment },
  };
}

// ---------- Fake responses (Milestone 1) ----------

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const rand = (min, max) => min + Math.floor(Math.random() * (max - min + 1));

async function fakeCall(model, temperature, messages, content) {
  const start = Date.now();
  await sleep(rand(300, 1200));
  const promptTokens = Math.round(JSON.stringify(messages).length / 4);
  const completionTokens = Math.max(1, Math.round(content.length / 4));
  return {
    content,
    stats: {
      requestedModel: model,
      servedModel: model,
      provider: 'FakeProvider',
      promptTokens,
      completionTokens,
      costUsd: ((promptTokens * 0.5 + completionTokens * 1.5) / 1e6) * rand(1, 20),
      ms: Date.now() - start,
      temperature,
      temperatureSupported: true,
    },
  };
}

// A naive keyword guesser, just so fake results look plausible.
function fakeClassification(ticket) {
  const t = ticket.toLowerCase();
  const category = /charge|invoice|refund|bill/.test(t) ? 'billing'
    : /log in|login|locked|password|2fa|two-factor/.test(t) ? 'account access'
    : /would be great|please add|feature/.test(t) ? 'feature request'
    : /error|bug|wrong|broken/.test(t) ? 'bug'
    : 'other';
  const urgency = /none of|outage|down|all users|urgent/.test(t) ? 'high'
    : /locked|charged twice|refund/.test(t) ? 'medium' : 'low';
  const sentiment = /ridiculous|!!|now\.|angry|terrible/.test(t) ? 'negative'
    : /thanks so much|great week|love/.test(t) ? 'positive' : 'neutral';
  return { category, urgency, sentiment };
}

const FAKE_INVALID_OUTPUT = 'Sure! Here is the classification:\n```json\n{"category": "Billing", "urgency": "HIGH"}\n```';

function fakeReply(c) {
  return `Hi there,

Thanks for reaching out, and I'm sorry for the trouble. I can see this is a ${c.category} issue${c.urgency === 'high' ? ", and I've escalated it to our team as a priority" : ''}.

I'm looking into it now and will get back to you by [time] with an update. If you have any extra details, such as [screenshots or account email], please reply to this message.

Best regards,
[Agent name]

(Fake reply: no model was called.)`;
}

// ---------- Handlers ----------

async function checkModel(model) {
  const cfg = await loadConfig();
  const allowed = FAKE ? [...cfg.models, FAKE_INVALID_MODEL] : cfg.models;
  if (!allowed.includes(model)) throw new Error(`Model "${model}" is not in models.json.`);
  return cfg;
}

async function handleClassify({ ticket, model }) {
  if (!ticket?.trim()) return { ok: false, error: 'Ticket is empty.' };
  const cfg = await checkModel(model);
  const temperature = cfg.temperature?.layer1 ?? 0;
  const messages = classifyMessages(ticket);
  const content = model === FAKE_INVALID_MODEL
    ? FAKE_INVALID_OUTPUT
    : JSON.stringify(fakeClassification(ticket));
  const result = await fakeCall(model, temperature, messages, content);
  const v = validateClassification(result.content);
  return v.ok
    ? { ok: true, parsed: v.parsed, raw: result.content, stats: result.stats }
    : { ok: false, invalidFormat: true, reason: v.reason, raw: result.content, stats: result.stats };
}

async function handleReply({ ticket, classification, model }) {
  if (!ticket?.trim()) return { ok: false, error: 'Ticket is empty.' };
  // Never draft a reply from an invalid classification.
  const v = validateClassification(JSON.stringify(classification ?? null));
  if (!v.ok) return { ok: false, error: 'Layer 2 skipped: no valid Layer 1 classification.' };
  const cfg = await checkModel(model);
  const temperature = cfg.temperature?.layer2 ?? 0.7;
  const messages = replyMessages(ticket, v.parsed);
  const result = await fakeCall(model, temperature, messages, fakeReply(v.parsed));
  return { ok: true, text: result.content, stats: result.stats };
}

async function configPayload() {
  const cfg = await loadConfig();
  const models = cfg.models.map((id) => ({ id, name: id }));
  if (FAKE) models.push({ id: FAKE_INVALID_MODEL, name: 'Fake: always returns invalid JSON' });
  return { fake: FAKE, models, defaults: cfg.defaults, temperature: cfg.temperature, samples: SAMPLES };
}

// ---------- HTTP plumbing ----------

function send(res, status, body, type) {
  res.writeHead(status, { 'Content-Type': type });
  res.end(body);
}
const sendJson = (res, data, status = 200) => send(res, status, JSON.stringify(data), 'application/json');

async function readJson(req) {
  let body = '';
  for await (const chunk of req) body += chunk;
  return JSON.parse(body || '{}');
}

const server = http.createServer(async (req, res) => {
  try {
    if (req.method === 'GET' && (req.url === '/' || req.url === '/index.html')) {
      return send(res, 200, await readFile(new URL('public/index.html', ROOT)), 'text/html; charset=utf-8');
    }
    if (req.method === 'GET' && req.url === '/api/config') return sendJson(res, await configPayload());
    if (req.method === 'POST' && req.url === '/api/classify') return sendJson(res, await handleClassify(await readJson(req)));
    if (req.method === 'POST' && req.url === '/api/reply') return sendJson(res, await handleReply(await readJson(req)));
    send(res, 404, 'Not found', 'text/plain');
  } catch (err) {
    sendJson(res, { ok: false, error: err.message }, 500);
  }
});

server.listen(PORT, HOST, () => {
  console.log(`Ticket triager running at http://${HOST}:${PORT}`);
  console.log(`Mode: ${FAKE ? 'FAKE (no OpenRouter calls)' : 'LIVE'}`);
  console.log(`OpenRouter API key: ${process.env.OPENROUTER_API_KEY ? 'found in environment' : 'not found'}`);
});
