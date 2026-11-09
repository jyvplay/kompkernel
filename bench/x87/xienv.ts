/** X87 — portability audit of the Ω-Ξ envelope.
 *  Node 22's CompressionStream accepts 'brotli' (a non-standard extension); no browser does.
 *  The portfolio picks the smallest payload, so on some lanes the SHIPPED wire depends on a
 *  codec the reader's environment cannot inflate. Measure the three environments:
 *    node    — CompressionStream with brotli (what bench/x87/xiprobe measured)
 *    browser — CompressionStream that refuses 'brotli' (Chrome/Firefox/Safari behaviour)
 *    pure-ts — no CompressionStream at all: only cm.ts, deterministic everywhere
 *  Same source, same decoder, byte-exact round trip required in each. */
import * as fs from 'node:fs';
import { omegaXiCompress, omegaXiDecode } from '../../src/lib/omega/atom-codec';
import { countTokens } from '../../src/lib/omega/bpe';
const enc: any = 'o200k_base';
const RealCS = (globalThis as any).CompressionStream;
function setEnv(kind: 'node' | 'browser' | 'pure-ts') {
  if (kind === 'node') { (globalThis as any).CompressionStream = RealCS; return; }
  if (kind === 'pure-ts') { delete (globalThis as any).CompressionStream; return; }
  (globalThis as any).CompressionStream = class {
    constructor(f: string) {
      if (f === 'brotli' || f === 'br') throw new TypeError("Failed to construct 'CompressionStream': unsupported format");
      return new RealCS(f);
    }
  };
}
const lanes = (JSON.parse(fs.readFileSync('bench/x80/receipts/frontier.json', 'utf8'))).rows;
const res: Record<string, any[]> = { node: [], browser: [], 'pure-ts': [] };
for (const kind of ['node', 'browser', 'pure-ts'] as const) {
  setEnv(kind);
  for (const r of lanes) {
    const S = fs.readFileSync(r.path, 'utf8');
    const xi: any = await omegaXiCompress(S, enc);
    const back: any = await omegaXiDecode(xi.output, enc);
    res[kind].push({ path: r.path, lane: r.path.split('/').pop(), F: r.tokens, raw: r.raw,
      XI: xi.outTokens ?? countTokens(xi.output, enc), codec: xi.codecId ?? xi.codec ?? null,
      exact: xi.exact, rt: back === S, invariant: xi.invariantHolds, bpt: xi.bitsPerAtom, atoms: xi.atomCount });
  }
}
setEnv('node');
console.log('lane'.padEnd(22) + 'F'.padStart(6) + 'node'.padStart(7) + 'browser'.padStart(9) + 'pure-ts'.padStart(9) + '  codecs(n/b/p)'.padStart(18) + ' rt');
const tot: any = { F: 0, node: 0, browser: [], 'pure-ts': [] };
let T = { F: 0, node: 0, browser: 0, pts: 0 };
let allRT = true, allInv = true;
for (let i = 0; i < lanes.length; i++) {
  const a = res.node[i], b = res.browser[i], c = res['pure-ts'][i];
  allRT = allRT && a.rt && b.rt && c.rt; allInv = allInv && a.invariant && b.invariant && c.invariant;
  T.F += a.F; T.node += a.XI; T.browser += b.XI; T.pts += c.XI;
  console.log(String(a.lane).padEnd(22) + String(a.F).padStart(6) + String(a.XI).padStart(7) + String(b.XI).padStart(9) + String(c.XI).padStart(9) +
    ('  ' + a.codec + '/' + b.codec + '/' + c.codec).padStart(18) + ' ' + (a.rt && b.rt && c.rt));
}
console.log(`\nTOTALS  F=${T.F}  node=${T.node}  browser=${T.browser}  pure-ts=${T.pts}`);
console.log(`gain vs F: node ${T.F - T.node} (${(100 * (T.F - T.node) / T.F).toFixed(1)}%)  browser ${T.F - T.browser} (${(100 * (T.F - T.browser) / T.F).toFixed(1)}%)  pure-ts ${T.F - T.pts} (${(100 * (T.F - T.pts) / T.F).toFixed(1)}%)`);
console.log(`lanes where node != browser: ${res.node.filter((x, i) => x.XI !== res.browser[i].XI).length}`);
console.log(`all round trips exact: ${allRT}   envelope invariant held: ${allInv}`);
fs.mkdirSync('bench/x87/receipts', { recursive: true });
fs.writeFileSync('bench/x87/receipts/xi-env.json', JSON.stringify({ totals: T, rows: res }, null, 1) + '\n');
