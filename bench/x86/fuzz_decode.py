#!/usr/bin/env python3
"""X86 red-team — mutate real ΚΕΝΟΝ messages and attack the cold CPython reader.

`bench/kenon_decode.py` is the reader a stranger would write from the message alone.
This script tries to make it (a) crash with an uncaught exception, (b) hang,
(c) silently accept a wire whose contract contradicts it, or (d) disagree with
itself on a repeat run. None of those may happen: a decoder that is not exact must
REFUSE, and refusal is a return code, not an exception.

Mutations: byte substitution / insertion / deletion anywhere in the message,
truncation, transposition of two header fields, edits to the anchor letter, the
anchor number, the codec letter, the run pattern, the eol flag and the marker —
plus one hand-built adversarial case: a wire that declares marker `§` while the
contract says `v*count`, which is exactly the mismatch ΚΕΝΟΝ's G5b forbids.

    python3 bench/x86/fuzz_decode.py [N]
"""
import glob
import os
import re
import random
import signal
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)) + "/../..")
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
import kenon_decode as K  # noqa: E402  (bench/kenon_decode.py)

ALPHABET = "0123456789LRTxrdwltkp¦⟨⟩sS*§%\n abcdefz.,-/:"


class Timeout(Exception):
    pass


def _alarm(signum, frame):
    raise Timeout()


def try_decode(msg):
    """Returns ('ok', text) | ('refused', reason) | ('crash', repr)."""
    try:
        return "ok", K.decode(msg)
    except K.Refused as e:
        return "refused", str(e)
    except Timeout:
        raise
    except Exception as e:  # noqa: BLE001 — an uncaught exception IS the finding
        return "crash", "%s: %s" % (type(e).__name__, e)


def mutations(msg, rng, n):
    for _ in range(n):
        kind = rng.randrange(9)
        i = rng.randrange(len(msg)) if msg else 0
        if kind == 0:                                     # substitute a byte
            yield msg[:i] + rng.choice(ALPHABET) + msg[i + 1:]
        elif kind == 1:                                   # delete a byte
            yield msg[:i] + msg[i + 1:]
        elif kind == 2:                                   # insert a byte
            yield msg[:i] + rng.choice(ALPHABET) + msg[i:]
        elif kind == 3:                                   # truncate
            yield msg[: max(1, i)]
        elif kind == 4:                                   # swap two characters
            j = rng.randrange(len(msg))
            a = list(msg)
            a[i], a[j] = a[j], a[i]
            yield "".join(a)
        elif kind == 5:                                   # swap two header fields
            head = msg.split("\n", 2)
            if len(head) < 2 or "¦" not in head[1]:
                yield msg
                continue
            f = head[1].split("¦")
            if len(f) < 3:
                yield msg
                continue
            a, b = rng.randrange(len(f)), rng.randrange(len(f))
            f[a], f[b] = f[b], f[a]
            head[1] = "¦".join(f)
            yield "\n".join(head)
        elif kind == 6:                                   # edit an anchor letter/number
            for pat, rep in (("L", "R"), ("R", "T"), ("T", "L")):
                if pat in msg:
                    yield msg.replace(pat, rep, 1)
            yield msg
        elif kind == 7:                                   # edit the run pattern
            j = msg.rfind("p")
            yield msg[:j] + "pL1R1L1" + msg[j + 1:] if j > 0 else msg
        else:                                             # edit eol flag / marker
            yield msg.replace("⟩¦s", "⟩¦S", 1).replace("⟩¦s", "⟩¦Z", 1)


def main(argv):
    n_per = int(argv[1]) if len(argv) > 1 else 120
    rng = random.Random(20260108)
    files = sorted(glob.glob("bench/x86/receipts/msg/*.msg.txt"))
    if not files:
        print("no messages: run bench/x86/dumpmsg.mjs first")
        return 2
    signal.signal(signal.SIGALRM, _alarm)
    counts = {"ok": 0, "refused": 0, "crash": 0}
    crashes, hangs, nondet = [], [], []
    total = 0
    t0 = time.time()
    for path in files:
        with open(path, encoding="utf-8", newline="") as f:
            msg = f.read()
        # the untouched message must decode, and must decode to the same thing twice
        signal.alarm(30)
        try:
            s1, v1 = try_decode(msg)
            s2, v2 = try_decode(msg)
        finally:
            signal.alarm(0)
        if s1 != "ok":
            crashes.append((path, "untouched message did not decode: %s %s" % (s1, v1)))
        elif v1 != v2:
            nondet.append(path)
        for mut in mutations(msg, rng, n_per):
            total += 1
            signal.alarm(10)
            try:
                st, val = try_decode(mut)
            except Timeout:
                hangs.append((path, mut[:120]))
                st, val = "hang", None
            finally:
                signal.alarm(0)
            if st == "crash":
                crashes.append((path, val, mut[:160]))
            elif st in counts:
                counts[st] += 1
            # determinism spot-check on a tenth of the mutations
            if total % 10 == 0 and st == "ok":
                signal.alarm(10)
                try:
                    st2, val2 = try_decode(mut)
                finally:
                    signal.alarm(0)
                if st2 != st or val2 != val:
                    nondet.append((path, total))

    # Hand-built adversarial case: a message whose contract names the run marker, with
    # the wire's declared marker changed underneath it. This is exactly the mismatch
    # G5b forbids, and the reader must refuse rather than pick one of the two.
    base = None
    for path in files:
        with open(path, encoding="utf-8", newline="") as f:
            cand = f.read()
        if re.search(r"v(.)count", cand.split("\n", 1)[0]):
            base, base_path = cand, path
            break
    if base is None:
        marker_guard = "UNTESTED(no dumped message uses run coding)"
    else:
        evil = base.replace("\u27e9\u00a6s", "\u27e9\u00a6s\u00a7", 1)
        st, val = try_decode(evil)
        marker_guard = ("PASS(%s)" % base_path.split("/")[-1]) if st == "refused" and "marker" in str(val) \
            else "FAIL(%s: %r)" % (st, str(val)[:80])

    print("files=%d mutations=%d  decoded=%d refused=%d uncaught-crashes=%d hangs=%d nondeterminism=%d"
          % (len(files), total, counts["ok"], counts["refused"], len(crashes), len(hangs), len(nondet)))
    print("contract/wire marker mismatch guard: %s" % marker_guard)
    print("wall=%.1fs" % (time.time() - t0))
    for c in crashes[:6]:
        print("  CRASH %r" % (c,))
    for h in hangs[:6]:
        print("  HANG %r" % (h,))
    bad = len(crashes) + len(hangs) + len(nondet) + (0 if marker_guard.startswith("PASS") else 1)
    print("RED-TEAM: %s" % ("FAILURES PRESENT" if bad else "no crash, no hang, no nondeterminism, marker guard holds"))
    return 1 if bad else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
