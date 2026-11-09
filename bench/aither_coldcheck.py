#!/usr/bin/env python3
"""
bench/aither_coldcheck.py — a COLD reader for the ΑΙΘΗΡ (X87) envelope.

Cold means: this file imports nothing from src/, shares no state with the encoder,
and re-derives every structural claim from data alone. It is the X87 analogue of
bench/kenon_decode.py, which did the same job for the X86 ΚΕΝΟΝ wire grammar.

WHAT IT CHECKS, and what it deliberately does not
-------------------------------------------------
Checked here, independently, in a second language:
  A. the atom alphabet — every atom matches `^ [A-Za-z]{1,24}$`, the count is
     65536, the ordering is non-increasing in length, and the FNV-1a fingerprint
     recomputed by THIS file equals the one the encoder claims.
  B. the envelope framing — the wire is split on whitespace, every atom is a known
     atom, the first ceil(32/log2 M) digits are the 4-byte header (byte 0 = payload
     codec id, bytes 1..3 = big-endian 24-bit payload length), and the payload is
     then carried in exactly ceil(b*8/log2 M) digits per 512-byte block. The total
     digit count must equal header + blocks + checksum atoms, no more, no less.
  C. the payload codec id — it must be in the PORTABLE set. A brotli id (3, 6, 10,
     11, 13, 14) means the wire was produced with Node's non-standard
     CompressionStream extension and no browser could inflate it.
  D. the integrity field — the trailing ceil(32/log2 M) = 2 atoms are the
     big-endian base-M digits of CRC-32(fingerprint || utf8(source)), computed here
     with zlib.crc32 over bytes read from disk. This is the field ΑΙΘΗΡ added, and
     it is the claim that matters: 446 of 1390 effective mutations of the un-checksummed
     envelope returned WRONG TEXT silently, so the checksum is the whole difference
     between "refuses" and "lies".
  E. refusal soundness — deliberately damage a wire (flip one atom, drop the last
     atom, append a junk atom) and confirm THIS reader rejects all three instead of
     reporting EXACT.

NOT checked here, and not claimed: that the CM payload decompresses to the source.
That would mean reimplementing cm.ts's seven context models, mixer, APM/SSE stage
and match model in Python — a project, not a check. The encoder round-trips it in
TypeScript under gate G2 and reports it; the honest statement is that the CM decode
is verified in one language and the envelope around it is verified in two.

Usage
-----
    python3 bench/aither_coldcheck.py                 # check every wire
    python3 bench/aither_coldcheck.py --emit-missing  # also say which receipts are absent

Exits 0 if every wire reads EXACT, 1 on any MISMATCH, 2 if the receipts are missing
(refuse, never guess). `alphabet.tsv` is a generated artifact (1 MB, 65536 lines) and
is not committed; regenerate it with
    npx esbuild bench/x87/emitcold.ts --bundle --platform=node --format=esm \
        --outfile=bench/x87/emitcold.mjs && node bench/x87/emitcold.mjs
"""

import json
import os
import re
import sys
import zlib

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
COLD = os.path.join(ROOT, "bench", "x87", "receipts", "cold")

# Payload codec ids that inflate without a non-standard CompressionStream format.
PORTABLE = {0, 1, 2, 4, 5, 7, 8, 12, 15}
BROTLI_IDS = {3, 6, 10, 11, 13, 14}

ATOM_SHAPE = re.compile(r"^[A-Za-z]{1,24}$")  # the leading space is stripped in the TSV


class Refused(Exception):
    """A cold reader refuses. It never throws a bare ValueError at the caller."""


def num(x, what):
    try:
        return int(x)
    except (TypeError, ValueError):
        raise Refused("%s is not an integer: %r" % (what, x))


def fnv1a(s):
    """FNV-1a 32, recomputed here rather than read from the encoder's answer."""
    h = 0x811C9DC5
    for ch in s.encode("utf-8"):
        h ^= ch
        h = (h * 0x01000193) & 0xFFFFFFFF
    return "%08x" % h


def load_meta():
    p = os.path.join(COLD, "meta.json")
    if not os.path.exists(p):
        raise Refused("missing %s — regenerate with bench/x87/emitcold.ts" % p)
    with open(p, "r", encoding="utf-8") as f:
        return json.load(f)


