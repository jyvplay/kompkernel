/**
 * X71 — a THIRD reader, for AUSTEROS. Written only from the contract line that is
 * printed in the message, and importing nothing from `austere.ts` or `brachys.ts`.
 * This is `bench/x70/reader2.ts` re-pointed at the AUSTEROS pool: the base clause
 * is now "A-B are 0-based body lines of a SEP-split table; the rest is literal."
 * and the verbatim head reads "h = lines kept above r=0.".
 *
 * Purpose: the size claim of BRACHYS is that a shorter instruction is enough.
 * That claim is worth nothing unless an implementation that has seen only the
 * instruction reproduces the source. This is that implementation, and
 * `bench/x70/reader2-receipt.json` records the diff against the real file.
 *
 * What this reader implements, and where it comes from:
 *   "Lines A-B (from 0) of the body after the directive line are one table split
 *    by SEP; the rest of it is literal."
 *        -> the first LF ends the directive line; the body is 0-based; the block
 *           A..B is split on the character that follows T; lines outside are kept.
 *   "G<c>=<spec> restores deleted column c per row r"
 *        -> rows r=0,1,2,... are the block lines after any verbatim head; the
 *           surviving fields of a row keep their order and column c is re-inserted
 *           at index c.
 *   "{A+B}=A+B*r", "mM=A+(B*r mod M)", "zW=zero-pad to W digits"
 *        -> one arithmetic per slot, evaluated per row.
 *   "A = field start columns, minus = end column of a right-aligned field."
 *        -> after the columns are rebuilt, each field is placed at its column.
 *   "#p:v,.. cycles p values"
 *        -> the r-th of the p values, r counted from 0.
 *   "print only."
 *        -> no commentary in the output.
 */
import * as fs from 'node:fs';

const MESSAGE = fs.readFileSync(process.argv[2], 'utf8');

