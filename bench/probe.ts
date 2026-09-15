/** Probe: do 2-stage pipelines and extra lanes beat single lanes per region? */
import { corpus } from './fixtures';
import { countTokens } from '../src/lib/omega/bpe';
import { mosaicEncode } from '../src/lib/omega/mosaic';
import { signetEncode, signetDecode } from '../src/lib/omega/signet';
import { helixEncode, helixDecode } from '../src/lib/omega/helix';
import { pulseEncode, pulseDecode } from '../src/lib/omega/pulse';
import { anaphoraEncode, anaphoraDecode } from '../src/lib/omega/anaphora';
import { lumenEncode, lumenDecode } from '../src/lib/omega/lumen';
import { praxisEncode, praxisDecode } from '../src/lib/omega/praxis';

const enc = 'o200k_base' as const;
type L = { t: string; e: (s: string) => { wire: string; applied: boolean }; d: (w: string) => string };
const L: L[] = [
  { t: 'g', e: (s) => { const r = signetEncode(s, enc); return { wire: r.wire, applied: r.mode === 'signet' }; }, d: signetDecode },
  { t: 'h', e: (s) => { const r = helixEncode(s, enc); return { wire: r.wire, applied: r.mode === 'factored' }; }, d: helixDecode },
  { t: 'p', e: (s) => { const r = pulseEncode(s, enc); return { wire: r.wire, applied: r.mode === 'pulse' }; }, d: pulseDecode },
  { t: 'a', e: (s) => { const r = anaphoraEncode(s, enc); return { wire: r.wire, applied: r.mode === 'anaphoric' }; }, d: anaphoraDecode },
  { t: 'l', e: (s) => { const r = lumenEncode(s, enc); return { wire: r.wire, applied: r.mode === 'lumen' }; }, d: lumenDecode },
  { t: 'x', e: (s) => { const r = praxisEncode(s, enc); return { wire: r.wire, applied: r.mode === 'praxis' }; }, d: praxisDecode },
];

function tryPipe(src: string, tags: string): number | null {
  let w = src;
  const used: L[] = [];
  for (const t of tags) {
    const lane = L.find((z) => z.t === t)!;
    let r; try { r = lane.e(w); } catch { return null; }
    if (!r.applied) return null;
    w = r.wire; used.push(lane);
  }
  let back = w;
  for (let i = used.length - 1; i >= 0; i--) { try { back = used[i].d(back); } catch { return null; } }
  if (back !== src) return null;
  return countTokens(w, enc);
}

const c = corpus();
const pipes: string[] = [];
for (const a of L) { pipes.push(a.t); for (const b of L) if (b.t !== a.t) pipes.push(a.t + b.t); }

for (const [name, text] of Object.entries(c)) {
  const inT = countTokens(text, enc);
  const m = mosaicEncode(text, enc);
  const res: [string, number][] = [];
  for (const p of pipes) { const v = tryPipe(text, p); if (v !== null) res.push([p, v]); }
  res.sort((a, b) => a[1] - b[1]);
  const best1 = res.filter((r) => r[0].length === 1)[0];
  console.log(`${name.padEnd(11)} in=${String(inT).padEnd(5)} mosaic=${String(m.outTokens).padEnd(5)} best1=${best1 ? best1[0] + ':' + best1[1] : '-'}  top5=${res.slice(0, 5).map((r) => r[0] + ':' + r[1]).join(' ')}`);
}
