/** X87 — red-team the Ω-Ξ atom envelope.
 *  The encoder is round-trip gated, so it never SHIPS an unverified wire. But the
 *  decoder has no integrity field: `unpackWire` trusts the 4-byte header, reads
 *  exactly payloadLen bytes and never checks that all atoms were consumed. So the
 *  open question is what a CORRUPTED wire does. Three answers are possible and only
 *  one is acceptable: it refuses (throws), it returns the original (impossible for a
 *  real mutation), or it silently returns WRONG TEXT. This measures which, and how often.
 *  It also measures the cross-environment hazard: a wire whose winning payload codec
 *  is Node's non-standard CompressionStream('brotli') decoded where brotli is refused. */
import * as fs from 'node:fs';
import { omegaXiCompress, omegaXiDecode } from '../../src/lib/omega/atom-codec';
import { buildAtomAlphabet, countTokens } from '../../src/lib/omega/bpe';
const enc: any = 'o200k_base';
const alpha = buildAtomAlphabet(enc);
const M = alpha.atoms.length;
console.log(`atom alphabet: M=${M} bits=${alpha.bits} fingerprint=${alpha.fingerprint}`);

const RealCS = (globalThis as any).CompressionStream;
function setEnv(kind: 'node' | 'browser' | 'pure-ts') {
  if (kind === 'node') { (globalThis as any).CompressionStream = RealCS; return; }
  if (kind === 'pure-ts') { delete (globalThis as any).CompressionStream; return; }
  (globalThis as any).CompressionStream = class { constructor(f: string) {
    if (f === 'brotli' || f === 'br') throw new TypeError('unsupported format'); return new RealCS(f); } };
}

// deterministic PRNG so the whole fuzz is reproducible
let seed = 0x2f6e2b1; const rnd = () => { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return (seed >>> 0) / 4294967296; };
const ri = (n: number) => Math.floor(rnd() * n);
const randAtom = () => alpha.atoms[ri(M)];

const KINDS = ['flip', 'header-flip', 'swap', 'delete', 'truncate1', 'truncate2', 'extend', 'whitespace'] as const;
function mutate(wire: string, kind: string): string {
  const a = wire.split(' ').filter(Boolean);
  const p = ri(a.length);
  switch (kind) {
    case 'flip': { let x = randAtom(); let g = 0; while (x === a[p] && g++ < 8) x = randAtom(); a[p] = x; return a.join(' '); }
    case 'header-flip': { let x = randAtom(); let g = 0; while (x === a[0] && g++ < 8) x = randAtom(); a[0] = x; return a.join(' '); }
    case 'swap': { const q = ri(a.length); const t = a[p]; a[p] = a[q]; a[q] = t; return a.join(' '); }
    case 'delete': a.splice(p, 1); return a.join(' ');
    case 'truncate1': return a.slice(0, -1).join(' ');
    case 'truncate2': return a.slice(0, -2).join(' ');
    case 'extend': return a.join(' ') + ' ' + randAtom();
    case 'whitespace': return wire.replace(' ', '  ');
  }
  return wire;
}

const lanes = (JSON.parse(fs.readFileSync('bench/x80/receipts/frontier.json', 'utf8'))).rows;
const N = Number(process.env.XIFUZZ_N ?? 24);
const tally: Record<string, number> = {};
const wrongs: any[] = [];
let hangs = 0, total = 0;
const t00 = Date.now();

setEnv('pure-ts');
for (const r of lanes) {
  const S = fs.readFileSync(r.path, 'utf8');
  const xi: any = await omegaXiCompress(S, enc);
  const wire: string = xi.output;
  const base: any = await omegaXiDecode(wire, enc);
  if (base !== S) { console.log('BASELINE MISMATCH', r.path); continue; }
  const per: Record<string, number> = {};
  for (const kind of KINDS) {
    for (let i = 0; i < N; i++) {
      const w = mutate(wire, kind); total++;
      const t0 = Date.now();
      let cls: string;
      try {
        const out: any = await omegaXiDecode(w, enc);
        cls = out === S ? 'EXACT(no-op)' : 'WRONG(silent)';
        if (cls === 'WRONG(silent)') wrongs.push({ lane: r.path.split('/').pop(), kind, atoms: w.split(' ').length, outLen: out.length, srcLen: S.length, ms: Date.now() - t0 });
      } catch (e: any) { cls = 'REFUSED:' + String(e?.message ?? e).slice(0, 44); }
      if (Date.now() - t0 > 20000) { hangs++; }
      const key = cls.startsWith('REFUSED') ? 'REFUSED' : cls;
      tally[key] = (tally[key] ?? 0) + 1; per[key] = (per[key] ?? 0) + 1;
    }
  }
  console.log(`${r.path.split('/').pop()!.padEnd(22)} atoms=${String(wire.split(' ').length).padStart(5)} tok=${String(countTokens(wire, enc)).padStart(5)}  ` +
    Object.entries(per).map(([k, v]) => `${k}=${v}`).join(' ') + `  ${((Date.now() - t00) / 1000).toFixed(0)}s`);
  fs.mkdirSync('bench/x87/receipts', { recursive: true });
  fs.writeFileSync('bench/x87/receipts/xi-fuzz.json', JSON.stringify({ M, bits: alpha.bits, N, kinds: KINDS, total, tally, hangs, wrongs: wrongs.slice(0, 60), wrongCount: wrongs.length }, null, 1) + '\n');
}

// cross-environment hazard: encode where Node's brotli exists, decode where it does not
setEnv('node');
let crossFail = 0, crossSilent = 0, crossOk = 0, crossLanes = 0;
for (const r of lanes) {
  const S = fs.readFileSync(r.path, 'utf8');
  const xi: any = await omegaXiCompress(S, enc);
  if ((xi.codecId ?? xi.codec) !== 3) continue;   // only brotli-payload wires are at risk
  crossLanes++;
  setEnv('browser');
  try { const out: any = await omegaXiDecode(xi.output, enc); if (out === S) crossOk++; else crossSilent++; }
  catch { crossFail++; }
  setEnv('node');
}
console.log(`\nTOTAL mutations ${total}  tally ${JSON.stringify(tally)}  hangs ${hangs}  silent-wrong ${wrongs.length}`);
console.log(`CROSS-ENV (node-brotli wire decoded where brotli is refused): lanes=${crossLanes} loud-fail=${crossFail} silent-wrong=${crossSilent} still-ok=${crossOk}`);
fs.writeFileSync('bench/x87/receipts/xi-fuzz.json', JSON.stringify({ M, bits: alpha.bits, N, kinds: KINDS, total, tally, hangs, wrongs: wrongs.slice(0, 60), wrongCount: wrongs.length, crossEnv: { crossLanes, crossFail, crossSilent, crossOk } }, null, 1) + '\n');
