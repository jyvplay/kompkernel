// X19: "class-anchored constant elision".
// A constant string Y that sits immediately after every maximal digit run (or before
// every one, or at every line start/end) cannot be folded by a literal-string grammar:
// the digit run varies, so DAEDALUS must pay a token per occurrence. Declaring
// "after every digit run insert Y" costs one clause and ZERO tokens per occurrence.
// This measures the size of that prize on the raw lanes and on the saved wires.
import fs from 'node:fs';
import { encode } from 'gpt-tokenizer';
const T = s => encode(s).length;
const isD = c => c >= '0' && c <= '9';

function digitRuns(t) {
  const out = [];
  let i = 0;
  while (i < t.length) {
    if (!isD(t[i])) { i++; continue; }
    let j = i; while (j < t.length && isD(t[j])) j++;
    out.push([i, j]); i = j;
  }
  return out;
}

/**
 * For each maximal digit run, take the constant string that follows it (up to `maxLen`
 * characters, stopping at another digit). Histogram those strings.
 */
function afterDigitHistogram(t, maxLen) {
  const runs = digitRuns(t);
  const h = new Map();
  for (const [, e] of runs) {
    for (let L = 1; L <= maxLen; L++) {
      if (e + L > t.length) break;
      const s = t.slice(e, e + L);
      if (/[0-9]/.test(s)) break;
      h.set(s, (h.get(s) ?? 0) + 1);
    }
  }
  return h;
}
function beforeDigitHistogram(t, maxLen) {
  const runs = digitRuns(t);
  const h = new Map();
  for (const [s0] of runs) {
    for (let L = 1; L <= maxLen; L++) {
      if (s0 - L < 0) break;
      const s = t.slice(s0 - L, s0);
      if (/[0-9]/.test(s)) break;
      h.set(s, (h.get(s) ?? 0) + 1);
    }
  }
  return h;
}
function lineStartHistogram(t, maxLen) {
  const h = new Map();
  const lines = t.split('\n');
  for (const l of lines) {
    for (let L = 1; L <= maxLen && L <= l.length; L++) h.set(l.slice(0, L), (h.get(l.slice(0, L)) ?? 0) + 1);
  }
  return h;
}

function report(name, t) {
  const rows = [];
  for (const [label, h] of [['afterDigit', afterDigitHistogram(t, 8)], ['beforeDigit', beforeDigitHistogram(t, 8)], ['lineStart', lineStartHistogram(t, 12)]]) {
    // value = occurrences * tokens(saved) ; a string of L chars costs >=1 token
    const best = [...h.entries()]
      .map(([s, n]) => ({ s, n, tok: T(s), val: n * T(s) }))
      .filter(x => x.n >= 3)
      .sort((a, b) => b.val - a.val)
      .slice(0, 6);
    rows.push(`    ${label}: ` + (best.length ? best.map(x => `${JSON.stringify(x.s)}×${x.n}(~${x.val}tok)`).join(' ') : '-'));
  }
  console.log(`${name}\n${rows.join('\n')}`);
}

const lanes = fs.readFileSync('bench/x16/lanes-all.txt', 'utf8').split('\n').filter(Boolean);
const only = process.argv.slice(2);
for (const f of lanes) {
  if (only.length && !only.some(o => f.includes(o))) continue;
  report(f, fs.readFileSync(f, 'utf8'));
}