function decode(message: string): string {
  const firstLf = message.indexOf('\n');
  const prose = message.slice(0, firstLf);
  const rest = message.slice(firstLf + 1);
  const bBase = prose.startsWith('Lines A-B (from 0)') || prose.startsWith('A-B are 0-based body lines');
  if (!bBase) throw new Error('contract line is not an admitted b-band contract');
  const nl = rest.indexOf('\n');
  const directive = rest.slice(1, nl); // drop the '¦'
  const body = rest.slice(nl + 1);

  let table: { start: number; end: number; sep: string; head: number; runs: boolean } | null = null;
  let align: Array<{ left: boolean; pos: number }> = [];
  const gens: Array<{ col: number; spec: string }> = [];
  for (const d of directive.split(';')) {
    if (d[0] === 'T') {
      const m = /^T(.)(\d+)-(\d+)(?:h(\d))?$/.exec(d);
      if (!m) throw new Error('bad T');
      table = { sep: m[1] === '_' ? ' ' : m[1], start: +m[2], end: +m[3], head: m[4] ? +m[4] : 0, runs: m[1] === '_' };
    } else if (d[0] === 'G') {
      const eq = d.indexOf('=');
      gens.push({ col: +d.slice(1, eq), spec: d.slice(eq + 1) });
    } else if (d[0] === 'A') {
      align = d.slice(1).split(',').map((x) => { const v = +x; return v < 0 ? { left: false, pos: -v } : { left: true, pos: v }; });
    }
  }
  if (!table) throw new Error('no table');
  gens.sort((a, b) => a.col - b.col);

  // one slot of one generator, evaluated at row r, exactly as the prose says
  const slot = (inner: string, r: number): string => {
    let s = inner;
    let letter: string | null = null;
    const cl = /^c([A-Za-z])/.exec(s);
    if (cl) { letter = cl[1]; s = s.slice(2); }
    let pad = 0;
    const z = /^(.*)z(\d+)$/.exec(s);
    if (z) { pad = +z[2]; s = z[1]; }
    let mod: number | null = null;
    const mm = /^(.*)m(-?\d+)$/.exec(s);
    if (mm) { mod = +mm[2]; s = mm[1]; }
    const plus = s.indexOf('+', 1);
    const A = s.slice(0, plus);
    const B = s.slice(plus + 1);
    const decA = A.includes('.') ? A.split('.')[1].length : 0;
    const decB = B.includes('.') ? B.split('.')[1].length : 0;
    const scale = Math.max(decA, decB);
    const toScaled = (x: string, dec: number): bigint => {
      const neg = x.startsWith('-');
      const t = (neg ? x.slice(1) : x).replace('.', '') || '0';
      return BigInt(t) * 10n ** BigInt(scale - dec) * (neg ? -1n : 1n);
    };
    const a = toScaled(A, decA);
    const b = toScaled(B, decB);
    let v: bigint;
    if (mod !== null) {
      const m = BigInt(mod) * 10n ** BigInt(scale);
      const t = b * BigInt(r);
      v = a + ((t % m) + m) % m;
    } else v = a + b * BigInt(r);
    if (letter) return String.fromCharCode(letter.charCodeAt(0) + Number(v));
    const neg = v < 0n;
    const mag = neg ? -v : v;
    const unit = 10n ** BigInt(scale);
    let ip = (mag / unit).toString();
    const fp = scale ? '.' + (mag % unit).toString().padStart(scale, '0') : '';
    if (pad > ip.length) ip = ip.padStart(pad, '0');
    return (neg ? '-' : '') + ip + fp;
  };

  const value = (spec: string, r: number): string => {
    if (spec.startsWith('#')) {
      const i = spec.indexOf(':');
      const p = +spec.slice(1, i);
      const vals = spec.slice(i + 1).split(',');
      return vals[r % p];
    }
    let out = '';
    for (let i = 0; i < spec.length; i++) {
      const ch = spec[i];
      if (ch === '{' && spec[i + 1] === '{') { out += '{'; i++; continue; }
      if (ch === '}' && spec[i + 1] === '}') { out += '}'; i++; continue; }
      if (ch === '{') {
        let depth = 1; let j = i + 1;
        while (j < spec.length && depth > 0) { if (spec[j] === '{') depth++; else if (spec[j] === '}') depth--; if (depth > 0) j++; }
        out += slot(spec.slice(i + 1, j), r);
        i = j;
        continue;
      }
      out += ch;
    }
    return out;
  };

  const lines = body.split('\n');
  const first = table.start + table.head;
  // "_ = fields split by 2+ spaces, rejoined with 1" -> the body joins with one
  // space, and the surviving-field count is the field count minus the lifted ones
  const fields = table.runs ? align.length : 0;
  const split = (line: string, n?: number): string[] => {
    if (!n || n < 1) return line.split(table!.sep);
    const out: string[] = [];
    let rest = line;
    for (let k = 0; k < n - 1; k++) { const at = rest.indexOf(' '); if (at < 0) return line.split(table!.sep); out.push(rest.slice(0, at)); rest = rest.slice(at + 1); }
    out.push(rest);
    return out;
  };
  for (let i = first; i <= table.end && i < lines.length; i++) {
    const r = i - first;
    const cap = fields > 0 ? fields - gens.length : undefined;
    const surviving = lines[i] === '' ? [] : split(lines[i], cap);
    const total = surviving.length + gens.length;
    const out: string[] = new Array(total).fill('');
    let gi = 0; let si = 0;
    for (let c = 0; c < total; c++) {
      if (gi < gens.length && gens[gi].col === c) out[c] = value(gens[gi++].spec, r);
      else out[c] = si < surviving.length ? surviving[si++] : '';
    }
    lines[i] = out.join(table.sep);
  }
  if (align.length && table.runs) {
    for (let i = table.start; i <= table.end && i < lines.length; i++) {
      const f = split(lines[i], fields);
      if (f.length !== fields || f.some((x, c) => c < fields - 1 && x === '')) continue;
      let out = '';
      let ok = true;
      for (let c = 0; c < f.length; c++) {
        const at = align[c].left ? align[c].pos : align[c].pos - f[c].length;
        if (at < out.length) { ok = false; break; }
        while (out.length < at) out += ' ';
        out += f[c];
      }
      if (ok) lines[i] = out;
    }
  }
  return lines.join('\n');
}

const sourcePath = process.argv[3];
const got = decode(MESSAGE);
if (sourcePath) {
  const want = fs.readFileSync(sourcePath, 'utf8');
  const same = got === want;
  let at = -1;
  for (let i = 0; i < Math.max(got.length, want.length); i++) if (got[i] !== want[i]) { at = i; break; }
  console.log(JSON.stringify({
    lane: sourcePath, exact: same, gotChars: got.length, wantChars: want.length,
    firstDiffAt: at,
    gotAround: at < 0 ? null : JSON.stringify(got.slice(Math.max(0, at - 30), at + 30)),
    wantAround: at < 0 ? null : JSON.stringify(want.slice(Math.max(0, at - 30), at + 30)),
  }, null, 1));
  fs.mkdirSync('bench/x70/receipts', { recursive: true });
  const receiptPath = 'bench/x71/receipts/reader3-' + sourcePath.split('/').pop()!.replace(/\W+/g, '_') + '.json';
  fs.writeFileSync(receiptPath, JSON.stringify({ lane: sourcePath, exact: same, gotChars: got.length, wantChars: want.length, firstDiffAt: at, messageTokens: null }, null, 1) + '\n');
  if (!same) process.exitCode = 1;
} else {
  console.log(got);
}
