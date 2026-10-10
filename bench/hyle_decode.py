#!/usr/bin/env python3
"""
INDEPENDENT CPython READER FOR THE HYLE WIRE.

Written from the contract prose that HYLE ships (CL_T, CL_T_RUNS, CL_A, CL_G
and its feature fragments, CL_I, CL_I_EXC in src/lib/omega/hyle.ts) and from
the wire grammar, NOT from the TypeScript restoration code.  Nothing here is
shared with hyle.ts: the field splitter, the slot evaluator, the modulo rule,
the calendar enumerator, the bracket-depth and tag-depth counters and the
column placer are all re-derived in Python.  When this reader and the
TypeScript decoder agree byte-for-byte on the same wire, that is evidence the
SPECIFICATION is unambiguous and portable rather than an artifact of one
runtime — which is the whole point of asking an LLM to be the decoder.

WIRE GRAMMAR
    wire     = "¦" directive ( ";" directive )* "\n" body
    directive= "B" arm                       payload codec, "b" = literal body
             | "T" sep start "-" end [ "h" nHead ]
             | "A" col ( "," col )*          col = N | "-" N
             | "G" index "=" spec
             | "I" unit model [ "*" override ( "," override )* ]
    sep      = "," | ";" | "|" | "_" | "\t"  "_" = runs of 2+ spaces
    unit     = "1".."8" | "t"                "t" = tabs
    model    = "b" (bracket depth) | "g" (XML/HTML element depth)
    override = line ":" spaces
    spec     = "@" date ( ".." date | "+" span ) [ "w" ] [ "-" off ( "," off )* ]
             | "#" period ":" value ( "," value )*
             | template
    template = ( literal | "{{" | "}}" | "{" slot "}" )*
    slot     = [ "c" letter ] A "+" D [ "m" M ] [ "z" W ]

SEMANTICS (as the contract states them)
    A slot {A+D} is the number A + D*r for data row r = 0,1,2,...
    {A+DmM}      is A + ((D*r) mod M)          — the base is OUTSIDE the modulus
    zW           zero-pads the integer part to W digits
    cX           counts letters from X, so {ca+1m5} = a,b,c,d,e,a,...
    A and D may carry decimals; the value keeps the wider of the two scales.
    #p:v0,...    cycles through those p values.
    @...         one date per row, every day (w = Monday-Friday only), minus
                 the day-offsets listed after the final "-".
    A column placement N pads with spaces to column N and writes the field
    left-aligned; -N pads so the field ENDS at column N (right-aligned).
    Decode order is the reverse of encode order: arm, then G, then A, then I.

HONEST SCOPE LIMIT
    Only arm "b" (literal body) can be verified here.  A wire ending in Bc/Bg/
    Be/Ba/Bk carries a payload compressed by CHIRON, GLOSSIA/MOSAIC, EIDOS,
    AION or KIONES; re-deriving those readers is what bench/chiron_decode.py
    and friends are for, and this script reports SKIPPED (exit 2) rather than
    pretending to have checked them.

Usage
    python3 bench/hyle_decode.py WIRE_FILE --check SOURCE_FILE
    python3 bench/hyle_decode.py WIRE_FILE            # prints the decoded text
"""
import datetime
import re
import sys

SENTINEL = "\u00a6"          # ¦ BROKEN BAR
EPOCH = datetime.date(1970, 1, 1)
FLAT_TAGS = {"html", "head", "body"}


# --------------------------------------------------------------------------
# dates: day numbers are days since 1970-01-01, exactly as in the TS decoder
# --------------------------------------------------------------------------
def day_of(iso):
    return (datetime.date.fromisoformat(iso) - EPOCH).days


def iso_day(n):
    return (EPOCH + datetime.timedelta(days=n)).isoformat()


# --------------------------------------------------------------------------
# column specs
# --------------------------------------------------------------------------
class Slot:
    __slots__ = ("a", "d", "scale", "mod", "pad", "letter")

    def __init__(self, a, d, scale, mod, pad, letter):
        self.a, self.d, self.scale, self.mod, self.pad, self.letter = a, d, scale, mod, pad, letter


