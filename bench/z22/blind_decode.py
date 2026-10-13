"""Blind decoder: reads a PHALANX-P4 wire using ONLY the text inside the message.

It implements the rules as written in the wire's own legend and rule lines. It does not import
the TypeScript. Where a rule text is ambiguous, two readings are implemented and both are scored.
"""
import json, re, sys

def unesc_header(s):
    out, i = [], 0
    while i < len(s):
        c = s[i]
        if c == '~' and i + 1 < len(s):
            n = s[i + 1]
            if n == '~': out.append('~'); i += 2; continue
            if n == 'N': out.append('\n'); i += 2; continue
            if n == 'R': out.append('\r'); i += 2; continue
        out.append(c); i += 1
    return ''.join(out)

def vxa_decode(wire):
    # VXA (VERITAS-A) as its legend states: "X=T" entries (X one character), T escapes ~~ ~N ~R,
    # ]] ends the header, the body escapes ~~ only, and a bare X in the body expands to T.
    lines = wire[len('[[VXA\n'):].split('\n')
    i = 1 if lines and lines[0].startswith('# ') else 0
    d = {}
    while i < len(lines) and lines[i] != ']]':
        ln = lines[i]
        if len(ln) < 2 or ln[1] != '=':
            raise ValueError('VXA: bad entry line')
        d[ln[0]] = unesc_header(ln[2:])
        i += 1
    if i >= len(lines):
        raise ValueError('VXA: no terminator')
    body = '\n'.join(lines[i + 1:])
    out, j = [], 0
    while j < len(body):
        c = body[j]
        if c == '~':
            if body[j + 1:j + 2] != '~':
                raise ValueError('VXA: bad body escape')
            out.append('~'); j += 2; continue
        out.append(d.get(c, c)); j += 1
    return ''.join(out)

def vx_decode(wire, legend_ok=True):
    if wire.startswith('[[VXA\n'):
        return vxa_decode(wire)
    # [[VX1" line, optional "# ..." legend line, "~k=T" lines, "]]" terminator, then body.
    if not wire.startswith('[[VX1\n'):
        return wire
    lines = wire[len('[[VX1\n'):].split('\n')
    i = 0
    if lines and lines[0].startswith('# '):
        i = 1
    d = {}
    while i < len(lines):
        ln = lines[i]
        if ln == ']]':
            i += 1
            break
        if len(ln) >= 3 and ln[0] == '~' and ln[2] == '=':
            d[ln[1]] = unesc_header(ln[3:])
            i += 1
        else:
            return wire  # not a VX block as written
    body = '\n'.join(lines[i:])
    out, j = [], 0
    while j < len(body):
        c = body[j]
        if c == '~' and j + 1 < len(body):
            n = body[j + 1]
            if n == '~': out.append('~'); j += 2; continue
            if n in d: out.append(d[n]); j += 2; continue
        out.append(c); j += 1
    return ''.join(out)

def split_ws(line):
    # fields are runs of non-space characters; whitespace is copied unchanged (rc and ko clauses)
    return re.split(r'(\s+)', line)

def rc_decode(text):
    lines = text.split('\n'); hist = []; out = []
    for i, ln in enumerate(lines):
        parts = split_ws(ln); fields = []; res = []; j = 0
        for p in range(0, len(parts), 2):
            w = parts[p]
            if w == '':
                if p + 1 < len(parts): res.append(parts[p + 1])
                continue
            if w.startswith('@:'): f = w[2:]
            elif re.fullmatch(r'@\d+', w):
                d = int(w[1:])
                if d < 1 or d > i: raise ValueError('rc: reference outside the text')
                f = hist[i - d][j]
            else: f = w
            res.append(f); fields.append(f); j += 1
            if p + 1 < len(parts): res.append(parts[p + 1])
        hist.append(fields); out.append(''.join(res))
    return '\n'.join(out)

def ko_decode(text):
    lines = text.split('\n'); prev = None; out = []
    for ln in lines:
        parts = split_ws(ln); fields = []; res = []; j = 0
        for p in range(0, len(parts), 2):
            w = parts[p]
            if w == '':
                if p + 1 < len(parts): res.append(parts[p + 1])
                continue
            m = re.fullmatch(r'&(\d*):(.*)', w, re.S)
            if m and m.group(1) == '': f = m.group(2)
            elif m:
                if prev is None or j >= len(prev): raise ValueError('ko: field without reference')
                k = int(m.group(1)); r = prev[j]
                if k > len(r): raise ValueError('ko: prefix longer than reference')
                f = r[:k] + m.group(2)
            else: f = w
            res.append(f); fields.append(f); j += 1
            if p + 1 < len(parts): res.append(parts[p + 1])
        prev = fields; out.append(''.join(res))
    return '\n'.join(out)

