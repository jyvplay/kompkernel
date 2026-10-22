// X41 verification: SYSTOLE vs PERITROPE, byte-exact against an independent
// reference decode.  Decoding undoes the stack, then PERITROPE's exchanges,
// then restores the separators by template.
import * as fs from 'node:fs';
import { systoleEncode, systoleDecode } from '@/lib/omega/systole';
import { chironDecode } from '@/lib/omega/chiron';
const enc: any = 'o200k_base';
for (const p of (process.env.LANES || '').split(',').filter(Boolean)) {
  if (!fs.existsSync(p)) { console.log('MISSING', p); continue; }
  const t = fs.readFileSync(p, 'utf8');
  const t0 = Date.now();
  let r: any;
  try { r = systoleEncode(t, enc); } catch (e: any) {
    console.log(p.split('/').pop()!.padEnd(26), 'THREW', String(e).slice(0, 70)); continue;
  }
  const back = systoleDecode(r.wire, {
    stats: r.stats, order: r.order,
    undo: r.parent === 'identity' ? (w: string) => w : chironDecode,
  } as any, {
    alphabet: r.alphabet, marker: r.marker, marker2: r.marker2, group: r.syncopeGroup,
    framing: r.framing, ouraShape: r.ouraShape, ouraMode: r.ouraMode,
    ouraSentinel: r.ouraSentinel, antistrophePair: r.antistrophePair,
    peritropePairs: r.peritropePairs, systoleTemplates: r.systoleTemplates,
  } as any);
  const tp = (r.systoleTemplates || []).map((x: any) => x.digits + ':' + x.shape).join(',');
  console.log(
    p.split('/').pop()!.padEnd(26),
    'tok=' + String(r.messageTokens).padStart(5),
    'sys=' + (r.systole ? 'Y' : 'n'),
    'gain=' + String(r.systoleGain).padStart(5),
    'raw=' + String(r.systoleRawSave).padStart(5),
    'k=' + (r.peritropePairs ? r.peritropePairs.length : 0),
    'tmpl=' + tp.padEnd(26),
    (back === t ? 'EXACT' : '***MISMATCH***'),
    ((Date.now() - t0) / 1000).toFixed(0) + 's',
  );
}
