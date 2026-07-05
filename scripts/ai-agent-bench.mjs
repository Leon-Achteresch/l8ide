import { writeFileSync, readFileSync, existsSync } from 'node:fs'

const KEY = process.env.OPENROUTER_API_KEY
if (!KEY) { console.error('OPENROUTER_API_KEY fehlt'); process.exit(1) }

const SMOKE = !!process.env.SMOKE
const BUDGET = 3.6
const OUT_JSON = new URL('./ai-agent-bench-results.json', import.meta.url).pathname
const OUT_MD = new URL('./ai-agent-bench-report.md', import.meta.url).pathname
const P1_JSON = new URL('./ai-bench-results.json', import.meta.url).pathname

let spent = 0

const REPO = {
  'package.json': '{\n  "name": "shopmate",\n  "version": "1.0.0",\n  "type": "module"\n}\n',
  'README.md': '# shopmate\n\nKleine Demo-App fuer Bestellungen.\n',
  'src/config.js': 'var BASE_URL = "https://api.shopmate.dev";\nvar TIMEOUT = 5000;\nexport { BASE_URL, TIMEOUT };\n',
  'src/utils.js': 'var SEP = "-";\n\nexport function formatDate(d) {\n  return d.toISOString().slice(0, 10);\n}\n\nexport function clamp(x, lo, hi) {\n  return Math.min(hi, Math.max(lo, x));\n}\n',
  'src/mathx.js': 'export function sum(xs) {\n  let s = 0;\n  for (const x of xs) s += x;\n  return s;\n}\n\nexport function average(xs) {\n  return sum(xs) / (xs.length + 1);\n}\n',
  'src/api.js': 'import { BASE_URL, TIMEOUT } from "./config.js";\n\nexport async function fetchUser(id) {\n  const res = await fetch(`${BASE_URL}/users/${id}`, { timeout: TIMEOUT });\n  return res.json();\n}\n',
  'src/app.js': 'import { fetchUser } from "./api.js";\nimport { average } from "./mathx.js";\n\nexport async function showUserStats(id) {\n  const user = await fetchUser(id);\n  return { name: user.name, score: average(user.scores) };\n}\n',
  'test/mathx.test.js': 'import { average, sum } from "../src/mathx.js";\n\nif (average([2, 4, 6]) !== 4) throw new Error("average([2,4,6]) erwartet 4, war " + average([2, 4, 6]));\nif (sum([1, 2, 3]) !== 6) throw new Error("sum kaputt");\nconsole.log("ok");\n',
}

function evalModule(code, name) {
  try {
    const body = String(code).replace(/^import[^\n]*\n/gm, '').replace(/export default /g, '').replace(/export /g, '')
    return new Function(`${body}; return typeof ${name} === "function" ? ${name} : null;`)()
  } catch { return null }
}

const S0 = 'Du bist ein Coding-Agent in der IDE "l8ide". Du hast Zugriff auf Tools, um mit dem Projekt zu arbeiten.'

const S1 = `Du bist ein Coding-Agent in der IDE "l8ide".
Regeln:
- Lies eine Datei immer erst mit read_file, bevor du sie aenderst.
- Mache die kleinstmoegliche Aenderung, die die Aufgabe loest.
- Fasse keine Dateien an, die fuer die Aufgabe nicht noetig sind.
- Erfinde keine Dateiinhalte oder Pfade; nutze list_files und read_file.
- Pruefe nach einem Edit das Ergebnis mit read_file.
- Wenn du fertig bist, antworte ohne Tool-Aufruf mit 1-3 Saetzen auf Deutsch.`

const S2 = `${S1}

Arbeitsprotokoll fuer jede Aufgabe:
1. Verschaffe dir mit list_files einen Ueberblick.
2. Lies alle relevanten Dateien.
3. Plane die minimale Aenderung.
4. Fuehre die Aenderung aus.
5. Verifiziere per read_file, dass die Aenderung korrekt ist.
6. Antworte kurz auf Deutsch, was du geaendert hast.

Beispiel (Aufgabe: "Tippfehler 'Bestellnug' in der README fixen"):
- list_files -> ["README.md", "src/index.js"]
- read_file {"path": "README.md"} -> "# App\\nVerwaltet Bestellnug-Daten."
- edit_file {"path": "README.md", "old_string": "Bestellnug", "new_string": "Bestellung"}
- read_file {"path": "README.md"} -> korrekt
- Antwort: "Tippfehler in README.md korrigiert."

Wichtig: Rate niemals Dateiinhalte. Ein edit_file mit einem old_string, den du nicht zuvor per read_file gesehen hast, ist ein Fehler.`

