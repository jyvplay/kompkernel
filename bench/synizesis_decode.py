#!/usr/bin/env python3
"""
bench/synizesis_decode.py
=============================================================================
INDEPENDENT SYNIZESIS DECODER — written from the CONTRACT PROSE, not from the
TypeScript source.  Its only job is to be a second, differently-implemented
witness that the wire is decodable by a reader who was handed nothing but the
wire and the contract sentence.

The contract the encoder ships is:

    "Above ⇒: symbol + pattern. Below: symbol + chars fill its # marks in
     order. Print restored text."
    [+ " A pattern with no symbol applies to every digit run of that many
        digits."]
    [+ " After ≈, g-p mean 0-9."]

Everything below is a literal transcription of those three sentences.

Usage:
    python3 bench/synizesis_decode.py WIRE_FILE            > out.txt
    python3 bench/synizesis_decode.py WIRE_FILE --check SRC
    python3 bench/synizesis_decode.py --selftest
=============================================================================
"""
import sys

SEP = "\u21d2"      # ⇒
SLOT = "#"
HEX = "\u2248"      # ≈
HEXMAP = "ghijklmnop"

ALNUM = set("0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ")
DIGIT = set("0123456789")
# characters a pattern may legitimately begin with (i.e. it has no symbol)
PATTERN_START = set(SLOT) | ALNUM | set("-._:/,+@|~^!?&%$*=<>()[]{}'\"\\;")


def _split(wire):
    """legend above the lone ⇒ line, body below it"""
    marker = "\n" + SEP + "\n"
    if wire.startswith(SEP + "\n"):
        return "", wire[len(SEP) + 1:]
    i = wire.find(marker)
    if i < 0:
        return None, wire
    return wire[:i], wire[i + len(marker):]


def decode(wire):
    head, body = _split(wire)
    if head is None:
        return wire

    by_symbol = {}     # symbol -> pattern
    by_length = {}     # digit-run length -> pattern
    hex_on = False
    for line in head.split("\n"):
        if not line:
            continue
        if line[0] == HEX:
            hex_on = True
            continue
        if line[0] in PATTERN_START:
            n = line.count(SLOT)
            if n and n not in by_length:
                by_length[n] = line
            continue
        by_symbol[line[0]] = line[1:]

    def fill(pattern, payload):
        out, k = [], 0
        for c in pattern:
            if c == SLOT:
                out.append(payload[k]); k += 1
            else:
                out.append(c)
        return "".join(out)

    out = []
    i, n = 0, len(body)
    while i < n:
        c = body[i]

        if hex_on and c == HEX:
            j = i + 1
            while j < n and "a" <= body[j] <= "p":
                j += 1
            out.append("".join(str(HEXMAP.index(x)) if x in HEXMAP else x
                               for x in body[i + 1:j]))
            i = j
            continue

        if c in by_symbol:
            pat = by_symbol[c]
            need = pat.count(SLOT)
            j, got = i + 1, 0
            while j < n and got < need and body[j] in ALNUM:
                got += 1; j += 1
            if got == need:
                out.append(fill(pat, body[i + 1:j]))
                i = j
                continue

        if by_length and c in DIGIT and (i == 0 or body[i - 1] not in DIGIT):
            j = i
            while j < n and body[j] in DIGIT:
                j += 1
            pat = by_length.get(j - i)
            out.append(fill(pat, body[i:j]) if pat is not None else body[i:j])
            i = j
            continue

        out.append(c)
        i += 1
    return "".join(out)


def _selftest():
    wire = ("\u25c6####-##-##T##:##:##.###Z\n"
            "##########\n"
            + SEP + "\n"
            "\u25c620260910083456789 start 1234567890 end\n")
    got = decode(wire)
    want = "2026-09-10T08:34:56.789Z start 1234567890 end\n"
    # the bare pattern "##########" has ten # marks, so the ten-digit run is
    # expanded by it; with an identity pattern the text is unchanged
    assert got == want, (got, want)
    print("selftest ok")


if __name__ == "__main__":
    if "--selftest" in sys.argv:
        _selftest()
        raise SystemExit(0)
    if len(sys.argv) < 2:
        print(__doc__); raise SystemExit(2)
    with open(sys.argv[1], "r", encoding="utf-8", newline="") as fh:
        wire = fh.read()
    out = decode(wire)
    if "--check" in sys.argv:
        src_path = sys.argv[sys.argv.index("--check") + 1]
        with open(src_path, "r", encoding="utf-8", newline="") as fh:
            src = fh.read()
        if out == src:
            print("EXACT")
            raise SystemExit(0)
        print("MISMATCH len(out)=%d len(src)=%d" % (len(out), len(src)))
        for k in range(min(len(out), len(src))):
            if out[k] != src[k]:
                print("first diff at %d: %r vs %r" % (k, src[k - 40:k + 40], out[k - 40:k + 40]))
                break
        raise SystemExit(1)
    sys.stdout.write(out)
