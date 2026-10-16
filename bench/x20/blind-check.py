#!/usr/bin/env python3
"""X20: compare a hand/LLM decode against the original text (trailing newlines ignored)."""
import sys
a = open("bench/x20/blind/%s.got" % sys.argv[1], encoding="utf-8").read().rstrip("\n")
b = open("bench/x20/blind/%s.want" % sys.argv[1], encoding="utf-8").read().rstrip("\n")
if a == b:
    print("%s: byte-identical, %d chars, %d lines" % (sys.argv[1], len(b), len(b.split("\n"))))
else:
    gl, wl = a.split("\n"), b.split("\n")
    print("%s: DIFFERS (%d lines vs %d)" % (sys.argv[1], len(gl), len(wl)))
    for i in range(min(len(gl), len(wl))):
        if gl[i] != wl[i]:
            print("  first diff at line %d\n   got : %r\n   want: %r" % (i, gl[i][:120], wl[i][:120]))
            break
    sys.exit(1)
