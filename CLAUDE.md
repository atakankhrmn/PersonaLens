# CLAUDE.md

All project context, data rules and conventions live in AGENTS.md so that every coding
agent on the team (Claude Code, Codex, Cursor, Copilot) reads the same instructions.

@AGENTS.md

## Claude Code specifics

- Shell is Windows; prefer the project interpreter `.venv/Scripts/python` (Bash) or
  `.venv\Scripts\python` (PowerShell) instead of a global `python`.
- The full ETL takes a few minutes; run it in the background.
- Before claiming cleaning work is done: run `python -m pytest`, re-run the ETL and check
  that `reports/etl/leakage_report_label_clean.json` shows `"leak_mentions_total": 0`
  in `after`.
- **After finishing any work, update the status table in AGENTS.md ("Current status")
  in the same commit, and tell the user which row you changed.** Work is not done until
  the table is updated.
- Keep AGENTS.md as the single source of truth: put shared knowledge there, not here.