class Spec:
    """kind = 'tpl' | 'cycle' | 'date'"""

    def __init__(self, kind, parts=None, period=0, values=(), start=0, end=0,
                 weekdays=False, skip=()):
        self.kind = kind
        self.parts = parts or []          # list of ('lit', str) | ('slot', Slot)
        self.period = period
        self.values = list(values)
        self.start = start
        self.end = end
        self.weekdays = weekdays
        self.skip = set(skip)


def _dec(text):
    """parse a decimal literal into (scaled_int, scale) using exact integers"""
    m = re.fullmatch(r"([+-]?)(\d*)(?:\.(\d+))?", text)
    if not m or (not m.group(2) and not m.group(3)):
        return None
    sign = -1 if m.group(1) == "-" else 1
    ip = m.group(2) or "0"
    fp = m.group(3) or ""
    return sign * int(ip + fp), len(fp)


def _format_scaled(v, scale, pad):
    """exact decimal formatting from a scaled integer — no floats anywhere"""
    neg = v < 0
    a = -v if neg else v
    if scale > 0:
        d = 10 ** scale
        ip, rem = divmod(a, d)
        s = str(ip)
        fp = "." + str(rem).rjust(scale, "0")
    else:
        s, fp = str(a), ""
    if pad > len(s):
        s = s.rjust(pad, "0")
    return ("-" if neg else "") + s + fp


def _parse_slot(inner):
    rest = inner
    letter = None
    if re.match(r"^c[A-Za-z]", rest):
        letter = rest[1]
        rest = rest[2:]
    # suffixes come off in the REVERSE order the writer emits them: z, then m
    pad = 0
    zm = re.match(r"^(.*?)z(\d+)$", rest)
    if zm:
        pad = int(zm.group(2))
        rest = zm.group(1)
    mod = None
    mm = re.match(r"^(.*?)m(-?\d+)$", rest)
    if mm:
        got = _dec(mm.group(2))
        if not got or got[0] <= 0:
            return None
        mod = got[0]
        rest = mm.group(1)
    cut = rest.find("+", 1)
    if cut < 0:
        return None
    A, D = _dec(rest[:cut]), _dec(rest[cut + 1:])
    if A is None or D is None:
        return None
    scale = max(A[1], D[1])
    return Slot(A[0] * 10 ** (scale - A[1]), D[0] * 10 ** (scale - D[1]), scale, mod, pad, letter)


def parse_spec(text):
    if text.startswith("@"):
        m = re.fullmatch(r"@(\d{4}-\d{2}-\d{2})(?:\.\.(\d{4}-\d{2}-\d{2})|\+(\d+))?(w)?(?:-([\d,]+))?", text)
        if not m:
            return None
        start = day_of(m.group(1))
        explicit = m.group(2) is not None
        end = day_of(m.group(2)) if explicit else start
        span = int(m.group(3)) if m.group(3) else 0
        if not explicit and not m.group(3):
            return None
        skip = [int(x) for x in m.group(5).split(",")] if m.group(5) else []
        return Spec("date", start=start, end=(end if explicit else start + span),
                    weekdays=bool(m.group(4)), skip=skip)
    if text.startswith("#"):
        i = text.find(":")
        if i < 0:
            return None
        p = int(text[1:i])
        if p < 1:
            return None
        values = text[i + 1:].split(",")
        if len(values) != p:
            return None
        return Spec("cycle", period=p, values=values)
    parts, lit, i = [], "", 0
    while i < len(text):
        c = text[i]
        if c == "{" and text[i + 1:i + 2] == "{":
            lit += "{"
            i += 2
            continue
        if c == "}" and text[i + 1:i + 2] == "}":
            lit += "}"
            i += 2
            continue
        if c == "{":
            depth, j = 1, i + 1
            while j < len(text) and depth > 0:
                if text[j] == "{":
                    depth += 1
                elif text[j] == "}":
                    depth -= 1
                if depth > 0:
                    j += 1
            if depth != 0:
                return None
            slot = _parse_slot(text[i + 1:j])
            if slot is None:
                return None
            if lit:
                parts.append(("lit", lit))
                lit = ""
            parts.append(("slot", slot))
            i = j + 1
            continue
        lit += c
        i += 1
    if lit:
        parts.append(("lit", lit))
    return Spec("tpl", parts=parts)


def eval_slot(s, r):
    if s.mod is not None and s.mod > 0:
        m = s.mod * 10 ** s.scale
        v = s.a + (s.d * r) % m
    else:
        v = s.a + s.d * r
    if s.letter:
        return chr(ord(s.letter) + int(v))
    return _format_scaled(v, s.scale, s.pad)


