#!/usr/bin/env python3
"""Check the ledger data before it is committed.

Run from the repository root:  python3 scripts/validate.py

It enforces the rules the ledger exists for:
  * statuses come from the six-state vocabulary;
  * a topic above NOT STARTED must carry evidence and a last-tested date;
  * weakness ids are unique and every retest points at a real weakness;
  * the change log is newest-first and every status change names valid states;
  * nothing proprietary leaks into the public data files.
"""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATE = re.compile(r"^\d{4}-\d{2}-\d{2}$")

# Strings that must never appear in the public data files. Extend as needed.
FORBIDDEN = [
    "echoJobs", "livekit_agent", "echoTalkstack", "echoAnalysis", "DBHandler", "RedisHandler",
    "MAX_AUTO_RETRIES", "main.py", "health_main", "socket_master", "sendgrid", "api_key", "apikey",
    "password", "secret", "BEGIN PRIVATE KEY", "mongodb://", "mongodb+srv://", "redis://",
]

errors = []


def err(msg):
    errors.append(msg)


def load(name):
    path = ROOT / "data" / name
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception as exc:  # noqa: BLE001
        err(f"{name}: cannot parse ({exc})")
        return None


tracker = load("tracker.json")
changelog = load("changelog.json")

if tracker:
    scale = tracker["statusScale"]
    if scale != ["NOT STARTED", "LEARNING", "PRACTICING", "UNDERSTOOD", "STRONG", "INTERVIEW READY"]:
        err("statusScale must be the six-state vocabulary, in order")

    for key in ("sprintStart", "gateDate", "lastUpdated"):
        if not DATE.match(tracker["meta"].get(key, "")):
            err(f"meta.{key} must be YYYY-MM-DD")

    for track in tracker["tracks"]:
        for topic in track["topics"]:
            where = f"{track['id']} / {topic['name']}"
            if topic["status"] not in scale:
                err(f"{where}: unknown status {topic['status']!r}")
                continue
            if scale.index(topic["status"]) > 0:
                if not topic.get("evidence") or topic["evidence"].strip() in ("—", ""):
                    err(f"{where}: status {topic['status']} needs evidence text")
                if not topic.get("lastTested") or not DATE.match(topic["lastTested"]):
                    err(f"{where}: status {topic['status']} needs a lastTested date")
            if topic.get("lastTested") and not DATE.match(topic["lastTested"]):
                err(f"{where}: lastTested must be YYYY-MM-DD")

    ids = [w["id"] for w in tracker["weaknesses"]] + [w["id"] for w in tracker["closedWeaknesses"]]
    if len(ids) != len(set(ids)):
        err("weakness ids are not unique")
    for w in tracker["closedWeaknesses"]:
        if not w.get("result") or not w.get("closed"):
            err(f"{w['id']}: a closed weakness needs a retest result and a closed date")
    for r in tracker["retests"]:
        if r["weakness"] and r["weakness"] not in ids:
            err(f"{r['id']}: refers to unknown weakness {r['weakness']}")
        if not DATE.match(r["due"]):
            err(f"{r['id']}: due must be YYYY-MM-DD")

    start, gate = tracker["meta"]["sprintStart"], tracker["meta"]["gateDate"]
    if start >= gate:
        err("sprintStart must be before gateDate")
    for m in tracker["milestones"]:
        if not (start <= m["date"] <= gate):
            err(f"milestone {m['label']}: {m['date']} is outside the sprint")
    for w in tracker["weaknesses"]:
        if w.get("retestDue") and w["retestDue"] > gate:
            err(f"{w['id']}: retest due after the gate date")
    for r in tracker["retests"]:
        if r["due"] > gate:
            err(f"{r['id']}: due after the gate date")
    weeks = tracker["weeks"]
    for a, b in zip(weeks, weeks[1:]):
        if a["end"] >= b["start"]:
            err(f"weeks {a['week']} and {b['week']} overlap or are out of order")
    if weeks and (weeks[0]["start"] != start or weeks[-1]["end"] != gate):
        err("weeks must run from sprintStart to gateDate")

    lcs = [row["lc"] for row in tracker["dsaLog"]]
    if len(lcs) != len(set(lcs)):
        err("dsaLog has a duplicate problem number; update the existing row instead")
    allowed = {"independent", "hinted", "solution", "unsolved", "unspecified"}
    for row in tracker["dsaLog"]:
        if row["independence"] not in allowed:
            err(f"LC {row['lc']}: independence must be one of {sorted(allowed)}")

if changelog and tracker:
    dates = [e["date"] for e in changelog["entries"]]
    if dates != sorted(dates, reverse=True):
        err("changelog entries must be newest first")
    for e in changelog["entries"]:
        if e["kind"] not in changelog["kinds"]:
            err(f"changelog {e['date']}: unknown kind {e['kind']!r}")
        for c in e.get("changes", []):
            for k in ("from", "to"):
                if c[k] not in tracker["statusScale"]:
                    err(f"changelog {e['date']}: {c[k]!r} is not a valid status")

for name in ("tracker.json", "changelog.json"):
    text = (ROOT / "data" / name).read_text(encoding="utf-8")
    for bad in FORBIDDEN:
        if bad.lower() in text.lower():
            err(f"{name}: contains {bad!r}, which should not appear on a public site")

if errors:
    print("Ledger check failed:")
    for e in errors:
        print("  -", e)
    sys.exit(1)
print("Ledger check passed.")
