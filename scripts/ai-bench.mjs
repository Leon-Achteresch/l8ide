import { writeFileSync, readFileSync, existsSync } from 'node:fs'

const KEY = process.env.OPENROUTER_API_KEY
if (!KEY) { console.error('OPENROUTER_API_KEY fehlt'); process.exit(1) }

const BUDGET = 4.0
const MAX_TOKENS = 3000
const OUT_JSON = new URL('./ai-bench-results.json', import.meta.url).pathname
const OUT_MD = new URL('./ai-bench-report.md', import.meta.url).pathname

let spent = 0

const TOOLS = [
  { type: 'function', function: { name: 'get_weather', description: 'Get current weather for a city', parameters: { type: 'object', properties: { city: { type: 'string' } }, required: ['city'] } } },
  { type: 'function', function: { name: 'read_file', description: 'Read a file from disk and return its content', parameters: { type: 'object', properties: { path: { type: 'string' } }, required: ['path'] } } },
  { type: 'function', function: { name: 'search_files', description: 'Search files by glob pattern', parameters: { type: 'object', properties: { pattern: { type: 'string' } }, required: ['pattern'] } } },
]

function firstToolCall(msg) {
  const tc = msg?.tool_calls?.[0]
  if (!tc) return null
  let args = {}
  try { args = JSON.parse(tc.function?.arguments || '{}') } catch {}
  return { name: tc.function?.name, args }
}

