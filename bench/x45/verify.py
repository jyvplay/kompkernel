#!/usr/bin/env python3
"""Independent byte reader for the two SYNKRISIS X45 message formats.

This reader is intentionally separate from the TypeScript implementation. It
uses the repository's pinned public-canon memory snapshots, not TS catalogue
objects, and compares reconstructed bytes with the real corpus files.
"""
from __future__ import annotations

import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
MSG = ROOT / "bench/x45/receipts/messages"
OUT = ROOT / "bench/x45/receipts"

REPEAT_CONTRACT = (
    'Repeat standard MIT once per following value; set line 3 to "Copyright (c) " '
    'plus that value. Join copies with "\\n\\n-----\\n\\n"; finish with LF.'
)


def sha(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def replace_words(words: list[str], old: str, new: str) -> list[str]:
    needle = old.split()
    replacement = new.split()
    starts = [i for i in range(len(words) - len(needle) + 1)
              if words[i:i + len(needle)] == needle]
    if len(starts) != 1:
        raise ValueError(f"phrase is not unique: {old!r}: {len(starts)} matches")
    i = starts[0]
    return words[:i] + replacement + words[i + len(needle):]


def decode_word(message: str) -> str:
    marker = "SYNKRISIS/WORD\n"
    start = message.index(marker) + len(marker)
    payload = json.loads(message[start:])
    if payload["id"] != "BSD-3-Clause":
        raise ValueError(f"unexpected hand-decode id {payload['id']!r}")
    memory = (ROOT / "bench/z45/canon/memory/bsd-3-clause.txt").read_text()
    body = memory[memory.index("Redistribution and use"):].rstrip("\n")
    words = " ".join(body.split()).split(" ")
    for old, new in payload["edits"]:
        words = replace_words(words, old, new)
    if sum(payload["layout"]) != len(words):
        raise ValueError(f"layout consumes {sum(payload['layout'])}, word stream has {len(words)}")
    indent = {line: spaces for line, spaces in payload["indents"]}
    lines: list[str] = []
    at = 0
    for line_no, count in enumerate(payload["layout"], 1):
        row = words[at:at + count]
        at += count
        lines.append("" if count == 0 else " " * indent.get(line_no, 0) + " ".join(row))
    eol = payload["eol"]
    rebuilt = eol.join(lines) + (eol if payload["final"] else "")
    return payload["prefix"] + rebuilt + payload["suffix"]


def decode_repeat(message: str) -> str:
    prefix = REPEAT_CONTRACT + "\n"
    if not message.startswith(prefix):
        raise ValueError("multi-copy message contract mismatch")
    values = message[len(prefix):].split("\n")
    if not values or any("\r" in v for v in values):
        raise ValueError("invalid multi-copy values")
    template = (ROOT / "bench/z45/canon/memory/mit.txt").read_text().splitlines()
    if len(template) != 21:
        raise ValueError(f"pinned MIT template line count changed: {len(template)}")
    blocks: list[str] = []
    for value in values:
        lines = list(template)
        lines[2] = "Copyright (c) " + value
        blocks.append("\n".join(lines))
    return "\n\n-----\n\n".join(blocks) + "\n"


def check(name: str, result: str, original_path: str) -> str:
    original = (ROOT / original_path).read_text()
    if result != original:
        raise AssertionError(f"{name}: reconstructed bytes differ from {original_path}")
    return (f"PASS {name}: bytes={len(result)} sha256={sha(result)} "
            f"source={original_path}")


def main() -> None:
    django_message = (MSG / "django.txt").read_text()
    bundle_message = (MSG / "bundle.txt").read_text()
    django = decode_word(django_message)
    bundle = decode_repeat(bundle_message)
    lines = [
        check("word-canon CPython", django,
              "bench/z45/corpus/licenses/django_django.txt"),
        check("multi-copy CPython", bundle,
              "bench/x44/lanes/third-party-notices.txt"),
        check("LLM hand decode word-canon", (OUT / "hand-decode-django.txt").read_text(),
              "bench/z45/corpus/licenses/django_django.txt"),
        check("LLM hand decode multi-copy", (OUT / "hand-decode-bundle.txt").read_text(),
              "bench/x44/lanes/third-party-notices.txt"),
    ]
    receipt = "\n".join(lines) + "\n"
    (OUT / "python-verification.txt").write_text(receipt)
    print(receipt, end="")


if __name__ == "__main__":
    main()
