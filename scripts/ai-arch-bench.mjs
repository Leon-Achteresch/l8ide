import { writeFileSync, readFileSync, existsSync } from 'node:fs'

const KEY = process.env.OPENROUTER_API_KEY
if (!KEY) { console.error('OPENROUTER_API_KEY fehlt'); process.exit(1) }

const SMOKE = !!process.env.SMOKE
const BUDGET = 3.4
const OUT_JSON = new URL('./ai-arch-results.json', import.meta.url).pathname
let spent = 0

const REPO = {
  'package.json': '{\n  "name": "shopmate",\n  "version": "1.0.0",\n  "type": "module"\n}\n',
  'README.md': '# shopmate\n\nKleine Demo-App fuer Bestellungen.\n',
  'src/config.js': 'var BASE_URL = "https://api.shopmate.dev";\nvar TIMEOUT = 5000;\nexport { BASE_URL, TIMEOUT };\n',
  'src/utils.js': 'var SEP = "-";\n\nexport function formatDate(d) {\n  return d.toISOString().slice(0, 10);\n}\n\nexport function clamp(x, lo, hi) {\n  return Math.min(hi, Math.max(lo, x));\n}\n',
  'src/mathx.js': 'export function sum(xs) {\n  let s = 0;\n  for (const x of xs) s += x;\n  return s;\n}\n\nexport function average(xs) {\n  return sum(xs) / (xs.length + 1);\n}\n',
  'src/api.js': 'import { BASE_URL, TIMEOUT } from "./config.js";\n\nexport async function fetchUser(id) {\n  const res = await fetch(`${BASE_URL}/users/${id}`, { timeout: TIMEOUT });\n  return res.json();\n}\n',
  'src/app.js': 'import { fetchUser } from "./api.js";\nimport { average } from "./mathx.js";\n\nexport async function showUserStats(id) {\n  const user = await fetchUser(id);\n  return { name: user.name, score: average(user.scores) };\n}\n',
  'test/mathx.test.js': 'import { average, sum } from "../src/mathx.js";\n\nif (average([2, 4, 6]) !== 4) throw new Error("kaputt");\nconsole.log("ok");\n',
}

function evalFn(code, name) {
  try {
    const body = String(code).replace(/^import[^\n]*\n/gm, '').replace(/export default /g, '').replace(/export /g, '')
    return new Function(`${body}; return typeof ${name} === "function" ? ${name} : null;`)()
  } catch { return null }
}

const PROMPTS = {
  L0_bare: null,
  L1_role: 'Du bist ein Coding-Agent in der IDE l8ide mit Zugriff auf Datei-Tools.',
  L2_rules: `Du bist ein Coding-Agent in der IDE l8ide.
Regeln:
- Lies eine Datei mit read_file, bevor du sie aenderst.
- Mache die kleinstmoegliche Aenderung, die die Aufgabe loest.
- Fasse keine Dateien an, die nicht zur Aufgabe gehoeren.
- Erfinde keine Inhalte oder Pfade; wenn etwas schon korrekt ist, aendere nichts und sag das.
- Wenn du fertig bist, antworte ohne Tool-Aufruf kurz auf Deutsch.`,
  L3_protocol: `Du bist ein Coding-Agent in der IDE l8ide.
Regeln:
- Lies eine Datei mit read_file, bevor du sie aenderst.
- Mache die kleinstmoegliche Aenderung, die die Aufgabe loest.
- Fasse keine Dateien an, die nicht zur Aufgabe gehoeren.
- Erfinde keine Inhalte oder Pfade; wenn etwas schon korrekt ist, aendere nichts und sag das.

Arbeitsprotokoll fuer jede Aufgabe:
1. list_files fuer den Ueberblick.
2. Lies alle relevanten Dateien vollstaendig.
3. Plane die minimale Aenderung.
4. Fuehre sie aus.
5. Verifiziere per read_file.
6. Antworte kurz auf Deutsch, was du geaendert hast.

Beispiel (Aufgabe: "Tippfehler 'Bestellnug' in README fixen"):
- list_files -> ["README.md", "src/index.js"]
- read_file {"path":"README.md"} -> "# App\\nVerwaltet Bestellnug-Daten."
- edit_file {"path":"README.md","old_string":"Bestellnug","new_string":"Bestellung"}
- read_file {"path":"README.md"} -> korrekt
- Antwort: "Tippfehler in README.md korrigiert."

Wichtig: Rate niemals Dateiinhalte. Ein edit_file mit einem old_string, den du nicht per read_file gesehen hast, ist ein Fehler. Wenn die Aufgabe auf einem falschen Vorwand beruht (z.B. ein Bug, der gar nicht existiert), korrigiere nichts und erklaere das.`,
}