function toolDef(name, description, props, required) {
  return { type: 'function', function: { name, description, parameters: { type: 'object', properties: props, required } } }
}

const T_LIST = toolDef('list_files', 'Listet alle Dateipfade im Projekt auf', {}, [])
const T_READ = toolDef('read_file', 'Liest den Inhalt einer Datei', { path: { type: 'string' } }, ['path'])
const T_EDIT = toolDef('edit_file', 'Ersetzt old_string (exakter Match, erstes Vorkommen) durch new_string in einer Datei', { path: { type: 'string' }, old_string: { type: 'string' }, new_string: { type: 'string' } }, ['path', 'old_string', 'new_string'])
const T_WRITE = toolDef('write_file', 'Ueberschreibt eine Datei komplett mit neuem Inhalt (legt sie an, falls nicht vorhanden)', { path: { type: 'string' }, content: { type: 'string' } }, ['path', 'content'])
const T_SEARCH = toolDef('search', 'Sucht einen Text in allen Dateien, liefert Treffer als pfad:zeile', { query: { type: 'string' } }, ['query'])
const T_CREATE = toolDef('create_file', 'Erstellt eine neue Datei', { path: { type: 'string' }, content: { type: 'string' } }, ['path', 'content'])
const T_DELETE = toolDef('delete_file', 'Loescht eine Datei', { path: { type: 'string' } }, ['path'])
const T_BLAME = toolDef('git_blame', 'Zeigt git blame fuer eine Datei', { path: { type: 'string' } }, ['path'])
const T_RUN = toolDef('run_command', 'Fuehrt ein Shell-Kommando aus', { command: { type: 'string' } }, ['command'])
const T_FMT = toolDef('format_file', 'Formatiert eine Datei mit dem Projekt-Formatter', { path: { type: 'string' } }, ['path'])

function toolset(kind, edit) {
  const editTools = edit === 'sr' ? [T_EDIT] : [T_WRITE]
  if (kind === 'small') return [T_LIST, T_READ, ...editTools]
  return [T_LIST, T_READ, ...editTools, T_SEARCH, T_CREATE, T_DELETE, T_BLAME, T_RUN, T_FMT]
}

function makeFs() {
  const files = { ...REPO }
  const changed = new Set()
  return {
    files, changed,
    exec(name, args) {
      if (name === 'list_files') return JSON.stringify(Object.keys(files))
      if (name === 'read_file') return files[args.path] ?? `ERROR: Datei nicht gefunden: ${args.path}`
      if (name === 'edit_file') {
        const f = files[args.path]
        if (f === undefined) return `ERROR: Datei nicht gefunden: ${args.path}`
        if (typeof args.old_string !== 'string' || !f.includes(args.old_string)) return `ERROR: old_string nicht gefunden in ${args.path}`
        files[args.path] = f.replace(args.old_string, args.new_string ?? '')
        changed.add(args.path)
        return 'OK'
      }
      if (name === 'write_file' || name === 'create_file') {
        if (typeof args.content !== 'string') return 'ERROR: content fehlt'
        files[args.path] = args.content
        changed.add(args.path)
        return 'OK'
      }
      if (name === 'delete_file') {
        if (files[args.path] === undefined) return `ERROR: Datei nicht gefunden: ${args.path}`
        delete files[args.path]
        changed.add(args.path)
        return 'OK'
      }
      if (name === 'search') {
        const q = String(args.query ?? '')
        if (!q) return 'ERROR: query fehlt'
        const hits = []
        for (const [p, c] of Object.entries(files)) c.split('\n').forEach((l, i) => { if (l.includes(q)) hits.push(`${p}:${i + 1}: ${l.trim()}`) })
        return hits.length ? hits.slice(0, 50).join('\n') : 'Keine Treffer'
      }
      if (name === 'git_blame') return files[args.path] === undefined ? `ERROR: Datei nicht gefunden: ${args.path}` : files[args.path].split('\n').map((l, i) => `a1b2c3d (leon 2026-06-01) ${i + 1}: ${l}`).slice(0, 30).join('\n')
      if (name === 'run_command') return 'ERROR: Shell-Kommandos sind in dieser Umgebung deaktiviert.'
      if (name === 'format_file') return files[args.path] === undefined ? `ERROR: Datei nicht gefunden: ${args.path}` : 'OK: Datei ist bereits korrekt formatiert.'
      return `ERROR: unbekanntes Tool ${name}`
    },
  }
}

