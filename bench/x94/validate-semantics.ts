/**
 * X94 — DOES THE PROBE'S OWN PARSER AGREE WITH THE REAL DECODER?
 *
 * tape-marginal.ts scores every move with countTokensExact on the whole message, and asserts each
 * move's fidelity by re-expanding with ITS OWN `expand`. That assertion is self-consistency, not
 * correctness: if `entries`/`expand` disagree with the shipped decoder, every number in the
 * receipt is a proxy -- the exact trap this repository keeps recording (ΑΝΤΙΓΡΑΦΟΝ's census
 * overstated by 2.2x, `account.mjs`'s residue column 3482 isolated against 2417 in situ).
 *
 * The independent check available offline is the SOURCE TEXT. The wires in
 * bench/x87/receipts/wires/ are committed messages whose sources are committed lanes, so
 * expanding a wire with the probe's semantics must reproduce its lane byte for byte. If it does,
 * the probe's semantics are the decoder's semantics on that lane and the marginal numbers are
 * real; if it does not, the lane's numbers are quarantined rather than reported.
 *
 * ZERO frontier calls. Locates each source by basename under bench/holdout*, resolving the known
 * basename collisions (two df-h.txt, two dpkg-l.txt) by exact byte equality against the expansion.
 */
import { countTokensExact } from '../../src/lib/omega/bpe';
import * as fs from 'node:fs';
import * as path from 'node:path';

const ENC = 'o200k_base' as const;
type Entry = { g: string; v: string };

function split(wire: string) {
  const sec = wire.indexOf('§');
  const pil = sec >= 0 ? wire.indexOf('¶', sec) : -1;
  if (sec < 0 || pil < 0) throw new Error('wire has no tape');
  return { contract: wire.slice(0, sec), tape: wire.slice(sec + 1, pil), body: wire.slice(pil + 1) };
}
function entries(tape: string): Entry[] {
  const seen = new Set<string>(); const out: Entry[] = []; let cur: Entry | null = null;
  for (const ch of tape) {
    if (ch.codePointAt(0)! > 127 && !seen.has(ch)) { seen.add(ch); cur = { g: ch, v: '' }; out.push(cur); }
    else if (cur) cur.v += ch;
  }
  return out;
}
function expand(body: string, ents: Entry[]): string {
  const map = new Map(ents.map(e => [e.g, e.v]));
  let s = body;
  for (let i = 0; i < 64; i++) {
    let next = ''; let changed = false;
    for (const ch of s) { const v = map.get(ch); if (v === undefined) next += ch; else { next += v; changed = true; } }
    s = next; if (!changed) break;
  }
  return s;
}
function walk(dir: string, out: string[] = []): string[] {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out); else out.push(p);
  }
  return out;
}
// `bench` also contains FILES starting with "holdout" (bench/holdout.ts), and scandir on a file
// throws ENOTDIR -- the first run died here. Filter on the dirent, not the name.
const roots = fs.readdirSync('bench', { withFileTypes: true })
  .filter(e => e.isDirectory() && e.name.startsWith('holdout')).map(e => 'bench/' + e.name);
const pool = roots.flatMap(r => walk(r));

const wires = process.argv.slice(2);
const L: string[] = [];
L.push('lane'.padEnd(14) + 'srcPath'.padEnd(46) + 'bytes  exact  contractHasExtraRules');
let nExact = 0, nTotal = 0;
const rows: any[] = [];
for (const f of wires) {
  const wire = fs.readFileSync(f, 'utf8');
  const lane = path.basename(f).replace('.wire.txt', '');
  const { contract, tape, body } = split(wire);
  const dec = expand(body, entries(tape));
  // The contract may carry rules beyond "expand repeatedly" (ls-l-real's `~` infix rule). Those
  // are decoder behaviour this probe does not implement, so the expansion cannot match the source
  // there -- record it as a KNOWN GAP rather than silently reporting a mismatch.
  const extra = !/^Before ¶ k=v\. expand repeatedly; print only\.\n?$/.test(contract);
  const cands = pool.filter(p => path.basename(p).replace(/\.(txt|md|ts|json|log|patch|csv|tsv)$/,'').replace('.wire','') === lane.replace(/\.(txt|md|ts|json|log)$/,''));
  let match = '', ok = false;
  for (const c of cands) { const src = fs.readFileSync(c, 'utf8'); if (src === dec) { match = c; ok = true; break; } }
  if (!ok) for (const c of pool) { const src = fs.readFileSync(c, 'utf8'); if (src === dec) { match = c + ' (basename differs)'; ok = true; break; } }
  nTotal++; if (ok) nExact++;
  L.push(lane.padEnd(14) + (match || (cands[0] ?? 'NONE FOUND') + ' MISMATCH').padEnd(46) +
    String(fs.statSync(match || cands[0] || f).size).padStart(6) + (ok ? '  EXACT' : '  NO   ') + '  ' + (extra ? 'YES ' + JSON.stringify(contract.slice(0, 60)) : 'no'));
  rows.push({ lane, path: match || null, exact: ok, extraContractRules: extra, decodedChars: dec.length,
              decodedTokens: countTokensExact(dec, ENC), contract, candidates: cands });
}
L.push('-'.repeat(100));
L.push(`SOURCE-EXACT: ${nExact}/${nTotal} wires reproduce their committed lane byte for byte under the probe's own semantics.`);
L.push('Lanes that are NOT source-exact are quarantined: their tape-marginal numbers are a proxy and must not be reported as measurements.');
const log = L.join('\n') + '\n';
fs.writeFileSync('bench/x94/receipts/validate-semantics.json', JSON.stringify({ generatedBy: 'bench/x94/validate-semantics.ts', rows }, null, 1) + '\n');
fs.writeFileSync('bench/x94/receipts/validate-semantics.log', log);
console.log(log);
