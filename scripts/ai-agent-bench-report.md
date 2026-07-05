# Agentic IDE-Bench (OpenRouter)

Runs: 200 · Kosten: $0.306 · 2026-07-05T16:42:39.979Z

## Screening (Config S1/small/sr): Modell-Ranking

| Modell | Score | Ø Runden | Ø Calls | Invalid | Violations | Ø Tok in/out | Kosten | Fehler |
|---|---|---|---|---|---|---|---|---|
| poolside/laguna-xs-2.1:free | 5/5 | 5.6 | 4.6 | 1 | 0 | 4773/753 | $0.0000 | 0 |
| openai/gpt-oss-120b | 5/5 | 8.4 | 7.4 | 6 | 0 | 5447/967 | $0.0018 | 0 |
| xiaomi/mimo-v2.5 | 5/5 | 4.8 | 6.6 | 0 | 0 | 4613/497 | $0.0019 | 0 |
| inclusionai/ring-2.6-1t | 5/5 | 6 | 9.2 | 12 | 0 | 7028/1052 | $0.0047 | 0 |
| nvidia/nemotron-3-super-120b-a12b | 5/5 | 7.4 | 6.6 | 0 | 0 | 6962/1266 | $0.0056 | 0 |
| minimax/minimax-m3 | 5/5 | 4.4 | 6.2 | 0 | 0 | 4358/628 | $0.0061 | 0 |
| openai/gpt-5.1-codex-mini | 5/5 | 6 | 5 | 0 | 0 | 2973/457 | $0.0083 | 0 |
| deepseek/deepseek-v4-pro | 5/5 | 4.4 | 5.8 | 0 | 0 | 4196/680 | $0.0146 | 0 |
| bytedance-seed/seed-2.0-lite | 5/5 | 6.2 | 5.2 | 0 | 0 | 6272/801 | $0.0159 | 0 |
| inception/mercury-2 | 4.5/5 | 7.8 | 7 | 3 | 0 | 7737/1025 | $0.0094 | 0 |
| nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free | 4/5 | 5.4 | 4.4 | 0 | 0 | 4886/4728 | $0.0000 | 0 |
| poolside/laguna-m.1:free | 4/5 | 6.4 | 5.6 | 0 | 0 | 5594/794 | $0.0000 | 1 |
| qwen/qwen3-vl-30b-a3b-instruct | 3.5/5 | 4.2 | 3.8 | 0 | 0 | 3095/361 | $0.0034 | 0 |
| nvidia/nemotron-3-super-120b-a12b:free | 3/5 | 5.8 | 5.2 | 0 | 0 | 5116/1768 | $0.0000 | 2 |
| arcee-ai/trinity-large-thinking | 2/5 | 3.4 | 2.4 | 0 | 0 | 2208/375 | $0.0035 | 0 |
| openai/gpt-oss-safeguard-20b | 0/5 | 4 | 3.2 | 0 | 0 | 3160/1068 | $0.0023 | 0 |

## Config-Vergleich (Top-Modelle)

| Config | Score % | Ø Runden | Ø Calls | Invalid | Violations | Ø Tok in/out | Kosten | Fehler |
|---|---|---|---|---|---|---|---|---|
| S1/small/sr | 100% (n=30) | 5.5 | 5.9 | 0 | 0 | 4896/722 | $0.0523 | 0 |
| S0/small/sr | 100% (n=30) | 5.2 | 5.4 | 0 | 0 | 3869/739 | $0.0530 | 0 |
| S2/small/sr | 100% (n=30) | 6.1 | 6.5 | 1 | 0 | 6937/756 | $0.0685 | 0 |
| S1/rich/sr | 97% (n=30) | 4.9 | 4.4 | 4 | 0 | 5781/620 | $0.0537 | 1 |
| S1/small/full | 97% (n=30) | 5.4 | 5.5 | 0 | 0 | 4492/593 | $0.0532 | 1 |

## Szenario-Schwierigkeit

| Szenario | Score % | Violations |
|---|---|---|
| bugfix | 93% (n=40) | 0 |
| feature | 86% (n=40) | 0 |
| refactor | 91% (n=40) | 0 |
| explore | 95% (n=40) | 0 |
| constraint | 95% (n=40) | 0 |