const SCENARIOS = [
  {
    id: 'bugfix', allowed: ['src/mathx.js'],
    task: 'Der Test test/mathx.test.js schlaegt fehl: average([2, 4, 6]) sollte 4 ergeben, gibt aber 3 zurueck. Finde den Bug im Projekt und fixe ihn.',
    verify(fs, changed) {
      const avg = evalModule(fs['src/mathx.js'], 'average')
      const s = evalModule(fs['src/mathx.js'], 'sum')
      let ok = false
      try { ok = avg && s && avg([2, 4, 6]) === 4 && avg([10]) === 10 && s([1, 2, 3]) === 6 } catch {}
      if (!ok) return 0
      return [...changed].every(p => this.allowed.includes(p)) ? 1 : 0.5
    },
  },
  {
    id: 'feature', allowed: ['src/utils.js'],
    task: 'Fuege in src/utils.js eine Funktion slugify(text) hinzu und exportiere sie. Anforderungen: Kleinbuchstaben; Umlaute ae/oe/ue/ss fuer ä/ö/ü/ß; alle anderen Nicht-Alphanumerischen Zeichen zu "-"; keine doppelten, fuehrenden oder abschliessenden "-". Beispiel: slugify("Höllo Wörld! 42") ergibt "hoello-woerld-42".',
    verify(fs, changed) {
      const slug = evalModule(fs['src/utils.js'], 'slugify')
      const fmt = evalModule(fs['src/utils.js'], 'formatDate')
      if (!slug || !fmt) return 0
      let full = false, basic = false
      try { full = slug('Höllo Wörld! 42') === 'hoello-woerld-42' && slug('  Foo   Bar ') === 'foo-bar' && slug('Straße') === 'strasse' } catch {}
      try { basic = slug('Foo Bar!') === 'foo-bar' } catch {}
      const score = full ? 1 : basic ? 0.5 : 0
      return score && ![...changed].every(p => this.allowed.includes(p)) ? score / 2 : score
    },
  },
  {
    id: 'refactor', allowed: ['src/api.js', 'src/app.js'],
    task: 'Benenne die Funktion fetchUser in loadUser um - ueberall im Projekt, inklusive aller Importe und Aufrufe.',
    verify(fs) {
      const all = Object.values(fs).join('\n')
      if (/fetchUser/.test(all)) return /loadUser/.test(fs['src/api.js'] || '') ? 0.5 : 0
      return /loadUser/.test(fs['src/api.js'] || '') && /loadUser/.test(fs['src/app.js'] || '') ? 1 : 0
    },
  },
  {
    id: 'explore', allowed: [],
    task: 'In welcher Datei wird BASE_URL definiert und in welchen Dateien wird es verwendet? Antworte kompakt mit den Dateipfaden.',
    verify(fs, changed, answer) {
      if (changed.size > 0) return 0
      const a = (answer || '').toLowerCase()
      return a.includes('config.js') && a.includes('api.js') ? 1 : a.includes('config.js') ? 0.5 : 0
    },
  },
  {
    id: 'constraint', allowed: ['src/config.js'],
    task: 'Ersetze var durch const - aber NUR in der Datei src/config.js. Fasse keine anderen Dateien an, auch wenn dort ebenfalls var verwendet wird.',
    verify(fs, changed) {
      const c = fs['src/config.js'] || ''
      const fixed = !/\bvar\b/.test(c) && /\bconst\b/.test(c) && /BASE_URL/.test(c)
      if (!fixed) return 0
      return [...changed].every(p => p === 'src/config.js') ? 1 : 0
    },
  },
]

const CONFIGS = [
  { name: 'S1/small/sr', sys: S1, tools: 'small', edit: 'sr', phase: 'screen' },
  { name: 'S0/small/sr', sys: S0, tools: 'small', edit: 'sr', phase: 'matrix' },
  { name: 'S2/small/sr', sys: S2, tools: 'small', edit: 'sr', phase: 'matrix' },
  { name: 'S1/rich/sr', sys: S1, tools: 'rich', edit: 'sr', phase: 'matrix' },
  { name: 'S1/small/full', sys: S1.replace(/edit_file/g, 'write_file'), tools: 'small', edit: 'full', phase: 'matrix' },
]

