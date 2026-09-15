/** PRISM v2: cascade search with MOSAIC as a first-class stage. depth-1 => MOSAIC, so dominance is structural. */
import { corpus } from './fixtures';
import { countTokens } from '../src/lib/omega/bpe';
import { mosaicEncode, mosaicDecode } from '../src/lib/omega/mosaic';
import { auroraEncode, auroraDecode } from '../src/lib/omega/aurora';
import { signetEncode, signetDecode } from '../src/lib/omega/signet';
import { helixEncode, helixDecode } from '../src/lib/omega/helix';
import { pulseEncode, pulseDecode } from '../src/lib/omega/pulse';
import { anaphoraEncode, anaphoraDecode } from '../src/lib/omega/anaphora';
import { praxisEncode, praxisDecode } from '../src/lib/omega/praxis';
import { lumenEncode, lumenDecode } from '../src/lib/omega/lumen';

const enc = 'o200k_base' as const;
interface Lane { t: string; e: (s: string) => { wire: string; applied: boolean }; d: (w: string) => string }
const LANES: Lane[] = [
  { t: 'm', e: (s) => { const r = mosaicEncode(s, enc); return { wire: r.wire, applied: r.mode !== 'identity' }; }, d: mosaicDecode },
  { t: 'g', e: (s) => { const r = signetEncode(s, enc); return { wire: r.wire, applied: r.mode === 'signet' }; }, d: signetDecode },
  { t: 'h', e: (s) => { const r = helixEncode(s, enc); return { wire: r.wire, applied: r.mode === 'factored' }; }, d: helixDecode },
  { t: 'p', e: (s) => { const r = pulseEncode(s, enc); return { wire: r.wire, applied: r.mode === 'pulse' }; }, d: pulseDecode },
  { t: 'a', e: (s) => { const r = anaphoraEncode(s, enc); return { wire: r.wire, applied: r.mode === 'anaphoric' }; }, d: anaphoraDecode },
  { t: 'x', e: (s) => { const r = praxisEncode(s, enc); return { wire: r.wire, applied: r.mode === 'praxis' }; }, d: praxisDecode },
  { t: 'l', e: (s) => { const r = lumenEncode(s, enc); return { wire: r.wire, applied: r.mode === 'lumen' }; }, d: lumenDecode },
];
const BY = new Map(LANES.map((l) => [l.t, l]));
function dec(wire: string, tags: string) { let w = wire; for (let i = tags.length - 1; i >= 0; i--) w = BY.get(tags[i])!.d(w); return w; }

function search(src: string, maxd: number, budget: number) {
  const t0 = Date.now();
  let best = { tags: '', wire: src, tok: countTokens(src, enc) };
  let nodes = 0;
  const seen = new Set<string>();
  const rec = (wire: string, tags: string) => {
    if (tags.length >= maxd || nodes > budget) return;
    for (const lane of LANES) {
      if (nodes > budget) return;
      if (tags.indexOf(lane.t) !== -1) continue;
      let r; try { r = lane.e(wire); } catch { continue; }
      nodes++;
      if (!r.applied || r.wire === wire) continue;
      if (seen.has(r.wire)) continue;
      seen.add(r.wire);
      const nt = tags + lane.t;
      let ok = false; try { ok = dec(r.wire, nt) === src; } catch { ok = false; }
      if (ok) { const tk = countTokens(r.wire, enc); if (tk < best.tok) best = { tags: nt, wire: r.wire, tok: tk }; }
      rec(r.wire, nt);
    }
  };
  rec(src, '');
  return { ...best, ms: Date.now() - t0, nodes };
}

const c = corpus();
let sm = 0, sp = 0;
for (const [name, text] of Object.entries(c)) {
  const m = mosaicEncode(text, enc);
  const a = auroraEncode(text, enc);
  const s = search(text, 3, 4000);
  sm += m.outTokens; sp += s.tok;
  console.log(`${name.padEnd(11)} MOSAIC=${String(m.outTokens).padEnd(5)} AURORA=${String(a.outTokens).padEnd(5)} PRISM=${String(s.tok).padEnd(5)}[${s.tags || 'id'}] ${((1 - s.tok / m.outTokens) * 100).toFixed(1)}% ${s.ms}ms n=${s.nodes}`);
}
console.log(`TOTAL mosaic=${sm} prism=${sp} gain=${((1 - sp / sm) * 100).toFixed(2)}%`);
