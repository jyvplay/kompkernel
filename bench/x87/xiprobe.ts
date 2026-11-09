/** X87 — the decisive experiment. The repo ships a stage-1 context-mixing coder
 *  (cm.ts) and a stage-2 atom packer (atom-codec.ts) that claims log2(K) bits per
 *  token BY CONSTRUCTION. `omega_xi` is a registry arm but is NOT a frontier parent.
 *  This measures, on the 29-lane frontier corpus, all four numbers side by side:
 *    raw  = o200k tokens of the source
 *    F    = the frontier's best one-chat message (committed receipt)
 *    CMb  = cm.ts payload bits / 14.8            (stage-1 quality, ideal packing)
 *    XI   = o200k tokens of omegaXiCompress output (stage-1 + REAL stage-2 packing)
 *  The gap CMb -> XI is the price of the envelope; the gap F -> XI is the win. */
import * as fs from 'node:fs';
import * as zlib from 'node:zlib';
import { omegaXiCompress, omegaXiDecode } from '../../src/lib/omega/atom-codec';
import { cmCompress, cmDecompress } from '../../src/lib/omega/cm';
import { countTokens } from '../../src/lib/omega/bpe';
const enc: any = 'o200k_base';
const lanes = (JSON.parse(fs.readFileSync('bench/x80/receipts/frontier.json', 'utf8'))).rows;
const out: any[] = [];
for (const r of lanes) {
  const S = fs.readFileSync(r.path, 'utf8'); const b = Buffer.from(S, 'utf8');
  const xi: any = await omegaXiCompress(S, enc);
  const back: any = await omegaXiDecode(xi.output, enc);
  const wire = typeof xi.output === 'string' ? xi.output : JSON.stringify(xi.output);
  const XI = countTokens(wire, enc);
  const cm = cmCompress(b);
  const CMb = Math.ceil(cm.length * 8 / 14.8);
  const br = zlib.brotliCompressSync(b, { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 11 } });
  const row = { path: r.path, lane: r.path.split('/').pop(), bytes: b.length, raw: r.raw, F: r.tokens,
    parent: r.parent, cmBytes: cm.length, cmRT: Buffer.from(cmDecompress(cm)).equals(b), CMb,
    brBytes: br.length, BRb: Math.ceil(br.length * 8 / 14.8), XI, xiRT: back === S,
    xiCodec: xi.codec ?? xi.codecId ?? xi.payloadCodec ?? null, wireLen: wire.length,
    bitsPerTok: +((cm.length * 8) / XI).toFixed(2), gainVsF: r.tokens - XI };
  out.push(row);
  console.log(`${String(row.lane).padEnd(22)} bytes=${String(row.bytes).padStart(6)} raw=${String(row.raw).padStart(5)} F=${String(row.F).padStart(5)} CMb=${String(row.CMb).padStart(5)} BRb=${String(row.BRb).padStart(5)} XI=${String(row.XI).padStart(5)} gain=${String(row.gainVsF).padStart(6)} rt=${row.xiRT&&row.cmRT} codec=${row.xiCodec} bpt=${row.bitsPerTok}`);
  fs.mkdirSync('bench/x87/receipts', { recursive: true });
  fs.writeFileSync('bench/x87/receipts/xi-vs-frontier.json', JSON.stringify({ rows: out, totals: { raw: out.reduce((a,x)=>a+x.raw,0), F: out.reduce((a,x)=>a+x.F,0), CMb: out.reduce((a,x)=>a+x.CMb,0), BRb: out.reduce((a,x)=>a+x.BRb,0), XI: out.reduce((a,x)=>a+x.XI,0) } }, null, 1) + '\n');
}
const T = { raw: out.reduce((a,x)=>a+x.raw,0), F: out.reduce((a,x)=>a+x.F,0), CMb: out.reduce((a,x)=>a+x.CMb,0), BRb: out.reduce((a,x)=>a+x.BRb,0), XI: out.reduce((a,x)=>a+x.XI,0) };
console.log('\nTOTALS', JSON.stringify(T), ' XI wins on', out.filter(x=>x.gainVsF>0).length, '/', out.length, 'lanes');
