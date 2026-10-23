/**
 * X43 screen 6 — WOULD A CLAUSE-COST GATE SKIP THE WASTED TRIALS WITHOUT
 * SKIPPING ANY WINNER?
 *
 * The diagnosis: on pom.xml every layer from euteleia upward returns 242, the
 * value anadiplosis reached in 9.8 s, yet the stack spends 138 s. The trials are
 * not free and they are not informed: ANTISTROPHE auctions 10 pairs in 2 ms and
 * finds 5 with a NEGATIVE raw delta, so it runs two full 36 s lower-stack
 * encodes -- and both come back with no gain at all. A negative raw delta of one
 * or two tokens cannot repay a clause that costs eight to eleven.
 *
 * PERITROPE already reasons this way when choosing depth ("a pair that saves
 * three tokens raw may cost two to state"). Nothing applies the same reasoning as
 * a SKIP gate. This screen prices the gate on lanes where layers win and on
 * lanes where they do not, and reports whether a single threshold separates them.
 *
 * Gate: skip layer L's trials if  bestRawDelta(L) + clauseCost(L) >= 0.
 */
import { readFileSync } from 'node:fs';
import { countTokens, type EncodingName } from '@/lib/omega/bpe';
import { ouraFind } from '@/lib/omega/oura';
import { antistrophePairsFor, antistropheSwap, antistropheClausesFor } from '@/lib/omega/antistrophe';
import { peritropeSearch, peritropeApply, peritropeClauseFor } from '@/lib/omega/peritrope';
import { systoleChoose, systoleApply, systoleClauseFor } from '@/lib/omega/systole';
import { apocopeChoose, apocopeApply, apocopeClauseFor } from '@/lib/omega/apocope';

const enc = (process.env.ENC || 'o200k_base') as EncodingName;
const clauseTok = (c: string) => (c ? countTokens(' ' + c + ' print only.', enc) - countTokens(' print only.', enc) : 0);

// what actually won on each lane in X41/X42 (best-known minus its parent)
const KNOWN: Record<string, string> = {
  'find-listing.txt': 'PERITROPE -24', 'git-numstat.txt': 'PERITROPE -17',
  'openstack-loghub-26.log': 'PERITROPE -4', 'aapl-2014.csv': 'SYSTOLE -43',
  'vix-daily-1990.csv': 'SYSTOLE -29', 'bibliography.txt': 'SYSTOLE -4',
  'meeting-transcript.txt': 'SYSTOLE -1', 'ls-full-iso.txt': 'ANTISTROPHE',
  'pom.xml': 'nothing above anadiplosis', 'component.jsx': 'nothing above anadiplosis',
  'kb-article.txt': 'nothing above anadiplosis', 'chart.svg': 'nothing above anadiplosis',
};

for (const p of (process.env.LANES || '').split(',').map((s) => s.trim()).filter(Boolean)) {
  const t = readFileSync(p, 'utf8');
  const nm = p.split('/').pop()!;
  const base = countTokens(t, enc);
  const gates: string[] = [];

  // OURA: est = spans*(k-1) separators removed; each is worth at most ~1 token
  const shapes = ouraFind(t);
  const ouraEst = shapes.reduce((m, s) => Math.max(m, s.spans.length * (s.k - 1)), 0);
  gates.push(`oura est=${String(ouraEst).padStart(4)} shapes=${String(shapes.length).padStart(3)}${ouraEst < 8 ? ' SKIP' : ''}`);

  // ANTISTROPHE: measured raw auction + measured clause
  const pairs = antistrophePairsFor(t);
  let aBest = 0, aBestPair: [string, string] | null = null;
  for (const [a, b] of pairs) {
    const d = countTokens(antistropheSwap(t, a, b), enc) - base;
    if (d < aBest) { aBest = d; aBestPair = [a, b]; }
  }
  const aClause = aBestPair ? Math.min(...antistropheClausesFor(aBestPair[0], aBestPair[1]).map(clauseTok)) : 0;
  gates.push(`anti raw=${String(aBest).padStart(5)} cl=${String(aClause).padStart(3)}${aBest + aClause >= 0 ? ' SKIP' : ' KEEP'}`);

  // PERITROPE: beam search (cheap, no full encodes) + measured clause
  let pBest = 0;
  try {
    const ps = peritropeSearch(t, enc);
    for (let i = 0; i < ps.chains.length; i++) {
      const d = countTokens(peritropeApply(t, ps.chains[i]), enc) - base;
      const c = clauseTok(peritropeClauseFor(ps.chains[i]));
      if (d + c < pBest) pBest = d + c;
    }
  } catch { /* search may cap out on large inputs */ }
  gates.push(`peri raw+cl=${String(pBest).padStart(6)}${pBest >= 0 ? ' SKIP' : ' KEEP'}`);

  // SYSTOLE
  const sc = systoleChoose(t, enc);
  const sRaw = sc.reduce((s, x) => s + x.save, 0);
  const sCl = clauseTok(systoleClauseFor(sc));
  gates.push(`sys raw=${String(sRaw).padStart(5)} cl=${String(sCl).padStart(3)}${sRaw - sCl <= 0 ? ' SKIP' : ' KEEP'}`);

  // APOCOPE
  const ac = apocopeChoose(t, enc);
  const aRaw = ac.reduce((s, x) => s + x.save, 0);
  const aCl2 = clauseTok(apocopeClauseFor(ac));
  gates.push(`apo raw=${String(aRaw).padStart(5)} cl=${String(aCl2).padStart(3)}${aRaw - aCl2 <= 0 ? ' SKIP' : ' KEEP'}`);

  console.log(`\n${nm.padEnd(26)} known: ${KNOWN[nm] ?? '?'}`);
  for (const g of gates) console.log('   ' + g);
}