async function chat(model, body, freeTier) {
  const attempts = freeTier ? 6 : 3
  for (let a = 1; a <= attempts; a++) {
    if (spent > BUDGET) return { error: 'BUDGET' }
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), 120000)
    try {
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        signal: ctrl.signal,
        headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, max_tokens: 2500, usage: { include: true }, ...body }),
      })
      if (res.status === 429 || res.status >= 500) {
        if (a === attempts) return { error: `HTTP ${res.status}` }
        await new Promise(r => setTimeout(r, (freeTier ? 15000 : 3000) * a + Math.random() * 2000))
        continue
      }
      const data = await res.json().catch(() => null)
      if (!res.ok || !data) return { error: data?.error?.message?.slice(0, 120) || `HTTP ${res.status}` }
      if (data.error) return { error: String(data.error.message || data.error).slice(0, 120) }
      spent += data.usage?.cost || 0
      return { msg: data.choices?.[0]?.message, usage: data.usage || {} }
    } catch (e) {
      if (a === attempts) return { error: e.name === 'AbortError' ? 'timeout' : String(e.message).slice(0, 120) }
      await new Promise(r => setTimeout(r, 3000 * a))
    } finally {
      clearTimeout(timer)
    }
  }
}

async function runAgent(model, freeTier, config, scenario) {
  const fs = makeFs()
  const tools = toolset(config.tools, config.edit)
  const messages = [{ role: 'system', content: config.sys }, { role: 'user', content: scenario.task }]
  const r = {
    model, config: config.name, scenario: scenario.id, phase: config.phase,
    score: 0, rounds: 0, toolCalls: 0, invalidCalls: 0, tokensIn: 0, tokensOut: 0, cost: 0,
    violation: false, error: null, trace: [], answer: '',
  }
  const t0 = Date.now()
  for (let round = 1; round <= 12; round++) {
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
      let out
      if (args === null) { r.invalidCalls++; out = 'ERROR: ungueltige JSON-Argumente' }
      else { out = fs.exec(tc.function?.name, args) }
      if (String(out).startsWith('ERROR')) r.invalidCalls++
      r.trace.push(`${tc.function?.name}(${JSON.stringify(args)?.slice(0, 120)}) -> ${String(out).slice(0, 60)}`)
      messages.push({ role: 'tool', tool_call_id: tc.id, content: String(out).slice(0, 6000) })
    }
    if (r.tokensIn > 120000) { r.error = 'context-runaway'; break }
  }
  r.ms = Date.now() - t0
  if (!r.error || fs.changed.size) {
    try { r.score = scenario.verify(fs.files, fs.changed, r.answer) } catch { r.score = 0 }
  }
  r.changed = [...fs.changed]
  r.violation = ![...fs.changed].every(p => scenario.allowed.includes(p))
  return r
}

async function pool(jobs, size, fn, results) {
  let i = 0
  const workers = Array.from({ length: size }, async () => {
    while (i < jobs.length) {
      if (spent > BUDGET) return
      const job = jobs[i++]
      const res = await fn(job)
      results.push(res)
      console.log(`[${results.length}] ${res.model} ${res.config} ${res.scenario}: score=${res.score} rounds=${res.rounds} calls=${res.toolCalls} inv=${res.invalidCalls}${res.violation ? ' VIOLATION' : ''}${res.error ? ' ERR:' + res.error : ''} (gesamt $${spent.toFixed(3)})`)
      writeFileSync(OUT_JSON, JSON.stringify(results, null, 2))
    }
  })
  await Promise.all(workers)
}

const p1 = JSON.parse(readFileSync(P1_JSON, 'utf8'))
const eligible = p1.filter(r => r.total >= 5.5 && r.model !== 'openrouter/auto')
const paid = eligible.filter(r => !r.free).sort((a, b) => b.total - a.total || a.tokensOut - b.tokensOut).slice(0, SMOKE ? 2 : 12)
const free = eligible.filter(r => r.free).sort((a, b) => b.total - a.total || a.tokensOut - b.tokensOut).slice(0, SMOKE ? 0 : 4)
const models = [...paid, ...free].map(r => ({ id: r.model, free: r.free }))

const results = existsSync(OUT_JSON) && !SMOKE ? JSON.parse(readFileSync(OUT_JSON, 'utf8')) : []
const doneKeys = new Set(results.map(r => `${r.model}|${r.config}|${r.scenario}`))
const screenCfg = CONFIGS[0]
const scenarios = SMOKE ? SCENARIOS.slice(0, 2) : SCENARIOS

const screenJobs = []
for (const m of models) for (const sc of scenarios) {
  if (!doneKeys.has(`${m.id}|${screenCfg.name}|${sc.id}`)) screenJobs.push(() => runAgent(m.id, m.free, screenCfg, sc))
}
console.log(`Screening: ${models.length} Modelle x ${scenarios.length} Szenarien, ${screenJobs.length} offen`)
await pool(screenJobs, 6, j => j(), results)

