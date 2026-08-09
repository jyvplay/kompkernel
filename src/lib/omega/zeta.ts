/**
 * src/lib/omega/zeta.ts — OMEGA-ZETA (Ζ) "DUPLEX SIDECAR CODEC"
 * Composes LTP + Prometheus orthogonally. See detailed JSDoc in the pasted spec.
 */
import { countTokens, type EncodingName } from './bpe';
import { ltpProject, ltpRestore, type LtpOp } from './ltp';
import {
  compressPrometheusICDM,
  decompressPrometheusICDM,
  type PrometheusCandidate,
} from './prometheus-icdm';

export type ZetaMode = 'LTP_ONLY' | 'PROMETHEUS_ONLY' | 'DUPLEX' | 'IDENTITY';

export interface ZetaResult {
  ok: boolean;
  encoding: EncodingName;
  mode: ZetaMode;
  wire: string;
  residual: LtpOp[];
  dictionary: PrometheusCandidate[];
  arenaDecoderBlock: string;
  inTokens: number;
  outTokens: number;
  savedTokens: number;
  savingsPct: number;
  ltpSavedTokens: number;
  prometheusSavedTokens: number;
  inChars: number;
  outChars: number;
  residualBytes: number;
  exact: boolean;
  notes: string;
}

function buildArenaDecoder(wire: string, residual: LtpOp[], mode: ZetaMode): string {
  return [
    '```typescript',
    `// OMEGA-ZETA decoder — Mode: ${mode}`,
    '// Tool output billed as input tokens, not output/CoT.',
    'function projectRun(run){let n=0;for(const c of run)if(c==="\\n")n++;if(n>=2)return"\\n\\n";if(n===1)return"\\n";return run.length>1?" ":run;}',
    'function ltpRestore(w,r){let o=w;for(let k=r.length-1;k>=0;k--){const p=projectRun(r[k].run);o=o.slice(0,r[k].at)+r[k].run+o.slice(r[k].at+p.length);}return o;}',
    'function dp(w){const H="[OMEGA-V4 IN-CONTEXT DICTIONARY]",T="[END DICTIONARY - REASON DIRECTLY OVER PAYLOAD BELOW]";if(!w.includes(H)||!w.includes(T))return w;const s=w.indexOf(H),e=w.indexOf(T);const head=w.slice(s+H.length,e).trim();let body=w.slice(e+T.length);if(body.startsWith("\\n\\n"))body=body.slice(2);else if(body.startsWith("\\n"))body=body.slice(1);const maps=[];for(const l of head.split("\\n")){const t=l.trim();if(!t)continue;const eq=t.indexOf("=");if(eq<=0)continue;try{maps.push({k:t.slice(0,eq).trim(),v:JSON.parse(t.slice(eq+1).trim())})}catch{}}let p=body;for(let i=maps.length-1;i>=0;i--)p=p.split(maps[i].k).join(maps[i].v);return p;}',
    `const wire=${JSON.stringify(wire)};`,
    `const residual=${JSON.stringify(residual)};`,
    'const exact=ltpRestore(dp(wire),residual);',
    'console.log(exact);',
    '```',
  ].join('\n');
}

