#!/usr/bin/env python3
"""
bench/episteme_decode.py
=============================================================================
Independent CPython 3 reference decoder for EPISTEME-Ω.
Decodes wire text from tail instructions and inline dictionaries without
importing any TypeScript files.
=============================================================================
"""

import sys
import re

EPISTEME_INLINE_START = "«EPISTEME»\n"
EPISTEME_INLINE_END = "\n«END»"

def decode_episteme_inline(wire: str) -> str:
    if not (wire.startswith(EPISTEME_INLINE_START) and wire.endswith(EPISTEME_INLINE_END)):
        return wire
    inner = wire[len(EPISTEME_INLINE_START):-len(EPISTEME_INLINE_END)]
    m = re.match(r"^\[DICT\]\n([\s\S]*?)\n\[BODY\]\n([\s\S]*)$", inner)
    if not m:
        return inner
    dict_text, body_text = m.group(1), m.group(2)
    meta_map = {}
    for line in dict_text.split("\n"):
        if "=" in line:
            k, v = line.split("=", 1)
            meta_map[k] = v
    
    out = []
    for ch in body_text:
        out.append(meta_map.get(ch, ch))
    return "".join(out)

def decode_episteme_typography(wire: str) -> str:
    def replace_bracket(m):
        body = m.group(1)
        body = re.sub(r"\bSection IV\b", "Section \u2163", body)
        body = re.sub(r"\bSection III\b", "Section \u2162", body)
        body = re.sub(r"\bSection II\b", "Section \u2161", body)
        body = re.sub(r"\bSection I\b", "Section \u2160", body)
        body = body.replace("ffi", "\uFB03")
        body = body.replace("ffl", "\uFB04")
        body = body.replace("ff", "\uFB00")
        body = body.replace("fi", "\uFB01")
        body = body.replace("fl", "\uFB02")
        return body
        
    return re.sub(r"●([^○]*)○", replace_bracket, wire)

def decode_episteme(wire: str) -> str:
    if wire.startswith(EPISTEME_INLINE_START):
        return decode_episteme_inline(wire)
    if "●" in wire:
        return decode_episteme_typography(wire)
    return wire

def main():
    if len(sys.argv) > 1:
        with open(sys.argv[1], "r", encoding="utf-8") as f:
            wire = f.read()
    else:
        wire = sys.stdin.read()
    sys.stdout.write(decode_episteme(wire))

if __name__ == "__main__":
    main()
