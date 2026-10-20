# Prep ledger

A static site that tracks an Amazon SDE-1 interview-prep sprint from evidence rather than feelings. It replaces the Drive documents as the place progress is logged.

- **Today** shows the sprint day, a day-by-day strip that marks which days have logged evidence, this week's plan, and anything overdue or neglected.
- **Readiness** shows every track and topic on a six-state ladder (not started, learning, practicing, understood, strong, interview ready). There is deliberately no percentage score.
- **DSA**, **Weaknesses**, **Roadmap**, **Stories**, **Gate** and **Change log** cover the problem log, open weaknesses and retests, the 13-week plan, the story bank, the 13 Jan 2027 gate and the history.

## The rule

A status moves only on dated, unaided evidence: explaining it, applying it, handling edge cases, unseen problems and follow-ups without AI. Reading, watching or an AI explanation is not evidence. A weakness closes only after an independent retest.

## Files

| File | Purpose |
| --- | --- |
| `index.html`, `assets/app.css`, `assets/app.js` | The site. No build step. |
| `data/tracker.json` | Current state: topics, statuses, DSA log, weaknesses, retests, roadmap, stories, gate. |
| `data/changelog.json` | Append-only history, newest first. Every status change, new evidence and plan change is an entry. |
| `scripts/validate.py` | Checks the data follows the rules above and that nothing proprietary slipped in. |

## Logging a change

Every change touches two things: `data/tracker.json` (the new state) and `data/changelog.json` (one new entry at the top). Then:

```
python3 scripts/validate.py
git add -A && git commit -m "Log: <what changed>" && git push
```

The git history is the audit trail; the change log is the readable version of it. In a Claude session, say `UPDATE MY PROGRESS` or `LOG DSA`, and the update is made and pushed for you.

## Preview locally

Browsers block data reads from `file://`, so serve the folder:

```
python3 -m http.server 8000
```

Open <http://localhost:8000>. Add `?today=2026-11-15` to see the site as of another date.

## Publishing on GitHub Pages

Settings, Pages, Source: **Deploy from a branch**, Branch: `main`, Folder: `/ (root)`. The site goes live at `https://<user>.github.io/<repo>/`.

## What stays out of this repo

This site is public. It must not contain internship source code, file names, internals or metrics, credentials, or anything covered by internship or NDA terms. Internship modules use generic names, and `scripts/validate.py` fails if known proprietary strings appear in the data.