const def = (name, description, props, required) => ({ type: 'function', function: { name, description, parameters: { type: 'object', properties: props, required } } })
const ALL = {
  list_files: def('list_files', 'Listet alle Dateipfade im Projekt', {}, []),
  read_file: def('read_file', 'Liest den Inhalt einer Datei', { path: { type: 'string' } }, ['path']),
  edit_file: def('edit_file', 'Ersetzt old_string (exakter Match, erstes Vorkommen) durch new_string', { path: { type: 'string' }, old_string: { type: 'string' }, new_string: { type: 'string' } }, ['path', 'old_string', 'new_string']),
  write_file: def('write_file', 'Ueberschreibt eine Datei komplett mit neuem Inhalt', { path: { type: 'string' }, content: { type: 'string' } }, ['path', 'content']),
  search: def('search', 'Sucht Text in allen Dateien, liefert pfad:zeile', { query: { type: 'string' } }, ['query']),
  create_file: def('create_file', 'Erstellt eine neue Datei', { path: { type: 'string' }, content: { type: 'string' } }, ['path', 'content']),
  delete_file: def('delete_file', 'Loescht eine Datei', { path: { type: 'string' } }, ['path']),
  format_file: def('format_file', 'Formatiert eine Datei mit dem Projekt-Formatter', { path: { type: 'string' } }, ['path']),
  git_blame: def('git_blame', 'Zeigt git blame fuer eine Datei', { path: { type: 'string' } }, ['path']),
  run_command: def('run_command', 'Fuehrt ein Shell-Kommando aus', { command: { type: 'string' } }, ['command']),
}
const TOOLSETS = {
  t3_sr: ['list_files', 'read_file', 'edit_file'],
  t3_full: ['list_files', 'read_file', 'write_file'],
  t5: ['list_files', 'read_file', 'edit_file', 'search', 'create_file'],
  t7: ['list_files', 'read_file', 'edit_file', 'search', 'create_file', 'write_file', 'delete_file'],
  t10: ['list_files', 'read_file', 'edit_file', 'search', 'create_file', 'write_file', 'delete_file', 'format_file', 'git_blame', 'run_command'],
}

function makeFs() {
  const files = { ...REPO }
  const changed = new Set()
  return {
    files, changed,
    exec(name, args) {
      args ??= {}
      if (name === 'list_files') return JSON.stringify(Object.keys(files))
      if (name === 'read_file') return files[args.path] ?? `ERROR: Datei nicht gefunden: ${args.path}`
      if (name === 'edit_file') {
        const f = files[args.path]
        if (f === undefined) return `ERROR: Datei nicht gefunden: ${args.path}`
        if (typeof args.old_string !== 'string' || !f.includes(args.old_string)) return `ERROR: old_string nicht gefunden in ${args.path}`
        files[args.path] = f.replace(args.old_string, args.new_string ?? ''); changed.add(args.path); return 'OK'
      }
      if (name === 'write_file' || name === 'create_file') {
        if (typeof args.content !== 'string') return 'ERROR: content fehlt'
        files[args.path] = args.content; changed.add(args.path); return 'OK'
      }
      if (name === 'delete_file') {
        if (files[args.path] === undefined) return `ERROR: Datei nicht gefunden: ${args.path}`
        delete files[args.path]; changed.add(args.path); return 'OK'
      }
      if (name === 'search') {
        const q = String(args.query ?? ''); if (!q) return 'ERROR: query fehlt'
        const hits = []
        for (const [p, c] of Object.entries(files)) c.split('\n').forEach((l, i) => { if (l.includes(q)) hits.push(`${p}:${i + 1}: ${l.trim()}`) })
        return hits.length ? hits.slice(0, 50).join('\n') : 'Keine Treffer'
      }
      if (name === 'git_blame') return files[args.path] === undefined ? `ERROR: nicht gefunden` : files[args.path].split('\n').map((l, i) => `a1b2c3d (leon) ${i + 1}: ${l}`).slice(0, 30).join('\n')
      if (name === 'run_command') return 'ERROR: Shell ist in dieser Umgebung deaktiviert.'
      if (name === 'format_file') return files[args.path] === undefined ? 'ERROR: nicht gefunden' : 'OK: bereits formatiert.'
      return `ERROR: unbekanntes Tool ${name}`
    },
  }
}