def eval_spec(sp, r):
    if sp.kind == "tpl":
        return "".join(t if k == "lit" else eval_slot(t, r) for k, t in sp.parts)
    if sp.kind == "cycle":
        return sp.values[r % sp.period]
    seen = -1
    d = sp.start
    while d <= sp.end:
        if sp.weekdays and (EPOCH + datetime.timedelta(days=d)).weekday() >= 5:
            d += 1
            continue
        if (d - sp.start) in sp.skip:
            d += 1
            continue
        seen += 1
        if seen == r:
            return iso_day(d)
        d += 1
    return ""


# --------------------------------------------------------------------------
# tables
# --------------------------------------------------------------------------
def split_fields(line, sep, count=None):
    """split into exactly `count` fields; the LAST field keeps its own spaces"""
    if sep != " " or count is None or count < 1:
        return line.split(sep)
    out, rest = [], line
    for _ in range(count - 1):
        sp = rest.find(" ")
        if sp < 0:
            return line.split(sep)
        out.append(rest[:sp])
        rest = rest[sp + 1:]
    out.append(rest)
    return out


def gen_restore(lines, start, end, nhead, sep, nfields, gens):
    k = len(gens)
    first = start + nhead
    for i in range(first, min(end, len(lines) - 1) + 1):
        r = i - first
        survive = nfields - k if nfields > 0 else None
        f = [] if lines[i] == "" else split_fields(lines[i], sep, survive)
        total = len(f) + k
        vals, ci, fi = [], 0, 0
        for c in range(total):
            if ci < k and gens[ci][0] == c:
                vals.append(eval_spec(gens[ci][1], r))
                ci += 1
            else:
                vals.append(f[fi] if fi < len(f) else "")
                fi += 1
        lines[i] = sep.join(vals)


def align_restore(lines, start, end, nfields, align):
    for i in range(start, min(end, len(lines) - 1) + 1):
        f = split_fields(lines[i], " ", nfields)
        if len(f) != nfields or any(x == "" for x in f[:nfields - 1]):
            continue
        res, ok = "", True
        for c, field in enumerate(f):
            if c >= len(align):
                ok = False
                break
            left, pos = align[c]
            at = pos if left else pos - len(field)
            if at < len(res):
                ok = False
                break
            res += " " * (at - len(res)) + field
        if ok:
            lines[i] = res


# --------------------------------------------------------------------------
# indentation
# --------------------------------------------------------------------------
def depth_bracket(lines):
    out, d, q, esc, block = [], 0, None, False, False
    for l in lines:
        t = l.lstrip()
        dd = d
        if t and t[0] in "})]":
            dd = max(0, d - 1)
        out.append(dd)
        i = 0
        while i < len(l):
            c = l[i]
            if block:
                if c == "*" and l[i + 1:i + 2] == "/":
                    block = False
                    i += 1
                i += 1
                continue
            if esc:
                esc = False
                i += 1
                continue
            if q:
                if c == "\\":
                    esc = True
                elif c == q:
                    q = None
                i += 1
                continue
            if c == "/" and l[i + 1:i + 2] == "/":
                break
            if c == "/" and l[i + 1:i + 2] == "*":
                block = True
                i += 2
                continue
            if c in "\"'`":
                q = c
                i += 1
                continue
            if c in "{[(":
                d += 1
            elif c in "})]":
                d = max(0, d - 1)
            i += 1
    return out


TAG_RE = re.compile(
    r"<!--[\s\S]*?-->|<\?[\s\S]*?\?>|<!\[CDATA\[[\s\S]*?\]\]>|"
    r"<(/?)([A-Za-z_][\w.:-]*)((?:\"[^\"]*\"|'[^']*'|[^>\"'])*?)(/?)>")


def depth_tag(lines):
    out, stack = [], []
    for l in lines:
        t = l.lstrip()
        dd = len(stack)
        if t.startswith("</"):
            dd = max(0, len(stack) - 1)
        out.append(dd)
        for m in TAG_RE.finditer(l):
            whole = m.group(0)
            if whole[0] != "<" or m.group(2) is None:
                continue
            if whole.startswith("<!--") or whole.startswith("<?") or whole.startswith("<!"):
                continue
            closing, name, self_close = m.group(1) == "/", m.group(2), m.group(4) == "/"
            if closing:
                if name in stack:
                    del stack[stack.index(name):]
                elif stack:
                    stack.pop()
            elif not self_close and name.lower() not in FLAT_TAGS:
                stack.append(name)
    return out


