#!/usr/bin/env python3
"""
bench/x44/archetypon_decode.py — INDEPENDENT CPython reader for ARCHETYPON (X44).

Written from the contract prose and the public canonical texts, NOT from
src/lib/omega/archetypon.ts. It shares no code and no data structures with the
TypeScript encoder. It reads the emitted one-chat messages in
bench/x44/receipts/messages.json, decodes them, and compares byte-for-byte with
the source files listed in bench/x44/receipts/verify.jsonl.

Usage:
    python3 bench/x44/archetypon_decode.py
Exit status 0 iff every parametric/self-canon message decodes exactly.
"""
import json
import os
import re
import sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))

# --- Public canonical texts, written independently from their standard SPDX
#     renderings. These are the SAME public texts the contract names in English;
#     a bare LLM reader supplies them from its weights instead of this table.
MIT = [
    "MIT License",
    "",
    "Copyright (c) <year> <copyright holders>",
    "",
    "Permission is hereby granted, free of charge, to any person obtaining a copy",
    'of this software and associated documentation files (the "Software"), to deal',
    "in the Software without restriction, including without limitation the rights",
    "to use, copy, modify, merge, publish, distribute, sublicense, and/or sell",
    "copies of the Software, and to permit persons to whom the Software is",
    "furnished to do so, subject to the following conditions:",
    "",
    "The above copyright notice and this permission notice shall be included in all",
    "copies or substantial portions of the Software.",
    "",
    'THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR',
    "IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,",
    "FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE",
    "AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER",
    "LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,",
    "OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE",
    "SOFTWARE.",
]

ISC = [
    "ISC License",
    "",
    "Copyright (c) <year> <copyright holders>",
    "",
    "Permission to use, copy, modify, and/or distribute this software for any",
    "purpose with or without fee is hereby granted, provided that the above",
    "copyright notice and this permission notice appear in all copies.",
    "",
    'THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH',
    "REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY",
    "AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,",
    "INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM",
    "LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR",
    "OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR",
    "PERFORMANCE OF THIS SOFTWARE.",
]

CATALOG = {
    "the standard MIT License": MIT,
    "the standard MIT License text": MIT,
    "the standard ISC License": ISC,
    "the standard ISC License text": ISC,
}


def split_lines(s):
    eol = "\r\n" if "\r\n" in s else "\n"
    if s == "":
        return [], eol, False
    parts = s.split(eol)
    final = len(parts) > 1 and parts[-1] == ""
    return (parts[:-1] if final else parts), eol, final


def parse_single_edit(contract):
    """`Line 3 is "Copyright (c) ...".` — the short notation clause."""
    m = re.search(r'Line (\d+) is "((?:[^"\\]|\\.)*)"\s*\.', contract)
    if not m:
        return None
    text = bytes(m.group(2), "utf-8").decode("unicode_escape")
    return [(int(m.group(1)), text)]


def parse_patch(contract):
    """`Edits (split on ";"): 3=X;12=Y. n=text sets line n ...`"""
    m = re.search(r'Edits \(split on "(.)"\): (.*?)\.\s+(?:n=text|Expand|For each)', contract, re.S)
    if not m:
        return None
    delim, body = m.group(1), m.group(2)
    out = []
    for part in body.split(delim):
        mm = re.match(r"^(\d+)=(.*)$", part, re.S)
        if not mm:
            return None
        out.append((int(mm.group(1)), mm.group(2)))
    return out


def decode_parametric(message):
    contract, _, wire = message.partition("\n")
    title = None
    for k in CATALOG:
        if k in contract:
            title = k
            break
    if title is None:
        return None
    # truncation: "first N lines only" / "its first N lines"
    trunc = re.search(r"(?:first|its first) (\d+) lines", contract)
    tpl = CATALOG[title]
    if trunc:
        tpl = tpl[: int(trunc.group(1))]
    edits = parse_single_edit(contract) or parse_patch(contract) or []
    lines = list(tpl)
    for n, text in edits:
        if n < 1 or n > len(lines):
            return None
        lines[n - 1] = text
    # residual: wire holds the non-canonical part (empty on the shipped lanes)
    residual, eol, _ = split_lines(wire)
    if residual:
        # A non-empty residual needs the inner chain decoder; refuse it here.
        return None
    return "\n".join(lines) + "\n"


def decode_selfcanon(message):
    contract, _, wire = message.partition("\n")
    lines, eol, final = split_lines(wire)
    dm = re.search(r"split on '(.)'", contract)
    if not dm:
        return None
    delim = dm.group(1)
    out = []
    for line in lines:
        m = re.match(r"^⟦(\d+)-(\d+)\|(.*)⟧$", line, re.S)
        if not m:
            out.append(line)
            continue
        a, b, patch = int(m.group(1)), int(m.group(2)), m.group(3)
        if a < 1 or b < a or b > len(lines):
            return None
        anchor = lines[a - 1 : b]
        for part in (patch.split(delim) if patch else []):
            mm = re.match(r"^(\d+)=(.*)$", part, re.S)
            if not mm:
                return None
            n, text = int(mm.group(1)), mm.group(2)
            if n < 1 or n > len(anchor):
                return None
            anchor[n - 1] = text
        out.extend(anchor)
    return eol.join(out) + (eol if final else "")


def main():
    rec = os.path.join(ROOT, "bench", "x44", "receipts")
    with open(os.path.join(rec, "messages.json"), encoding="utf8") as f:
        messages = json.load(f)
    with open(os.path.join(rec, "verify.jsonl"), encoding="utf8") as f:
        rows = [json.loads(l) for l in f if l.strip()]
    by_lane = {r["lane"]: r for r in rows}
    ok = bad = 0
    for m in messages:
        lane = m["lane"]
        row = by_lane.get(lane)
        if not row:
            print("NO ROW", lane)
            bad += 1
            continue
        src = open(os.path.join(ROOT, row["path"]), encoding="utf8", newline="").read()
        # normalise CRLF in the comparison only (shipped lanes are LF)
        d = decode_parametric(m["message"])
        if d is None:
            d = decode_selfcanon(m["message"])
        if d == src:
            print(f"EXACT  {lane:<34} M={m['M']:>5}  arm=parametric/selfcanon")
            ok += 1
        else:
            print(f"FAIL   {lane:<34} decoded={None if d is None else len(d)} src={len(src)}")
            if d is not None:
                for i, (x, y) in enumerate(zip(d.split("\n"), src.split("\n"))):
                    if x != y:
                        print(f"       first mismatch line {i+1}: {x!r} != {y!r}")
                        break
            bad += 1
    print(f"\nCPython independent reader: {ok} exact, {bad} failed, {len(messages)} messages")
    return 1 if bad else 0


if __name__ == "__main__":
    sys.exit(main())
