#!/usr/bin/env python3
"""X20: run the independent CPython reader on dumped ANADESMOS wires and diff against the input.
Usage: python3 bench/x20/xcheck.py wires.json"""
import json, sys, difflib
sys.path.insert(0, "bench/x20")
from anadesmos_decode import decode, parse_note, undo

cases = json.load(open(sys.argv[1], encoding="utf-8"))
ok = fail = notetouched = 0
for c in cases:
    if c.get("layer") == "note":
        note, _, body = c["wire"].partition("\n")
        p = parse_note(note)
        got = None if p is None else undo(body, p)
    else:
        got = decode(c["wire"])
    if got == c["input"]:
        ok += 1
    else:
        fail += 1
        print("FAIL %s layer=%s applied=%s got=%s" % (c["name"], c.get("layer"), c["applied"], "None" if got is None else "%d chars vs %d" % (len(got), len(c["input"]))))
        if got is not None:
            for line in list(difflib.unified_diff(c["input"].split("\n"), got.split("\n"), lineterm="", n=0))[:8]:
                print("   ", line[:160])
    if not c["wire"].startswith("@raw"):
        notetouched += 1
print("xcheck: %d/%d exact through the CPython reader (%d of them carried a note line)" % (ok, len(cases), notetouched))
sys.exit(0 if fail == 0 else 1)