export async function zetaEncode(text: string, enc: EncodingName): Promise<ZetaResult> {
  const inChars = text.length;
  const inTokens = countTokens(text, enc);
  const identity: ZetaResult = {
    ok: true, encoding: enc, mode: 'IDENTITY', wire: text, residual: [], dictionary: [],
    arenaDecoderBlock: '', inTokens, outTokens: inTokens, savedTokens: 0, savingsPct: 0,
    ltpSavedTokens: 0, prometheusSavedTokens: 0, inChars, outChars: inChars, residualBytes: 0,
    exact: true, notes: 'ZETA: identity — no candidate reduced real BPE tokens.',
  };
  if (!text || inTokens < 5) return identity;

  const ltp = ltpProject(text, enc);
  const prom = await compressPrometheusICDM(text, enc);

  let duplex: ZetaResult | null = null;
  if (ltp.applied) {
    const duplexProm = await compressPrometheusICDM(ltp.wire, enc);
    if (duplexProm.dictionaryCount > 0 && duplexProm.outTokens <= ltp.outTokens) {
      const restoredLtp = decompressPrometheusICDM(duplexProm.output);
      const restoredExact = ltpRestore(restoredLtp, ltp.residual);
      if (restoredExact === text) {
        const outTokens = duplexProm.outTokens;
        if (outTokens < inTokens) {
          const totalSaved = inTokens - outTokens;
          duplex = {
            ok: true, encoding: enc, mode: 'DUPLEX', wire: duplexProm.output,
            residual: ltp.residual, dictionary: duplexProm.candidates,
            arenaDecoderBlock: buildArenaDecoder(duplexProm.output, ltp.residual, 'DUPLEX'),
            inTokens, outTokens, savedTokens: totalSaved,
            savingsPct: (totalSaved / inTokens) * 100,
            ltpSavedTokens: ltp.savedTokens,
            prometheusSavedTokens: Math.max(0, totalSaved - ltp.savedTokens),
            inChars, outChars: duplexProm.output.length,
            residualBytes: ltp.residualBytes, exact: true,
            notes: 'ZETA DUPLEX: LTP + Prometheus composed. Wire readable; residual local.',
          };
        }
      }
    }
  }

  const cands: Array<{ result: ZetaResult; tok: number }> = [{ result: identity, tok: inTokens }];
  if (ltp.applied) {
    cands.push({
      result: {
        ok: true, encoding: enc, mode: 'LTP_ONLY', wire: ltp.wire, residual: ltp.residual,
        dictionary: [], arenaDecoderBlock: buildArenaDecoder(ltp.wire, ltp.residual, 'LTP_ONLY'),
        inTokens, outTokens: ltp.outTokens, savedTokens: ltp.savedTokens,
        savingsPct: ltp.savingsPct, ltpSavedTokens: ltp.savedTokens, prometheusSavedTokens: 0,
        inChars, outChars: ltp.outChars, residualBytes: ltp.residualBytes, exact: true,
        notes: 'ZETA LTP_ONLY: whitespace projected; residual local.',
      },
      tok: ltp.outTokens,
    });
  }
  if (prom.dictionaryCount > 0 && prom.outTokens < inTokens && prom.exact) {
    cands.push({
      result: {
        ok: true, encoding: enc, mode: 'PROMETHEUS_ONLY', wire: prom.output, residual: [],
        dictionary: prom.candidates,
        arenaDecoderBlock: buildArenaDecoder(prom.output, [], 'PROMETHEUS_ONLY'),
        inTokens, outTokens: prom.outTokens, savedTokens: prom.savingsTokens,
        savingsPct: prom.savingsPct, ltpSavedTokens: 0,
        prometheusSavedTokens: prom.savingsTokens, inChars, outChars: prom.outChars,
        residualBytes: 0, exact: true,
        notes: 'ZETA PROMETHEUS_ONLY: in-context meta-token dictionary.',
      },
      tok: prom.outTokens,
    });
  }
  if (duplex) cands.push({ result: duplex, tok: duplex.outTokens });
  cands.sort((a, b) => a.tok - b.tok || a.result.outChars - b.result.outChars);
  const best = cands[0]!.result;
  const restored = zetaDecode(best.wire, best.residual);
  if (restored !== text) return { ...identity, notes: 'ZETA: exactness gate failed — identity.' };
  return { ...best, exact: true };
}

export function zetaDecode(wire: string, residual: LtpOp[]): string {
  const afterPrometheus = decompressPrometheusICDM(wire);
  if (residual.length === 0) return afterPrometheus;
  return ltpRestore(afterPrometheus, residual);
}

export interface ZetaSelfTest { name: string; pass: boolean; detail: string; }

export async function zetaSelfTest(enc: EncodingName): Promise<ZetaSelfTest[]> {
  const out: ZetaSelfTest[] = [];
  const fixtures: [string, string][] = [
    ['empty', ''],
    ['short prose', 'The quick brown fox.'],
    ['indented JSON', JSON.stringify(Array.from({ length: 12 }, (_, i) => ({ id: i, status: 'active', ts: '2026-07-19T04:15:00Z' })), null, 4)],
    ['CSV logs 30 rows', 'id,service,metric,ts,status,val\n' + Array.from({ length: 30 }, (_, i) => `${i},api,latency_ms,2026-07-19T04:15:00Z,ok,${i * 5}`).join('\n')],
    ['crlf-heavy', 'a\r\nb\r\nc\r\n\r\nd\r\n\r\n\r\ne'],
    ['non-compressible', 'One does not simply walk into Mordor.'],
    ['150-line prose', Array.from({ length: 150 }, (_, i) => `Line ${i + 1}: The system shall maintain a byte-exact reconstruction of the input across all encodings.`).join('\n')],
  ];
  for (const [name, text] of fixtures) {
    try {
      const r = await zetaEncode(text, enc);
      const back = zetaDecode(r.wire, r.residual);
      const exact = back === text;
      out.push({
        name: `zeta: ${name}`,
        pass: exact && r.outTokens <= r.inTokens,
        detail: exact ? `${r.mode} · ${r.inTokens}->${r.outTokens} tok (${r.savingsPct.toFixed(1)}%)` : 'BYTE MISMATCH',
      });
    } catch (e) { out.push({ name: `zeta: ${name}`, pass: false, detail: (e as Error).message }); }
  }
  return out;
}