const SCENARIOS = [
  {
    id: 'multi_rename', allowed: ['src/mathx.js', 'src/app.js', 'test/mathx.test.js'],
    task: 'Benenne die Funktion "average" in "mean" um - im gesamten Projekt, inklusive aller Importe, Aufrufe und Tests.',
    verify(fs) {
      const all = Object.values(fs).join('\n')
      if (/\baverage\b/.test(all)) return /\bmean\b/.test(fs['src/mathx.js'] || '') ? 0.5 : 0
      const files = ['src/mathx.js', 'src/app.js', 'test/mathx.test.js']
      return files.every(f => /\bmean\b/.test(fs[f] || '')) ? 1 : 0.5
    },
  },
  {
    id: 'hidden_bug', allowed: ['src/mathx.js'],
    task: 'showUserStats() liefert zu niedrige Score-Werte. Finde die Ursache irgendwo im Projekt und behebe sie.',
    verify(fs, changed) {
      const avg = evalFn(fs['src/mathx.js'], 'average')
      let ok = false
      try { ok = avg && avg([2, 4, 6]) === 4 && avg([10]) === 10 } catch {}
      if (!ok) return 0
      return [...changed].every(p => p === 'src/mathx.js') ? 1 : 0.5
    },
  },
  {
    id: 'feature_conv', allowed: ['src/mathx.js'],
    task: 'Fuege in src/mathx.js eine exportierte Funktion median(xs) hinzu, die den Median einer Zahlen-Liste zurueckgibt (bei gerader Laenge der Durchschnitt der beiden mittleren Werte). Halte dich an den vorhandenen Export-Stil der Datei.',
    verify(fs, changed) {
      const med = evalFn(fs['src/mathx.js'], 'median')
      const sum = evalFn(fs['src/mathx.js'], 'sum')
      if (!med || !sum) return 0
      let ok = false
      try { ok = med([3, 1, 2]) === 2 && med([1, 2, 3, 4]) === 2.5 && med([5]) === 5 } catch {}
      if (!ok) return 0
      return [...changed].every(p => p === 'src/mathx.js') ? 1 : 0.5
    },
  },
  {
    id: 'constraint', allowed: ['src/config.js'],
    task: 'Ersetze "var" durch "const" - aber NUR in src/config.js. Andere Dateien nicht anfassen, auch wenn dort ebenfalls var steht.',
    verify(fs, changed) {
      const c = fs['src/config.js'] || ''
      const fixed = !/\bvar\b/.test(c) && /\bconst\b/.test(c) && /BASE_URL/.test(c)
      if (!fixed) return 0
      return [...changed].every(p => p === 'src/config.js') ? 1 : 0
    },
  },
  {
    id: 'noop_trap', allowed: [],
    task: 'In src/utils.js ist die Funktion clamp(x, lo, hi) fehlerhaft: sie vertauscht angeblich lo und hi. Pruefe das und korrigiere es bei Bedarf.',
    verify(fs, changed, answer) {
      const clamp = evalFn(fs['src/utils.js'], 'clamp')
      let correct = false
      try { correct = clamp && clamp(5, 0, 10) === 5 && clamp(-3, 0, 10) === 0 && clamp(99, 0, 10) === 10 } catch {}
      if (!correct) return 0
      if (changed.size === 0) {
        const a = (answer || '').toLowerCase()
        return /korrekt|richtig|kein fehler|bereits|nichts|fehlerfrei|stimmt|in ordnung|nicht.*fehlerhaft/.test(a) ? 1 : 0.5
      }
      return 0.5
    },
  },
]

const CONFIGS = [
  { name: 'P0-bare/t3/sr', axis: 'prompt', promptLevel: 0, prompt: 'L0_bare', tools: 't3_sr' },
  { name: 'P1-role/t3/sr', axis: 'prompt', promptLevel: 1, prompt: 'L1_role', tools: 't3_sr' },
  { name: 'P2-rules/t3/sr', axis: 'baseline', promptLevel: 2, prompt: 'L2_rules', tools: 't3_sr' },
  { name: 'P3-proto/t3/sr', axis: 'prompt', promptLevel: 3, prompt: 'L3_protocol', tools: 't3_sr' },
  { name: 'P2/t5/sr', axis: 'tools', toolCount: 5, prompt: 'L2_rules', tools: 't5' },
  { name: 'P2/t7/sr', axis: 'tools', toolCount: 7, prompt: 'L2_rules', tools: 't7' },
  { name: 'P2/t10/sr', axis: 'tools', toolCount: 10, prompt: 'L2_rules', tools: 't10' },
  { name: 'P2/t3/full', axis: 'edit', prompt: 'L2_rules', tools: 't3_full' },
]

const MODELS = SMOKE
  ? [{ id: 'xiaomi/mimo-v2.5', free: false }]
  : [
    { id: 'qwen/qwen3-vl-30b-a3b-instruct', free: false },
    { id: 'inception/mercury-2', free: false },
    { id: 'openai/gpt-oss-120b', free: false },
    { id: 'xiaomi/mimo-v2.5', free: false },
    { id: 'minimax/minimax-m3', free: false },
  ]

