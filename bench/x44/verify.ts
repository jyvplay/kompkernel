/**
 * X44 verification — ANALEPSIS against the recorded frontier.
 *
 * Three claims, checked in one process:
 *   1. NON-REGRESSION. messageTokens must be <= the frontier recorded at the end
 *      of X42/X43. ANALEPSIS accepts an addition only on a measured reduction of
 *      the whole frame, so a regression would be a bug, not a trade-off.
 *   2. BYTE-EXACT. The augmented wire must decode to the source through the full
 *      chain, independently of the check the encoder already ran.
 *   3. HONEST SIZE. Report what it actually gained, including zero.
 */
import { readFileSync, existsSync } from 'node:fs';
import { analepsisEncode, analepsisDecode } from '@/lib/omega/analepsis';
import { chironDecode } from '@/lib/omega/chiron';

const enc: any = 'o200k_base';

const FRONTIER: Record<string, number> = {
  'vix-daily-1990.csv': 550, 'aapl-2014.csv': 1407, 'openstack-loghub-26.log': 894,
  'dump.sql': 608, 'git-numstat.txt': 1906, 'find-listing.txt': 1218,
  'ls-full-iso.txt': 366, 'kb-article.txt': 622, 'prose-01.txt': 737,
  'readme.txt': 646, 'bibliography.txt': 667, 'email-thread.txt': 488,
  'chart.svg': 417, 'page.html': 547, 'meeting-transcript.txt': 384,
  'component.jsx': 264, 'pom.xml': 242,
  'prose-02.txt': 789, 'prose-03.txt': 837, 'prose-04.txt': 836,
  'prose-05.txt': 920, 'prose-06.txt': 840, 'prose-07.txt': 809,
};

console.log('lane'.padEnd(24) + 'analepsis'.padStart(10) + 'front'.padStart(7) + 'delta'.padStart(7) +
  '  rt'.padStart(5) + ' added'.padStart(7) + '  time'.padStart(8) + '  phrases');

let nOk = 0, nTot = 0, totalGain = 0;
for (const p of (process.env.LANES || '').split(',').map((s) => s.trim()).filter(Boolean)) {
  if (!existsSync(p)) { console.log(`${p} MISSING`); continue; }
  const t = readFileSync(p, 'utf8');
  const nm = p.split('/').pop()!;
  const t0 = Date.now();
  let r: any;
  try { r = analepsisEncode(t, enc); } catch (e: any) {
    console.log(nm.padEnd(24) + ' THREW ' + String(e).slice(0, 70)); continue;
  }
  const ms = Date.now() - t0;
  const back = analepsisDecode(r.wire, {
    stats: r.stats, order: r.order,
    undo: r.parent === 'identity' ? (w: string) => w : chironDecode,
  } as any, {
    alphabet: r.alphabet, marker: r.marker, marker2: r.marker2, group: r.syncopeGroup,
    framing: r.framing, ouraShape: r.ouraShape, ouraMode: r.ouraMode,
    ouraSentinel: r.ouraSentinel, antistrophePair: r.antistrophePair,
    peritropePairs: r.peritropePairs, systoleTemplates: r.systoleTemplates,
    apocopeTemplates: r.apocopeTemplates,
  } as any);
  const rt = back === t;
  const front = FRONTIER[nm];
  const delta = front === undefined ? NaN : front - r.messageTokens;
  nTot++;
  if (rt && (front === undefined || r.messageTokens <= front)) nOk++;
  if (!isNaN(delta)) totalGain += delta;
  console.log(
    nm.padEnd(24) + String(r.messageTokens).padStart(10) + String(front ?? '-').padStart(7) +
    (isNaN(delta) ? '-' : (delta > 0 ? '-' + delta : delta === 0 ? '  0' : '+' + (-delta))).padStart(7) +
    (rt ? '  OK' : ' FAIL').padStart(5) + String(r.analepsisAdded).padStart(7) +
    ((ms / 1000).toFixed(1) + 's').padStart(8) +
    '  ' + (r.analepsisPhrases ?? []).map((s: string) => JSON.stringify(s.slice(0, 26))).join(' '));
}
console.log(`\nnon-regressing and byte-exact: ${nOk}/${nTot}   total tokens gained: ${totalGain}`);