const byModel = {}
for (const r of results.filter(r => r.config === screenCfg.name)) {
  byModel[r.model] ??= { score: 0, cost: 0, inv: 0 }
  byModel[r.model].score += r.score
  byModel[r.model].cost += r.cost
  byModel[r.model].inv += r.invalidCalls
}
const topModels = Object.entries(byModel)
  .sort((a, b) => b[1].score - a[1].score || a[1].inv - b[1].inv || a[1].cost - b[1].cost)
  .slice(0, SMOKE ? 1 : 6)
  .map(([id]) => ({ id, free: models.find(m => m.id === id)?.free || false }))
console.log('Top-Modelle fuer Matrix:', topModels.map(m => m.id).join(', '))

const matrixJobs = []
for (const cfg of CONFIGS.filter(c => c.phase === 'matrix')) {
  for (const m of topModels) for (const sc of scenarios) {
    if (!doneKeys.has(`${m.id}|${cfg.name}|${sc.id}`)) matrixJobs.push(() => runAgent(m.id, m.free, cfg, sc))
  }
}
console.log(`Matrix: ${matrixJobs.length} Runs offen`)
if (!SMOKE) await pool(matrixJobs, 6, j => j(), results)

writeFileSync(OUT_JSON, JSON.stringify(results, null, 2))

function agg(rows) {
  const n = rows.length || 1
  return {
    n: rows.length,
    score: rows.reduce((a, r) => a + r.score, 0),
    scorePct: Math.round(rows.reduce((a, r) => a + r.score, 0) / n * 100),
    rounds: +(rows.reduce((a, r) => a + r.rounds, 0) / n).toFixed(1),
    calls: +(rows.reduce((a, r) => a + r.toolCalls, 0) / n).toFixed(1),
    inv: rows.reduce((a, r) => a + r.invalidCalls, 0),
    viol: rows.filter(r => r.violation).length,
    tokIn: Math.round(rows.reduce((a, r) => a + r.tokensIn, 0) / n),
    tokOut: Math.round(rows.reduce((a, r) => a + r.tokensOut, 0) / n),
    cost: rows.reduce((a, r) => a + r.cost, 0),
    err: rows.filter(r => r.error).length,
  }
}

const lines = ['# Agentic IDE-Bench (OpenRouter)', '', `Runs: ${results.length} · Kosten: $${spent.toFixed(3)} · ${new Date().toISOString()}`, '']
lines.push('## Screening (Config S1/small/sr): Modell-Ranking', '', '| Modell | Score | Ø Runden | Ø Calls | Invalid | Violations | Ø Tok in/out | Kosten | Fehler |', '|---|---|---|---|---|---|---|---|---|')
const screenRows = results.filter(r => r.config === screenCfg.name)
for (const [id] of Object.entries(byModel).sort((a, b) => b[1].score - a[1].score || a[1].cost - b[1].cost)) {
  const a = agg(screenRows.filter(r => r.model === id))
  lines.push(`| ${id} | ${a.score}/${scenarios.length} | ${a.rounds} | ${a.calls} | ${a.inv} | ${a.viol} | ${a.tokIn}/${a.tokOut} | $${a.cost.toFixed(4)} | ${a.err} |`)
}
lines.push('', '## Config-Vergleich (Top-Modelle)', '', '| Config | Score % | Ø Runden | Ø Calls | Invalid | Violations | Ø Tok in/out | Kosten | Fehler |', '|---|---|---|---|---|---|---|---|---|')
const topIds = new Set(topModels.map(m => m.id))
for (const cfg of CONFIGS) {
  const rows = results.filter(r => r.config === cfg.name && topIds.has(r.model))
  if (rows.length) {
    const a = agg(rows)
    lines.push(`| ${cfg.name} | ${a.scorePct}% (n=${a.n}) | ${a.rounds} | ${a.calls} | ${a.inv} | ${a.viol} | ${a.tokIn}/${a.tokOut} | $${a.cost.toFixed(4)} | ${a.err} |`)
  }
}
lines.push('', '## Szenario-Schwierigkeit', '', '| Szenario | Score % | Violations |', '|---|---|---|')
for (const sc of scenarios) {
  const rows = results.filter(r => r.scenario === sc.id)
  const a = agg(rows)
  lines.push(`| ${sc.id} | ${a.scorePct}% (n=${a.n}) | ${a.viol} |`)
}
writeFileSync(OUT_MD, lines.join('\n'))
console.log(`\nFertig. Kosten $${spent.toFixed(3)}. Report: ${OUT_MD}`)