def indent_apply(lines, unit, tab, model, over):
    depth = depth_bracket(lines) if model == "b" else depth_tag(lines)
    for i, l in enumerate(lines):
        if i in over:
            lines[i] = " " * over[i] + l
            continue
        d = depth[i]
        if d:
            lines[i] = ("\t" * d if tab else " " * (unit * d)) + l


# --------------------------------------------------------------------------
# the reader
# --------------------------------------------------------------------------
def hyle_decode(wire):
    """total: anything that is not a well-formed HYLE wire comes back unchanged"""
    if not wire.startswith(SENTINEL):
        return wire, None
    nl = wire.find("\n")
    if nl < 0:
        return wire, None
    body, dirs = wire[nl + 1:], wire[1:nl].split(";")
    arm, ind, tab, align, gens = "b", None, None, [], []
    for d in dirs:
        if not d:
            return wire, None
        head, rest = d[0], d[1:]
        if head == "B":
            arm = rest
            if arm not in ("b", "c", "g", "e", "a", "k", "h", "t"):
                return wire, None
        elif head == "I":
            m = re.fullmatch(r"I([1-8]|t)([bg])(?:\*(.*))?", d)
            if not m:
                return wire, None
            over = {}
            if m.group(3):
                for pair in m.group(3).split(","):
                    a, _, b = pair.partition(":")
                    over[int(a)] = int(b)
            ind = (1 if m.group(1) == "t" else int(m.group(1)), m.group(1) == "t", m.group(2), over)
        elif head == "T":
            m = re.fullmatch(r"T([,;|_\t])(\d+)-(\d+)(?:h(\d))?", d)
            if not m:
                return wire, None
            nhead = int(m.group(4)) if m.group(4) else 0
            if not 0 <= nhead <= 2:
                return wire, None
            sep_repr = m.group(1)
            tab = (int(m.group(2)), int(m.group(3)), " " if sep_repr == "_" else sep_repr,
                   sep_repr == "_", nhead, 0)
        elif head == "A":
            nums = [int(x) for x in rest.split(",")]
            if not nums:
                return wire, None
            align = [(n >= 0, abs(n)) for n in nums]
        elif head == "G":
            if tab is None:
                return wire, None
            eq = rest.find("=")
            if eq < 0:
                return wire, None
            idx = int(rest[:eq])
            sp = parse_spec(rest[eq + 1:])
            if sp is None:
                return wire, None
            gens.append((idx, sp))
        else:
            return wire, None
    if arm != "b":
        return None, arm            # borrowed payload: not independently checkable here
    gens.sort(key=lambda x: x[0])
    if (gens or align) and tab is None:
        return wire, None
    lines = body.split("\n")
    if tab is not None:
        start, end, sep, runs, nhead, nfields = tab
        if runs and not nfields:
            nfields = len(align)
        if gens:
            gen_restore(lines, start, end, nhead, sep, nfields, gens)
        if align:
            align_restore(lines, start, end, nfields, align)
    if ind is not None:
        indent_apply(lines, ind[0], ind[1], ind[2], ind[3])
    return "\n".join(lines), None


def main(argv):
    if len(argv) < 2:
        print(__doc__)
        return 1
    wire = open(argv[1], encoding="utf-8", newline="").read()
    check = None
    if "--check" in argv:
        check = argv[argv.index("--check") + 1]
    out, arm = hyle_decode(wire)
    if out is None:
        print(f"SKIPPED: payload uses borrowed arm '{arm}' — this reader verifies HYLE's own protocol only")
        return 2
    if check:
        want = open(check, encoding="utf-8", newline="").read()
        if out == want:
            print(f"PASS byte-exact: {len(want)} chars from {len(wire)} wire chars")
            return 0
        print(f"FAIL: decoded {len(out)} chars, expected {len(want)}")
        for i, (a, b) in enumerate(zip(out.split("\n"), want.split("\n"))):
            if a != b:
                print(f"  first differing line {i}:\n    got  {a!r}\n    want {b!r}")
                break
        return 1
    sys.stdout.write(out)
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
