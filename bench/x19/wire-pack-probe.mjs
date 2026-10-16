// X19: pack the digit clusters of the SAVED LAKONIKOS-D wires (post-DAEDALUS), not the source.
// Cheap: tokenizer only. The separators left in a wire are the ones DAEDALUS did NOT absorb,
// so packing them is not redundant with the dictionary the way packing the source is.
import fs from 'node:fs';
import { encode } from 'gpt-tokenizer';
const T = s => encode(s).length;

const dir = 'bench/x16/lakonikos-d';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.wire.txt')).sort();

const SEPS = new Set([...'-.:/,;_+*']);
const SEPS_L = new Set([...'-.:/,;_+*', 'T', 'x', 'Z']);
const MAX_RUNS = 12, MAX_RUNLEN = 24;
const isD = c => c >= '0' && c <= '9';

function clusters(text, seps) {
  const out = []; const n = text.length; let i = 0;
  while (i < n) {
    if (!isD(text[i])) { i++; continue; }
    let j = i; const runs = []; const sp = [];
    while (j < n) {
      const st = j; while (j < n && isD(text[j])) j++;
      if (j - st > MAX_RUNLEN) break;
      runs.push(text.slice(st, j));
      if (j >= n) break;
      const c = text[j];
      if (seps.has(c) && j + 1 < n && isD(text[j + 1])) { sp.push(c); j++; } else break;
      if (runs.length >= MAX_RUNS) break;
    }
    if (runs.length >= 2) out.push({ runs, seps: sp, raw: text.slice(i, j) });
    i = j;
  }
  return out;
}
const key = c => c.runs.map(r => r.length).join(',') + '|' + c.seps.join('');

function shapesOf(text, seps) {
  const cs = clusters(text, seps);
  const by = new Map();
  for (const c of cs) {
    const k = key(c); const packed = c.runs.join('');
    const gross = T(c.raw) - T(packed);
    const e = by.get(k);
    if (!e) by.set(k, { runs: c.runs.map(r => r.length), seps: c.seps, count: 1, gross, exPacked: packed, exRaw: c.raw });
    else { e.count++; e.gross += gross; if (c.raw.length < e.exRaw.length) { e.exPacked = packed; e.exRaw = c.raw; } }
  }
  const arr = [...by.values()].filter(e => e.gross > 0).map(e => ({ ...e, total: e.runs.reduce((a, b) => a + b, 0) }));
  arr.sort((a, b) => b.gross - a.gross);
  return arr;
}

const MARK = ['\u00a4', '\u00a6', '\u00a9', '\u00ab', '\u00ac', '\u00ae', '\u00af', '\u00b0', '\u00b1', '\u00b2', '\u00b3'];
const T1_BASE = 'Nums drop inner punctuation; restore in the result:';
const T3_BASE = 'Nums drop inner punctuation; restore in the result: 20260930 = 2026-09-30, i.e. LEN=run lengths with "..." between them.';
const runsOf = s => s.runs.join('-');
const sepsOf = s => '"' + s.seps.join('') + '"';
const cT1 = u => T1_BASE + u.map(x => ` ${x.mark || ''}${x.shape.total}=${runsOf(x.shape)}${sepsOf(x.shape)} (${x.shape.exPacked}=${x.shape.exRaw}).`).join('');
const cT3 = u => T3_BASE + u.map(x => ` ${x.mark || ''}${x.shape.total}=${runsOf(x.shape)}${sepsOf(x.shape)}.`).join('');

function applyPlan(text, uses, seps) {
  const cs = clusters(text, seps);
  const m = new Map(uses.map(u => [u.shape.runs.join(',') + '|' + u.shape.seps.join(''), u]));
  let out = '', at = 0; const packedStarts = new Set();
  for (const c of cs) {
    const u = m.get(key(c));
    out += text.slice(at, c.start);
    if (!u) { out += c.raw; at = c.end; continue; }
    packedStarts.add(out.length + u.mark.length);
    out += u.mark + c.runs.join('');
    at = c.end;
  }
  out += text.slice(at);
  return { text: out, packedStarts };
}
function escapes(text, defLen, packedStarts, esc) {
  let out = '', n = 0, i = 0;
  while (i < text.length) {
    if (!isD(text[i])) { out += text[i]; i++; continue; }
    let j = i; while (j < text.length && isD(text[j])) j++;
    out += text.slice(i, j);
    if (defLen.has(j - i) && !packedStarts.has(i)) { out += esc; n++; }
    i = j;
  }
  return { text: out, n };
}

let totDelta = 0, totContract = 0, totNet = 0, totWire = 0, wins = 0;
for (const f of files) {
  const wire = fs.readFileSync(`${dir}/${f}`, 'utf8');
  const wireTok = T(wire);
  totWire += wireTok;
  let best = null;
  for (const [vname, seps] of [['punct', SEPS], ['punct+L', SEPS_L]]) {
    const shapes = shapesOf(wire, seps);
    if (!shapes.length) continue;
    const chars = new Set(wire);
    const marks = MARK.filter(m => !chars.has(m) && T(m) === 1);
    if (marks.length < 2) continue;
    const esc = marks[marks.length - 1]; const pool = marks.slice(0, -1);
    const used = new Set(); const chosen = [];
    for (let k = 0; k < Math.min(4, shapes.length); k++) {
      const sh = shapes[k]; let mark = '';
      if (used.has(sh.total)) { const g = pool[chosen.filter(c => c.mark).length]; if (!g) continue; mark = g; }
      else used.add(sh.total);
      chosen.push({ shape: sh, mark });
      const ap = applyPlan(wire, chosen, seps);
      const dl = new Set(chosen.filter(c => !c.mark).map(c => c.shape.total));
      const es = escapes(ap.text, dl, ap.packedStarts, esc);
      const delta = wireTok - T(es.text);
      for (const c of [cT1(chosen), cT3(chosen)]) {
        const full = es.n ? c + ` A digit run followed by ${esc} keeps its digits; delete the ${esc}.` : c;
        const ct = T(full);
        const net = delta - ct;
        if (!best || net > best.net) best = { net, delta, ct, vname, shapes: chosen.map(x => (x.mark || '*') + x.shape.runs.join('-') + '×' + x.shape.count), esc: es.n };
      }
    }
  }
  if (!best || best.net <= 0) { console.log(`${f}\t${wireTok}\t0\t0\t0\t-`); continue; }
  wins++; totDelta += best.delta; totContract += best.ct; totNet += best.net;
  console.log(`${f}\t${wireTok}\t${best.delta}\t${best.ct}\t${best.net}\t${best.vname}\t${best.shapes.join(' ')}`);
}
console.log(`TOTAL wire ${totWire}  delta ${totDelta}  contract ${totContract}  net ${totNet}  wins ${wins}/${files.length}`);