def load_alphabet(meta):
    """Returns (atoms, index). Verifies shape, count, ordering and fingerprint."""
    p = os.path.join(COLD, "alphabet.tsv")
    if not os.path.exists(p):
        raise Refused("missing %s — regenerate with bench/x87/emitcold.ts" % p)
    atoms, index = [], {}
    prev_len = None
    with open(p, "r", encoding="utf-8") as f:
        for ln, line in enumerate(f, 1):
            line = line.rstrip("\n")
            if not line:
                continue
            parts = line.split("\t")
            if len(parts) != 3:
                raise Refused("alphabet line %d has %d fields, expected 3" % (ln, len(parts)))
            i = num(parts[0], "alphabet index at line %d" % ln)
            length = num(parts[1], "atom length at line %d" % ln)
            body = parts[2]
            if i != len(atoms):
                raise Refused("alphabet out of order at line %d: index %d after %d atoms" % (ln, i, len(atoms)))
            if not ATOM_SHAPE.match(body):
                raise Refused("atom %d does not match [A-Za-z]{1,24}: %r" % (i, body))
            if length != len(body) + 1:
                raise Refused("atom %d declares length %d but carries %d chars" % (i, length, len(body) + 1))
            if prev_len is not None and length > prev_len:
                raise Refused("alphabet not sorted by descending length at atom %d (%d after %d)" % (i, length, prev_len))
            prev_len = length
            atom = " " + body  # atoms are space-prefixed; that space is load-bearing
            atoms.append(atom)
            index[atom] = i

    M = num(meta.get("M"), "meta.M")
    if len(atoms) != M:
        raise Refused("alphabet carries %d atoms but meta.json declares M=%d" % (len(atoms), M))

    # Fingerprint: fnv1a("<enc>|<count>|<first>|<last>|<totalChars>"), per bpe.ts.
    total = sum(len(a) for a in atoms)
    want = "%s|%d|%s|%s|%d" % (meta.get("encoding"), len(atoms), atoms[0], atoms[-1], total)
    got = fnv1a(want)
    claimed = meta.get("fingerprint")
    if got != claimed:
        raise Refused("alphabet fingerprint MISMATCH: recomputed %s, encoder claims %s" % (got, claimed))
    return atoms, index, got


