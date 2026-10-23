// X39 verification: ANTISTROPHE vs OURA on every lane, with an independent
// reference decode.  The decoder applies the stack, THEN the exchange -- the
// order the contract states -- and the result must equal the source byte for
// byte.
import * as fs from 'node:fs';
import { antistropheEncode, antistropheDecode, antistropheShow } from '@/lib/omega/antistrophe';
import { chironDecode } from '@/lib/omega/chiron';

const enc: any = 'o200k_base';

for (const p of (process.env.LANES || '').split(',').filter(Boolean)) {
  if (!fs.existsSync(p)) continue;
  const t = fs.readFileSync(p, 'utf8');
  const t0 = Date.now();
  let r: any;
  try { r = antistropheEncode(t, enc); } catch (e: any) {
    console.log(p.split('/').pop()!.padEnd(26), 'THREW', String(e).slice(0, 80));
    continue;
  }
  const back = antistropheDecode(r.wire, {
    stats: r.stats, order: r.order,
    undo: r.parent === 'identity' ? (w: string) => w : chironDecode,
  } as any, {
    alphabet: r.alphabet, marker: r.marker, marker2: r.marker2, group: r.syncopeGroup,
    framing: r.framing, ouraShape: r.ouraShape, ouraMode: r.ouraMode,
    ouraSentinel: r.ouraSentinel, antistrophePair: r.antistrophePair,
  } as any);
  const pair = r.antistrophePair
    ? `${antistropheShow(r.antistrophePair[0])}<->${antistropheShow(r.antistrophePair[1])}`
    : '-';
  console.log(
    p.split('/').pop()!.padEnd(26),
    'tok=' + String(r.messageTokens).padStart(5),
    'anti=' + (r.antistrophe ? 'Y' : 'n'),
    'gain=' + String(r.antistropheGain).padStart(4),
    'pair=' + pair.padEnd(9),
    'clause=' + String(r.antistropheClauseTokens ?? (r.antistropheClause ? r.antistropheClause.length : 0)),
    'pairs=' + String(r.antistrophePairs).padStart(3),
    (back === t ? 'EXACT' : '***MISMATCH***'),
    ((Date.now() - t0) / 1000).toFixed(0) + 's',
  );
}