function extractJson(text) {
  if (!text) return null
  const cleaned = text.replace(/```(?:json)?/g, '')
  const start = cleaned.indexOf('{')
  const end = cleaned.lastIndexOf('}')
  if (start < 0 || end <= start) return null
  try { return JSON.parse(cleaned.slice(start, end + 1)) } catch { return null }
}

function lastNumber(text) {
  const m = (text || '').match(/-?\d+(?:[.,]\d+)?/g)
  return m ? m[m.length - 1].replace(',', '.') : null
}

const TESTS = [
  {
    id: 'tool_simple', cat: 'tools',
    body: { messages: [{ role: 'user', content: 'Wie ist das Wetter in Berlin gerade?' }], tools: TOOLS },
    score: (msg) => {
      const tc = firstToolCall(msg)
      return tc?.name === 'get_weather' && /berlin/i.test(String(tc.args.city)) ? 1 : 0
    },
  },
  {
    id: 'tool_select', cat: 'tools',
    body: { messages: [{ role: 'user', content: 'Öffne die Datei src/main.rs und zeig mir den Inhalt.' }], tools: TOOLS },
    score: (msg) => {
      const tc = firstToolCall(msg)
      return tc?.name === 'read_file' && /src\/main\.rs/.test(String(tc.args.path)) ? 1 : 0
    },
  },
  {
    id: 'tool_result', cat: 'tools',
    body: {
      messages: [
        { role: 'user', content: 'Wie ist das Wetter in Berlin gerade?' },
        { role: 'assistant', content: null, tool_calls: [{ id: 'call_1', type: 'function', function: { name: 'get_weather', arguments: '{"city":"Berlin"}' } }] },
        { role: 'tool', tool_call_id: 'call_1', content: '{"city":"Berlin","temp_c":17,"condition":"leicht bewölkt"}' },
      ],
      tools: TOOLS,
    },
    score: (msg) => /17/.test(msg?.content || '') ? 1 : 0,
  },
  {
    id: 'q_extract', cat: 'quality',
    body: { messages: [{ role: 'user', content: "Extrahiere aus folgendem Text ein JSON-Objekt mit exakt den Feldern name, email, betrag (betrag als Zahl): 'Rechnung an Max Mustermann (max@example.com) über 1.249,50 EUR.' Antworte nur mit dem JSON." }] },
    score: (msg) => {
      const j = extractJson(msg?.content)
      if (!j) return 0
      const nameOk = /max mustermann/i.test(String(j.name))
      const emailOk = String(j.email).toLowerCase() === 'max@example.com'
      const betragOk = String(j.betrag).replace(/[^\d]/g, '').startsWith('12495')
      return nameOk && emailOk && betragOk ? 1 : (nameOk && emailOk) || (emailOk && betragOk) ? 0.5 : 0
    },
  },
  {
    id: 'q_code', cat: 'quality',
    body: { messages: [{ role: 'user', content: 'Was gibt f(5) zurück?\nfunction f(n){let s=0;for(let i=1;i<=n;i++){if(i%2===0)s+=i*i;else s-=i}return s}\nAntworte nur mit der Zahl.' }] },
    score: (msg) => lastNumber(msg?.content) === '11' ? 1 : 0,
  },
  {
    id: 'q_format', cat: 'quality',
    body: { messages: [{ role: 'user', content: 'Nenne die drei größten Planeten unseres Sonnensystems als kommaseparierte Liste in Kleinbuchstaben, sortiert von groß nach klein, ohne weitere Wörter.' }] },
    score: (msg) => {
      const norm = (msg?.content || '').trim().toLowerCase().replace(/\s*,\s*/g, ',').replace(/\.$/, '')
      return norm === 'jupiter,saturn,uranus' ? 1 : /jupiter.*saturn.*uranus/.test(norm) ? 0.5 : 0
    },
  },
]

async function chat(model, body, freeTier) {
  const attempts = freeTier ? 6 : 3
  for (let a = 1; a <= attempts; a++) {
    if (spent > BUDGET) throw new Error('BUDGET')
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), 120000)
    const t0 = Date.now()
    try {
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        signal: ctrl.signal,
        headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, max_tokens: MAX_TOKENS, usage: { include: true }, ...body }),
      })
      const ms = Date.now() - t0
      if (res.status === 429 || res.status >= 500) {
        if (a === attempts) return { error: `HTTP ${res.status}` }
        await new Promise(r => setTimeout(r, (freeTier ? 15000 : 3000) * a + Math.random() * 2000))
        continue
      }
      const data = await res.json().catch(() => null)
      if (!res.ok || !data) return { error: data?.error?.message?.slice(0, 120) || `HTTP ${res.status}` }
      if (data.error) return { error: String(data.error.message || data.error).slice(0, 120) }
      const usage = data.usage || {}
      spent += usage.cost || 0
      return { msg: data.choices?.[0]?.message, usage, ms }
    } catch (e) {
      if (a === attempts) return { error: e.name === 'AbortError' ? 'timeout' : String(e.message).slice(0, 120) }
      await new Promise(r => setTimeout(r, 3000 * a))
    } finally {
      clearTimeout(timer)
    }
  }
}

async function benchModel(m) {
  const r = { model: m.id, free: m.free, pricing: m.pricing, tools: 0, quality: 0, tokensOut: 0, tokensIn: 0, cost: 0, latency: [], errors: [], tests: {} }
  for (const t of TESTS) {
    const res = await chat(m.id, t.body, m.free)
    if (res.error) { r.errors.push(`${t.id}: ${res.error}`); r.tests[t.id] = { score: 0, error: res.error }; continue }
    let s = 0
    try { s = t.score(res.msg) } catch {}
    r.tests[t.id] = { score: s }
    r[t.cat] += s
    r.tokensOut += res.usage.completion_tokens || 0
    r.tokensIn += res.usage.prompt_tokens || 0
    r.cost += res.usage.cost || 0
    r.latency.push(res.ms)
  }
  r.avgMs = r.latency.length ? Math.round(r.latency.reduce((a, b) => a + b) / r.latency.length) : null
  r.total = r.tools + r.quality
  delete r.latency
  return r
}

async function pool(items, size, fn) {
  const out = []
  let i = 0
  const workers = Array.from({ length: size }, async () => {
    while (i < items.length) {
      if (spent > BUDGET) return
      const item = items[i++]
      const res = await fn(item)
      out.push(res)
      console.log(`[${out.length}/${items.length}] ${res.model} tools:${res.tools}/3 quality:${res.quality}/3 out:${res.tokensOut}tok $${res.cost.toFixed(5)} (gesamt $${spent.toFixed(3)})`)
      writeFileSync(OUT_JSON, JSON.stringify(out, null, 2))
    }
  })
  await Promise.all(workers)
  return out
}

const list = (await (await fetch('https://openrouter.ai/api/v1/models')).json()).data
const candidates = list
  .filter(m => (m.architecture?.input_modalities || []).includes('text') && (m.architecture?.output_modalities || []).includes('text'))
  .filter(m => (m.supported_parameters || []).includes('tools'))
  .map(m => ({ id: m.id, pricing: { prompt: +m.pricing.prompt, completion: +m.pricing.completion }, free: +m.pricing.prompt === 0 && +m.pricing.completion === 0 }))
  .filter(m => m.free || (m.pricing.prompt <= 0.0000005 && m.pricing.completion <= 0.000002))

const done = existsSync(OUT_JSON) ? JSON.parse(readFileSync(OUT_JSON, 'utf8')) : []
const doneIds = new Set(done.map(r => r.model))
const todo = candidates.filter(m => !doneIds.has(m.id)).sort((a, b) => a.free - b.free)

console.log(`${candidates.length} Modelle (${candidates.filter(m => m.free).length} free), ${todo.length} offen, Budget $${BUDGET}`)

const fresh = await pool(todo, 8, benchModel)
const all = [...done, ...fresh]
writeFileSync(OUT_JSON, JSON.stringify(all, null, 2))

const ranked = [...all].sort((a, b) => b.total - a.total || a.tokensOut - b.tokensOut)
const rows = ranked.map(r =>
  `| ${r.model} | ${r.free ? 'free' : `$${(r.pricing.prompt * 1e6).toFixed(2)}/$${(r.pricing.completion * 1e6).toFixed(2)}`} | ${r.tools}/3 | ${r.quality}/3 | **${r.total}/6** | ${r.tokensOut} | $${r.cost.toFixed(5)} | ${r.avgMs ?? '-'}ms | ${r.errors.length ? r.errors[0] : ''} |`
)
const md = [
  '# AI Model Bench (OpenRouter, free + günstig)',
  '',
  `Getestet: ${all.length} Modelle · Gesamtkosten: $${spent.toFixed(3)} · ${new Date().toISOString()}`,
  '',
  'Tests: 3× Tool-Usage (Call, Tool-Auswahl+Args, Tool-Result verwerten) · 3× Qualität (JSON-Extraktion, Code-Trace, Formattreue) · Tokens = Completion-Tokens über alle 6 Tests.',
  '',
  '| Modell | Preis in/out per M | Tools | Qualität | Gesamt | Tokens out | Kosten | ø Latenz | Fehler |',
  '|---|---|---|---|---|---|---|---|---|',
  ...rows,
].join('\n')
writeFileSync(OUT_MD, md)
console.log(`\nFertig. Gesamtkosten $${spent.toFixed(3)}. Report: ${OUT_MD}`)