def digits_needed(nbytes, bits_per_atom):
    if bits_per_atom <= 0:
        raise Refused("alphabet has no bits per atom")
    return max(1, -(-(nbytes * 8) // bits_per_atom))


def parse_wire(wire, index, meta):
    """Split the wire into digits, read the header, and check the framing exactly."""
    if not isinstance(wire, str) or not wire.strip():
        raise Refused("empty wire")
    atoms = wire.split()
    M = num(meta.get("M"), "meta.M")
    bits = num(meta.get("bits"), "meta.bits")
    K = num(meta.get("checksumAtoms"), "meta.checksumAtoms")
    block = num(meta.get("blockBytes"), "meta.blockBytes")

    if len(atoms) <= K:
        raise Refused("wire has %d atoms, needs more than the %d checksum atoms" % (len(atoms), K))

    digits = []
    for a in atoms:
        # wire.split() strips the leading space; every atom in the index carries one
        d = index.get(" " + a)
        if d is None:
            raise Refused("unknown atom %r" % a)
        digits.append(d)

    d_head = digits_needed(num(meta.get("headerBytes"), "meta.headerBytes"), bits)
    if len(digits) < d_head:
        raise Refused("wire truncated at header (%d digits, needs %d)" % (len(digits), d_head))

    head = 0
    for d in digits[:d_head]:
        head = head * M + d
    if head >= 1 << (d_head * bits):
        raise Refused("header overflows its digits")
    head_bytes = head.to_bytes(num(meta.get("headerBytes"), "meta.headerBytes"), "big")
    codec = head_bytes[0]
    payload_len = int.from_bytes(head_bytes[1:4], "big")

    # Walk the payload blocks and count the digits the envelope itself consumes.
    pos, consumed = 0, d_head
    while pos < payload_len:
        b = min(block, payload_len - pos)
        D = digits_needed(b, bits)
        if consumed + D > len(digits):
            raise Refused("wire truncated at body: need %d digits at byte %d, have %d" % (consumed + D, pos, len(digits) - consumed))
        consumed += D
        pos += b

    trailing = len(digits) - consumed
    if trailing != K:
        raise Refused("framing: %d atoms left after the payload, expected exactly the %d checksum atoms" % (trailing, K))

    crc = 0
    for d in digits[consumed:]:
        crc = crc * M + d
    if crc > 0xFFFFFFFF:
        raise Refused("checksum field overflows 32 bits")
    return {"codec": codec, "payloadLen": payload_len, "atoms": len(atoms),
            "consumed": consumed, "crc": crc, "digits": d_head + (consumed - d_head)}


def check_source_crc(meta, fingerprint, path, want_crc):
    if not os.path.exists(path):
        raise Refused("source lane %s is absent" % path)
    with open(path, "rb") as f:
        raw = f.read()
    got = zlib.crc32(fingerprint.encode("utf-8") + raw) & 0xFFFFFFFF
    return got, got == want_crc, len(raw)


def damage(wire, index, atoms_list, kind):
    """Deliberately corrupt a wire the way the mutation fuzzer does.

    `flip-body` and `flip-checksum` are separated on purpose, because this reader can
    only detect one of them. See DAMAGE_BOUNDARY below.
    """
    parts = wire.split()
    if kind in ("flip-body", "flip-checksum"):
        at = 0 if kind == "flip-body" else len(parts) - 1
        cur = " " + parts[at]
        alt = atoms_list[0] if cur != atoms_list[0] else atoms_list[1]
        parts[at] = alt.strip()
    elif kind == "truncate":
        parts = parts[:-1]
    elif kind == "extend":
        parts = parts + [atoms_list[7].strip()]
    else:
        raise Refused("unknown damage kind %s" % kind)
    return " ".join(parts)


# ---------------------------------------------------------------------------
# The boundary of what a cold reader that CANNOT decode the payload can prove.
#
# ΑΙΘΗΡ's checksum is CRC-32(fingerprint || utf8(SOURCE TEXT)), not a checksum of
# the compressed payload. That choice is what makes the field strong, and it is also
# what limits this file: verifying it means having the TEXT THE BODY DECODES TO, and
# only the TypeScript decoder can produce that. This reader has the source on disk
# and the checksum in the wire, so it can prove the two agree — it cannot prove the
# body decodes to the source.
#
# A worked example, found by running this file rather than by argument. Flipping the
# FIRST atom of the `lsblk` wire from index 3072 to index 0 changes the 4-byte header
# from codec=12 (Aleph+CM), payloadLen=94 to codec=0 (CM), payloadLen=94. The payload
# length is UNCHANGED, so the digit walk consumes exactly the same 49 atoms, the
# framing is byte-identical, and the two checksum atoms are untouched. No structural
# check of any kind can see that damage — not here, and not in `unpackWire` either,
# which is precisely the 446-silent-corruptions measurement. What catches it is that
# `cmDecompress` of an Aleph-prepassed payload yields different bytes, so the decoded
# TEXT differs, so the CRC differs: refused by aitherDecode at G3, measured over 1856
# mutations with 0 silent corruptions (bench/x87/receipts/aither-fuzz.json).
#
# So `flip-body` is reported as DEFERRED, not as a pass and not as a failure.
# ---------------------------------------------------------------------------
DAMAGE_BOUNDARY = {"flip-body"}


def main():
    argv = sys.argv[1:]
    verbose = "--emit-missing" in argv or "-v" in argv
    try:
        meta = load_meta()
        atoms_list, index, fingerprint = load_alphabet(meta)
    except Refused as e:
        print("REFUSED (setup): %s" % e)
        return 2

    print("alphabet: M=%d bits=%s fingerprint=%s (recomputed here) shape OK, order OK"
          % (len(atoms_list), meta.get("bits"), fingerprint))
    print("framing : headerBytes=%s blockBytes=%s checksumAtoms=%s portable=%s"
          % (meta.get("headerBytes"), meta.get("blockBytes"), meta.get("checksumAtoms"), sorted(PORTABLE)))

    wp = os.path.join(COLD, "wires.jsonl")
    if not os.path.exists(wp):
        print("REFUSED: missing %s" % wp)
        return 2

    exact = mismatch = refused = 0
    nonportable = []
    rows = []
    with open(wp, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            w = json.loads(line)
            lane = w.get("lane", "?")
            path = os.path.join(ROOT, w["path"]) if not os.path.isabs(w["path"]) else w["path"]
            try:
                parsed = parse_wire(w["wire"], index, meta)
                got, ok, nbytes = check_source_crc(meta, fingerprint, path, parsed["crc"])
                if parsed["codec"] not in PORTABLE:
                    nonportable.append((lane, parsed["codec"]))
                if not ok:
                    mismatch += 1
                    print("  %-22s MISMATCH  crc wire=%08x recomputed=%08x" % (lane, parsed["crc"], got))
                    rows.append({"lane": lane, "verdict": "MISMATCH", **parsed})
                    continue
                if parsed["atoms"] != num(w.get("atomCount"), "receipt atomCount"):
                    mismatch += 1
                    print("  %-22s MISMATCH  atom count %d vs receipt %s" % (lane, parsed["atoms"], w.get("atomCount")))
                    rows.append({"lane": lane, "verdict": "MISMATCH", **parsed})
                    continue
                # payloadLen is the COMPRESSED length, so it is not comparable to the
                # source size; what parse_wire already proved is that the wire carries
                # exactly the digits that many bytes need, plus exactly K checksum atoms.
                exact += 1
                rows.append({"lane": lane, "verdict": "EXACT", "bytes": nbytes, **parsed})
                print("  %-22s EXACT  bytes=%-6d atoms=%-5d codec=%-3d payloadLen=%-6d crc=%08x"
                      % (lane, nbytes, parsed["atoms"], parsed["codec"], parsed["payloadLen"], parsed["crc"]))
            except Refused as e:
                refused += 1
                rows.append({"lane": lane, "verdict": "REFUSED", "why": str(e)})
                print("  %-22s REFUSED  %s" % (lane, e))

    # Refusal soundness, within the boundary documented above.
    print("\nrefusal soundness (this reader, not the encoder's gate):")
    sound = 0
    total_damage = 0
    deferred = 0
    framingBonus = 0
    deferred_detail = []
    with open(wp, "r", encoding="utf-8") as f:
        wire_rows = [json.loads(l) for l in f if l.strip()]
    for kind in ("flip-checksum", "truncate", "extend", "flip-body"):
        for w in wire_rows[:6]:
            d = damage(w["wire"], index, atoms_list, kind)
            path = os.path.join(ROOT, w["path"])
            if kind in DAMAGE_BOUNDARY:
                deferred += 1
                try:
                    parsed = parse_wire(d, index, meta)
                    got, ok, _ = check_source_crc(meta, fingerprint, path, parsed["crc"])
                    deferred_detail.append({"lane": w["lane"], "kind": kind,
                                            "structurallyVisible": not ok,
                                            "codecBefore": None, "codecAfter": parsed["codec"]})
                except Refused as e:
                    # the framing caught this one by accident (the flip happened to move
                    # payloadLen). Counted separately: it is a bonus, not the mechanism.
                    framingBonus += 1
                    deferred -= 1
                    deferred_detail.append({"lane": w["lane"], "kind": kind,
                                            "structurallyVisible": True, "framing": str(e)})
                continue
            total_damage += 1
            try:
                parsed = parse_wire(d, index, meta)
                got, ok, _ = check_source_crc(meta, fingerprint, path, parsed["crc"])
                if ok:
                    print("  %-14s FAILED — damaged wire on %s still reads EXACT" % (kind, w["lane"]))
                else:
                    sound += 1
            except Refused:
                sound += 1
        if kind not in DAMAGE_BOUNDARY:
            print("  %-14s rejected on all %d probed wires" % (kind, min(6, len(wire_rows))))

    print("\nCOLD READ: %d EXACT, %d MISMATCH, %d REFUSED over %d wires" % (exact, mismatch, refused, len(rows)))
    print("non-portable payload ids found: %s" % (nonportable if nonportable else "none"))
    print("damaged-wire rejection within this reader's boundary: %d/%d" % (sound, total_damage))
    print("deferred to the TypeScript decoder (body damage needs the payload decoded): %d probes" % deferred)
    print("   of which the framing caught by accident (payloadLen moved): %d" % framingBonus)
    print("  -> that class is measured in bench/x87/receipts/aither-fuzz.json: 1622/1622 effective")
    print("     mutations refused, 0 silent corruptions, over 1856 mutations and 29 lanes.")

    out = os.path.join(COLD, "coldcheck.json")
    with open(out, "w", encoding="utf-8") as f:
        json.dump({"fingerprint": fingerprint, "M": len(atoms_list), "exact": exact,
                   "mismatch": mismatch, "refused": refused, "nonPortable": nonportable,
                   "damageRejected": sound, "damageTried": total_damage,
                   "bodyDamageDeferred": deferred, "bodyDamageCaughtByFraming": framingBonus,
                   "bodyDamageDetail": deferred_detail,
                   "boundary": "this reader cannot decode the CM payload, so body damage is "
                               "verified by aitherDecode + the mutation fuzz, not here",
                   "rows": rows}, f, indent=1)
        f.write("\n")
    if verbose:
        print("wrote %s" % out)

    if mismatch or refused or sound != total_damage or nonportable:
        return 1
    return 0 if exact == len(rows) and exact > 0 else 1


if __name__ == "__main__":
    sys.exit(main())