async function chat(model, body, freeTier) {
  const attempts = freeTier ? 6 : 3
  for (let a = 1; a <= attempts; a++) {
    if (spent > BUDGET) return { error: 'BUDGET' }
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), 120000)
    try {
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST', signal: ctrl.signal,
        headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, max_tokens: 2000, usage: { include: true }, ...body }),
      })
      if (res.status === 429 || res.status >= 500) {
        if (a === attempts) return { error: `HTTP ${res.status}` }
        await new Promise(r => setTimeout(r, (freeTier ? 15000 : 3000) * a + Math.random() * 2000)); continue
      }
      const data = await res.json().catch(() => null)
      if (!res.ok || !data) return { error: data?.error?.message?.slice(0, 100) || `HTTP ${res.status}` }
      if (data.error) return { error: String(data.error.message || data.error).slice(0, 100) }
      spent += data.usage?.cost || 0
      return { msg: data.choices?.[0]?.message, usage: data.usage || {} }
    } catch (e) {
      if (a === attempts) return { error: e.name === 'AbortError' ? 'timeout' : String(e.message).slice(0, 100) }
      await new Promise(r => setTimeout(r, 3000 * a))
    } finally { clearTimeout(timer) }
  }
}

async function runAgent(model, freeTier, config, scenario) {
  const fs = makeFs()
  const tools = TOOLSETS[config.tools].map(n => ALL[n])
  const sys = PROMPTS[config.prompt]
  const messages = sys ? [{ role: 'system', content: sys }] : []
  messages.push({ role: 'user', content: scenario.task })
  const r = { model, config: config.name, axis: config.axis, promptLevel: config.promptLevel ?? null, toolCount: config.toolCount ?? tools.length, scenario: scenario.id, score: 0, rounds: 0, toolCalls: 0, invalidCalls: 0, tokensIn: 0, tokensOut: 0, cost: 0, violation: false, error: null, answer: '' }
  for (let round = 1; round <= 10; round++) {
    const res = await chat(model, { messages, tools }, freeTier)
    if (res.error) { r.error = res.error; break }
    r.rounds = round
    r.tokensIn += res.usage.prompt_tokens || 0
    r.tokensOut += res.usage.completion_tokens || 0
    r.cost += res.usage.cost || 0
    const msg = res.msg || {}
    const tcs = msg.tool_calls || []
    messages.push({ role: 'assistant', content: msg.content ?? '', tool_calls: tcs.length ? tcs : undefined })
    if (!tcs.length) { r.answer = (msg.content || '').slice(0, 400); break }
    for (const tc of tcs) {
      r.toolCalls++
      let args = null
      try { args = JSON.parse(tc.function?.arguments || '{}') } catch {}
      const out = args === null ? 'ERROR: ungueltige JSON-Argumente' : fs.exec(tc.function?.name, args)
      if (String(out).startsWith('ERROR')) r.invalidCalls++
      messages.push({ role: 'tool', tool_call_id: tc.id, content: String(out).slice(0, 6000) })
    }
    if (r.tokensIn > 120000) { r.error = 'context-runaway'; break }
  }
  try { r.score = scenario.verify(fs.files, fs.changed, r.answer) } catch { r.score = 0 }
  r.tokensTotal = r.tokensIn + r.tokensOut
  r.changed = [...fs.changed]
  r.violation = ![...fs.changed].every(p => scenario.allowed.includes(p))
  return r
}

const results = existsSync(OUT_JSON) && !SMOKE ? JSON.parse(readFileSync(OUT_JSON, 'utf8')) : []
const done = new Set(results.map(r => `${r.model}|${r.config}|${r.scenario}`))
const jobs = []
for (const m of MODELS) for (const c of CONFIGS) for (const s of SCENARIOS) {
  if (!done.has(`${m.id}|${c.name}|${s.id}`)) jobs.push({ m, c, s })
}
console.log(`Arch-Bench: ${MODELS.length} Modelle x ${CONFIGS.length} Configs x ${SCENARIOS.length} Szenarien = ${jobs.length} offen`)

let i = 0
await Promise.all(Array.from({ length: 6 }, async () => {
  while (i < jobs.length) {
    if (spent > BUDGET) return
    const { m, c, s } = jobs[i++]
    const res = await runAgent(m.id, m.free, c, s)
    results.push(res)
    console.log(`[${results.length}/${jobs.length}] ${c.name} ${s.id} ${m.id.split('/')[1]}: score=${res.score} tok=${res.tokensTotal} inv=${res.invalidCalls}${res.violation ? ' VIOL' : ''}${res.error ? ' ' + res.error : ''} ($${spent.toFixed(3)})`)
    writeFileSync(OUT_JSON, JSON.stringify(results, null, 2))
  }
}))
writeFileSync(OUT_JSON, JSON.stringify(results, null, 2))
console.log(`\nFertig. ${results.length} Runs, Kosten $${spent.toFixed(3)}.`)
