/**
 * X46 screen 2 — CAN A TOKENIZATION-FREE FEATURE PREDICT WHICH LANES NEED CAP 4?
 *
 * The cap curve is settled and it is not what either X45 or the X24 constant
 * assumed. On dump.sql at the oikonomia level: cap 1 gives 684, cap 2 gives 686 --
 * WORSE than cap 1, so the 'in' shape search is not a descent -- and cap 4 gives
 * 662, which cap 6, 8 and 12 all reproduce exactly. So the curve SATURATES AT 4,
 * the inherited constant is correct, and every cap above it is wasted work. On the
 * eleven lanes where METRON matched its parent, cap 1 already equals cap 4.
 *
 * The marginal value of a shape trial is therefore not small and uniform: it is
 * ZERO on eleven lanes and TWENTY TOKENS on one. A per-document cap needs a
 * predictor, and X45 refuted two candidates. This tests a third, of a different
 * kind: a structural feature of the SOURCE computed with no tokenization at all, so
 * its cost is a linear scan rather than a fraction of the search budget.
 *
 * That framing is per-instance algorithm selection, and arXiv 2605.04954 is the
 * honest reference for it: PIAS is viable even when a quarter of the budget goes to
 * feature computation, but 11 to 28 per cent of its loss to the virtual best solver
 * is caused by the feature budget itself. A feature that costs nothing to compute
 * sidesteps that tax entirely. The same literature requires what X45 did not do --
 * separate the instances used to CHOOSE the threshold from instances used to TEST
 * it -- so the unused held-out files are scored here too.
 *
 * The error modes are asymmetric and the feature must be read with that in mind. A
 * false positive escalates a lane that did not need it: time lost, tokens
 * unchanged, SAFE. A false negative leaves a lattice lane at cap 1: tokens lost,
 * UNSAFE. So the threshold must be set to never false-negative on a measured
 * lattice lane, and the speedup is whatever survives that constraint.
 *
 * SYMPLOKE's learned tier is a constant-width column lattice, so the feature asked
 * for is: how much of this document is made of rows sharing one field-width
 * signature?
 */
import { readFileSync, existsSync } from 'node:fs';

const SEPS = [',', '\t', '|', ';'];

/** Field-width signature of one line under a given separator. */
function signature(line: string, sep: string): string | null {
  if (!line.includes(sep)) return null;
  const f = line.split(sep);
  if (f.length < 2) return null;
  return f.map((x) => x.length).join('.');
}

function features(text: string) {
  const lines = text.split('\n');
  const nonEmpty = lines.filter((l) => l.trim().length > 0);
  let best = { sep: '', coverLines: 0, coverChars: 0, sig: '', distinct: 0 };
  for (const sep of SEPS) {
    const counts = new Map<string, { n: number; ch: number }>();
    for (const l of nonEmpty) {
      const s = signature(l, sep);
      if (s === null) continue;
      const e = counts.get(s) ?? { n: 0, ch: 0 };
      e.n++; e.ch += l.length; counts.set(s, e);
    }
    if (!counts.size) continue;
    let topSig = '', topN = 0, topCh = 0;
    for (const [s, e] of counts) if (e.n > topN) { topN = e.n; topSig = s; topCh = e.ch; }
    if (topN > best.coverLines) {
      best = { sep, coverLines: topN, coverChars: topCh, sig: topSig, distinct: counts.size };
    }
  }
  const totalLines = Math.max(nonEmpty.length, 1);
  const totalChars = Math.max(text.length, 1);
  // a lattice needs the SAME signature repeated many times, and few competing ones
  const lineFrac = best.coverLines / totalLines;
  const charFrac = best.coverChars / totalChars;
  const purity = best.distinct ? best.coverLines / (best.distinct + best.coverLines) : 0;
  return { sep: best.sep, coverLines: best.coverLines, lines: nonEmpty.length, lineFrac, charFrac, distinct: best.distinct, purity, sig: best.sig };
}

// lanes whose cap1-vs-cap4 outcome was MEASURED through the full stack in X45
const OUTCOME: Record<string, string> = {
  'dump.sql': 'NEEDS cap4 (668 vs 608, -60)',
  'chart.svg': 'cap1 free (417=417)', 'ls-full-iso.txt': 'cap1 free (364=364)',
  'page.html': 'cap1 free (547=547)', 'prose-01.txt': 'cap1 free (736=736)',
  'meeting-transcript.txt': 'cap1 free (384=384)', 'email-thread.txt': 'cap1 free (488=488)',
  'bibliography.txt': 'cap1 free (667=667)', 'readme.txt': 'cap1 free (646=646)',
  'component.jsx': 'cap1 free (264=264)', 'kb-article.txt': 'cap1 free (622=622)',
  'pom.xml': 'cap1 free (242=242)',
};

const groups: Array<[string, string[]]> = [
  ['MEASURED (threshold must be set on these)', (process.env.LANES || '').split(',').map(s=>s.trim()).filter(Boolean)],
  ['HELD OUT (never used to choose anything)', (process.env.HOLDOUT || '').split(',').map(s=>s.trim()).filter(Boolean)],
];

for (const [gname, paths] of groups) {
  if (!paths.length) continue;
  console.log(`\n===== ${gname}`);
  console.log('lane'.padEnd(26) + 'sep'.padStart(4) + 'cover/lines'.padStart(12) + 'lineFrac'.padStart(9) +
    'charFrac'.padStart(9) + 'distinct'.padStart(9) + 'purity'.padStart(8) + '  outcome / modal signature');
  for (const p of paths) {
    if (!existsSync(p)) { console.log(`${p} MISSING`); continue; }
    const t = readFileSync(p, 'utf8');
    const f = features(t);
    console.log(p.split('/').pop()!.padEnd(26) + JSON.stringify(f.sep).padStart(4) +
      `${f.coverLines}/${f.lines}`.padStart(12) + f.lineFrac.toFixed(3).padStart(9) +
      f.charFrac.toFixed(3).padStart(9) + String(f.distinct).padStart(9) + f.purity.toFixed(3).padStart(8) +
      `  ${(OUTCOME[p.split('/').pop()!] ?? 'HELD OUT').padEnd(30)} ${f.sig.slice(0, 34)}`);
  }
}
