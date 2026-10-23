/**
 * X45 screen 4 — DO THE SEARCH-BUDGET KNOBS CHANGE THE OUTPUT?
 *
 * Two knobs control how much search the bottom of the stack performs, and both are
 * already threaded from the top by object spread: inCap/inGate reach
 * symplokeEncode via metathesis.ts:290, and scriptTries is destructured at
 * heuresis.ts:104 where the comment says the encoder tries "two or three densest
 * scripts and never sees the rest".
 *
 * screen 2 showed inCap is dead weight at the oikonomia level: on pom.xml and
 * component.jsx every cap from 1 to 8 and both gate settings return the identical
 * message size, byte-exact, while cap 1 uses 1.67M countTokens calls against the
 * default's 2.98M and the ungated run's 5.60M. This asks the same question through
 * the FULL stack, where the layers above may interact, and adds scriptTries, which
 * nobody has measured. X44 found that permuting the rule alphabet onto any other
 * script makes the frame 53 to 85 tokens worse, which makes a single-script budget
 * plausible -- but plausible is not measured.
 *
 * A knob is only shippable if the message size is unchanged AND the wire decodes
 * byte-exact. Both are checked here.
 */
import { readFileSync } from 'node:fs';
import { chunkCacheStats, chunkCacheClear, countTokens, type EncodingName } from '@/lib/omega/bpe';
import { analepsisEncode, analepsisDecode } from '@/lib/omega/analepsis';
import { chironDecode } from '@/lib/omega/chiron';

const enc = (process.env.ENC || 'o200k_base') as EncodingName;
const calls = () => { const s = chunkCacheStats(); return s.shortHits + s.shortMisses + s.longHits + s.longMisses; };

const CONFIGS: Array<[string, Record<string, any>]> = [
  ['default          ', {}],
  ['inCap=1          ', { inCap: 1, inGate: 1 }],
  ['inCap=1,scripts=1', { inCap: 1, inGate: 1, scriptTries: 1 }],
  ['scripts=1 only   ', { scriptTries: 1 }],
];

for (const p of (process.env.LANES || '').split(',').map((s) => s.trim()).filter(Boolean)) {
  const t = readFileSync(p, 'utf8');
  console.log(`\n=== ${p.split('/').pop()}  (${t.length} chars, ${countTokens(t, enc)} raw)`);
  console.log('  config              msg      ms    calls(M)   rt   analepsis-added');
  let baseMsg = NaN;
  for (const [name, cfg] of CONFIGS) {
    chunkCacheClear();
    const before = calls();
    const t0 = Date.now();
    let r: any;
    try { r = analepsisEncode(t, enc, cfg); } catch (e: any) {
      console.log(`  ${name} THREW ${String(e).slice(0, 60)}`); continue;
    }
    const ms = Date.now() - t0;
    const n = calls() - before;
    let rt = '?';
    try {
      rt = analepsisDecode(r.wire, { stats: r.stats, order: r.order, undo: r.parent === 'identity' ? (w: string) => w : chironDecode } as any,
        { alphabet: r.alphabet, marker: r.marker, marker2: r.marker2, group: r.syncopeGroup, framing: r.framing, ouraShape: r.ouraShape, ouraMode: r.ouraMode, ouraSentinel: r.ouraSentinel, antistrophePair: r.antistrophePair, peritropePairs: r.peritropePairs, systoleTemplates: r.systoleTemplates, apocopeTemplates: r.apocopeTemplates } as any) === t ? 'OK' : 'FAIL';
    } catch { rt = 'THREW'; }
    if (isNaN(baseMsg)) baseMsg = r.messageTokens;
    const rel = r.messageTokens === baseMsg ? 'same' : (r.messageTokens < baseMsg ? `BETTER by ${baseMsg - r.messageTokens}` : `WORSE by ${r.messageTokens - baseMsg}`);
    console.log(`  ${name} ${String(r.messageTokens).padStart(5)} ${String(ms).padStart(8)}  ${(n / 1e6).toFixed(2).padStart(8)}   ${rt.padEnd(4)} added=${r.analepsisAdded}  ${rel}`);
  }
}