def dt_decode(text):
    # rule: "^ = the same field as the same position in the line above; a field that really begins
    # with ^ has one extra ^ in front; fields are split on single spaces"
    prev = []; out = []
    for ln in text.split('\n'):
        f = []
        for j, v in enumerate(ln.split(' ')):
            if v == '^': f.append(prev[j] if j < len(prev) else '')
            elif v.startswith('^'): f.append(v[1:])
            else: f.append(v)
        prev = f; out.append(' '.join(f))
    return '\n'.join(out)

def da_decode(text, reading):
    # rule: "=name = the directory of the line above, then name; fields split on spaces and tabs"
    out = []; prev_path = ''
    for ln in text.split('\n'):
        m = re.search(r'[ \t]', ln)
        head, seg = ('', ln) if m is None else None, None
        last = max(ln.rfind(' '), ln.rfind('\t'))
        head, seg = ln[:last + 1], ln[last + 1:]
        if seg.startswith('='):
            name = seg[1:]
            out.append(head + prev_path + name)
            cur = prev_path + name
        else:
            out.append(ln); cur = seg
        if reading == 'last-field':
            # directory of the line above's last field: up to and including its last '/', empty if none/at 0
            i = cur.rfind('/')
            prev_path = '' if i <= 0 else cur[:i + 1]
        else:
            # reading 2: the first field of the line above that contains '/'
            fields = re.split(r'[ \t]', out[-1])
            pf = next((x for x in fields if '/' in x), '')
            i = pf.rfind('/')
            prev_path = '' if i <= 0 else pf[:i + 1]
    return '\n'.join(out)

def uu_decode(text, boundary):
    pat = r'[0-9A-F]{8}[0-9A-F]{4}[0-9A-F]{4}[0-9A-F]{4}[0-9A-F]{12}'
    pat = (r'(?<![0-9A-Za-z])' + pat + r'(?![0-9A-Za-z])') if boundary else pat
    def rep(m):
        s = m.group(0)
        if not re.search(r'[A-F]', s): return s
        s = s.lower()
        return s[0:8] + '-' + s[8:12] + '-' + s[12:16] + '-' + s[16:20] + '-' + s[20:32]
    return re.sub(pat, rep, text)

def blind(wire, reading, boundary):
    t = wire
    legend = None
    for ESC in ('PHALANX-A1: identity, text follows verbatim', 'PHALANX-A2: identity, text follows verbatim'):
        if t.startswith(ESC + '\n'):
            return t[len(ESC) + 1:]
    if t.startswith('PHALANX-P4 legend: ') or t.startswith('PHALANX-A1 legend: ') or t.startswith('PHALANX-A2 legend: '):
        legend, t = t.split('\n', 1)
    t = vx_decode(t)
    if legend:
        if '[rc] ' in legend: t = rc_decode(t)
        if '[ko] ' in legend: t = ko_decode(t)
    # inline rule lines, outermost first (DITTO, then DIRFOLD-A, then UUIDFOLD)
    DT = 'DITTO: ^ = the same field as the same position in the line above; a field that really begins with ^ has one extra ^ in front; fields are split on single spaces'
    DA = 'DIRFOLD-A: =name = the directory of the line above, then name; fields split on spaces and tabs'
    UU = 'UUIDFOLD: 32 uppercase hex digits with a letter A-F = lowercase UUID; dashes after digits 8 12 16 20'
    if t.startswith(DT + '\n'): t = dt_decode(t[len(DT) + 1:])
    if t.startswith(DA + '\n'): t = da_decode(t[len(DA) + 1:], reading)
    if t.startswith(UU + '\n'): t = uu_decode(t[len(UU) + 1:], boundary)
    return t

if __name__ == '__main__':
    items = json.load(open(sys.argv[1]))
    res = {}
    for key in [('last-field', True), ('last-field', False), ('first-slash', True)]:
        ok = 0; fails = []
        for it in items:
            try:
                got = blind(it['wire'], *key)
            except Exception as e:
                got = None
            if got == it['text']: ok += 1
            elif len(fails) < 3: fails.append(it['name'])
        res[str(key)] = (ok, len(items), fails)
        print(key, f'exact {ok}/{len(items)}', 'first failures:', fails)
