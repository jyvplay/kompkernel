#!/usr/bin/env python3
"""X117 COLD READ — independent CPython reader for the ΣΥΝΘΕΣΙΣ fused key.

Given only `fused key LF body`, where BODY is the parent-decoded (pre-frontier)
rewrite, recover the source byte for byte. Shares no code with the TypeScript
encoder/decoder. The contract grammar is read as printed:

  Body first. f<J>=f<I>+text after <M> (1-based); ^Tnnnn␠→T+chmod; λ=#bytes after ->. crc=<8 hex>

Inverse order is the clause order:
  1. ΣΥΜΦΥΊΑ tail template: in field J, replace marker+tail with field I + tail.
     CRC-32 of the resulting pre-body must equal the printed crc.
  2. ΕΝΑΛΛΑΓΗ: line-start Tnnnn before a space is file type T plus octal chmod
     nnnn; expand to the 10-character symbolic ls -l mode.
  3. ΜΗΚΟΣ: on a line containing ` -> `, a prefix λ is the UTF-8 byte count of
     the target after the arrow.

The shipped one-chat message additionally carries the parent frontier's own
contract/tape; that layer is decoded by the existing frontier cold checks. This
file tests the fused source-relative layer, exactly as bench/x90/coldread.py
tests the X90 layer.
"""
import hashlib
import json
import os
import re
import sys
import zlib

WS = re.compile(r"\s")
KEY = re.compile(
    r"^Body first\. f(\d+)=f(\d+)\+text after (.) \(1-based\); "
    r"\^Tnnnn␠→T\+chmod; λ=#bytes after ->\. crc=([0-9a-f]{8})$"
)
OCT = re.compile(r"^([dlcbps-])([0-7]{4})(?= )", re.M)


def fields(line):
    out = []
    n = len(line)
    k = 0
    while k < n:
        while k < n and WS.match(line[k]):
            k += 1
        if k >= n:
            break
        s = k
        while k < n and not WS.match(line[k]):
            k += 1
        out.append((line[s:k], s, k))
    return out


def parse_key(line):
    m = KEY.match(line)
    if not m:
        raise ValueError("not a canonical X117 fused key")
    j, i, marker, crc = int(m.group(1)), int(m.group(2)), m.group(3), m.group(4)
    if j < 1 or i < 1:
        raise ValueError("field numbers must be 1-based positive")
    if len(marker) != 1:
        raise ValueError("marker must be one character")
    return j, i, marker, crc


def expand_template(body, j, i, marker):
    out = []
    for line in body.split("\n"):
        if marker not in line:
            out.append(line)
            continue
        f = fields(line)
        pieces = []
        at = 0
        for k, (text, s, e) in enumerate(f):
            pieces.append(line[at:s])
            at = e
            m = text.find(marker)
            if m < 0:
                pieces.append(text)
                continue
            if k + 1 != j:
                raise ValueError("marker in field %d, rule rebuilds f%d" % (k + 1, j))
            if i - 1 >= len(f):
                raise ValueError("rule reads f%d, line has %d fields" % (i, len(f)))
            if m != 0:
                raise ValueError("tail form expects nothing before the marker")
            src = f[i - 1][0]
            tail = text[m + len(marker):]
            pieces.append(src + tail)
        pieces.append(line[at:])
        out.append("".join(pieces))
    return "\n".join(out)


def octal_to_symbolic(t, d):
    sp = int(d[0])
    out = t
    for k in range(3):
        v = int(d[k + 1])
        out += "r" if v & 4 else "-"
        out += "w" if v & 2 else "-"
        x = (v & 1) != 0
        if k == 0 and (sp & 4):
            out += "s" if x else "S"
        elif k == 1 and (sp & 2):
            out += "s" if x else "S"
        elif k == 2 and (sp & 1):
            out += "t" if x else "T"
        else:
            out += "x" if x else "-"
    return out


def expand_mode(pre):
    return OCT.sub(lambda m: octal_to_symbolic(m.group(1), m.group(2)), pre)


def expand_measure(pre):
    out = []
    for line in pre.split("\n"):
        a = line.find(" -> ")
        if a < 0:
            out.append(line)
            continue
        target = line[a + 4:]
        prefix = line[:a]
        at = prefix.find("λ")
        if at < 0:
            out.append(line)
            continue
        if prefix.find("λ", at + 1) >= 0:
            raise ValueError("more than one λ in a prefix")
        out.append(prefix[:at] + str(len(target.encode("utf-8"))) + prefix[at + 1:] + line[a:])
    return "\n".join(out)


def decode(text):
    nl = text.find("\n")
    if nl < 0:
        raise ValueError("message has no body")
    key, body = text[:nl], text[nl + 1:]
    j, i, marker, crc = parse_key(key)
    pre = expand_template(body, j, i, marker)
    got = "%08x" % (zlib.crc32(pre.encode("utf-8")) & 0xFFFFFFFF)
    if got != crc:
        raise ValueError("CRC MISMATCH: key says %s, template reconstruction gives %s" % (crc, got))
    source = expand_measure(expand_mode(pre))
    return source, pre, (j, i, marker, crc)


def main():
    paths = []
    for arg in sys.argv[1:]:
        if os.path.isdir(arg):
            paths += sorted(os.path.join(arg, f) for f in os.listdir(arg) if f.endswith(".syn.txt"))
        else:
            paths.append(arg)
    if not paths:
        print("usage: coldread.py <dir-or-file.syn.txt> [...]", file=sys.stderr)
        return 2
    manifest = {}
    for p in paths:
        mp = os.path.join(os.path.dirname(p), "manifest.json")
        if os.path.exists(mp):
            for a in json.load(open(mp))["artifacts"]:
                manifest[os.path.basename(a["artifact"])] = a
    exact = wrong = 0
    for p in paths:
        name = os.path.basename(p)
        try:
            source, pre, parts = decode(open(p, encoding="utf-8").read())
        except Exception as exc:
            print("REFUSED %-24s %s" % (name, exc))
            wrong += 1
            continue
        sha = hashlib.sha256(source.encode("utf-8")).hexdigest()
        man = manifest.get(name)
        graded = ""
        if man:
            ok = man["sourceSha256"] == sha
            graded = "  SHA-256 %s" % ("MATCHES the original file" if ok else "DOES NOT MATCH")
            if ok:
                exact += 1
            else:
                wrong += 1
        else:
            exact += 1
        print("EXACT   %-24s %d bytes  crc32 %s verified  f%d<-f%d marker %s%s"
              % (name, len(source.encode("utf-8")), parts[3], parts[0], parts[1], parts[2], graded))
    print("\n=== X117 COLD READ, %d artifacts ===" % len(paths))
    print("reconstructed and self-certified by CRC: %d   wrong or refused: %d" % (exact, wrong))
    print("COLD READ %s" % ("EXACT" if wrong == 0 and exact == len(paths) else "FAILED"))
    return 0 if wrong == 0 and exact == len(paths) else 1


if __name__ == "__main__":
    sys.exit(main())
