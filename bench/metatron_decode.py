#!/usr/bin/env python3
"""
bench/metatron_decode.py
=============================================================================
Independent CPython 3 reference decoder for METATRON-Ω.
Decodes wire text from tail instructions, markdown structures, ligatures,
and inline dictionaries without importing any TypeScript files.
=============================================================================
"""

import sys
import re

METATRON_INLINE_START = "«METATRON»\n"
METATRON_INLINE_END = "\n«END»"

def decode_metatron_inline(wire: str) -> str:
    if not (wire.startswith(METATRON_INLINE_START) and wire.endswith(METATRON_INLINE_END)):
        return wire
    inner = wire[len(METATRON_INLINE_START):-len(METATRON_INLINE_END)]
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

def decode_metatron_structure(wire: str) -> str:
    res = wire
    res = res.replace("⚡rs\n", "```rust\n")
    res = res.replace("⚡sh\n", "```bash\n")
    res = res.replace("⚡json\n", "```json\n")
    res = res.replace("⚡js\n", "```javascript\n")
    res = res.replace("⚡py\n", "```python\n")
    res = res.replace("⚡ts\n", "```typescript\n")
    res = re.sub(r"^⊟3$", "| --- | --- | --- |", res, flags=re.MULTILINE)
    res = re.sub(r"^⊞3$", "| :--- | :--- | :--- |", res, flags=re.MULTILINE)
    res = re.sub(r"^⊟4$", "| --- | --- | --- | --- |", res, flags=re.MULTILINE)
    res = re.sub(r"^⊞4$", "| :--- | :--- | :--- | :--- |", res, flags=re.MULTILINE)
    res = re.sub(r"^☐ ", "- [ ] ", res, flags=re.MULTILINE)
    res = re.sub(r"^☑ ", "- [x] ", res, flags=re.MULTILINE)
    res = re.sub(r"^◉", "#### ", res, flags=re.MULTILINE)
    res = re.sub(r"^◇", "## ", res, flags=re.MULTILINE)
    res = re.sub(r"^◈", "### ", res, flags=re.MULTILINE)
    return res

def decode_metatron_typography(wire: str) -> str:
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

def decode_metatron(wire: str) -> str:
    if wire.startswith(METATRON_INLINE_START):
        in_dec = decode_metatron_inline(wire)
        return decode_metatron_structure(in_dec)
    
    res = wire
    if "◈" in res or "☑" in res or "⊞" in res or "⚡" in res:
        res = decode_metatron_structure(res)
    if "●" in res:
        res = decode_metatron_typography(res)
    return res

def main():
    if len(sys.argv) > 1:
        with open(sys.argv[1], "r", encoding="utf-8") as f:
            wire = f.read()
    else:
        wire = sys.stdin.read()
    sys.stdout.write(decode_metatron(wire))

if __name__ == "__main__":
    main()
