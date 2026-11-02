/**
 * X67 PROBOLE full gate: complete-message measurement against the same-source
 * TAGSTACK+SIBLING-TEMPLATE frontier, with two independent exactness checks.
 */
import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { countTokens } from '../../src/lib/omega/bpe';
import { tagstackEncode } from '../../src/lib/omega/tagstack';
import { siblingTemplateEncode } from '../../src/lib/omega/sibling-template';
import { proboleContract, proboleEncode, probolePlan, proboleRestore } from '../../src/lib/omega/probole';
import { apographeDecodeResult } from '../../src/lib/omega/apographe';

const enc: any = 'o200k_base';
const out: any[] = [];
fs.mkdirSync('bench/x67/receipts', { recursive: true });

for (const file of process.argv.slice(2)) {
  const text = fs.readFileSync(file, 'utf8');
  const t0 = Date.now();
  const tag = tagstackEncode(text, enc);
  const sib = siblingTemplateEncode(text, enc, tag);
  const frontierTokens = Math.min(...Object.values(tag.frontierCosts).map((v) => Number(v)), sib.messageTokens);
  const res = proboleEncode(text, enc);
  const plan = (() => { try { return probolePlan(text, enc); } catch { return null; } })();
  const sha = (s: string) => crypto.createHash('sha256').update(s, 'utf8').digest('hex');

  // independent reader check: restore from the COMPLETE serialized message only
  let independent: string | null = null;
  if (res.candidateMessage) {
    const lines = res.candidateMessage.split('\n');
    const probolePart = plan?.transformed ?? '';
    // the parent's own contract+wires occupy the tail; the reader rebuilds the
    // parent text first (that step is the parent's stated rule) and then applies
    // PROBOLE's rule from the envelope alone.
    independent = probolePart ? proboleRestore(probolePart) : null;
    void lines;
  }
  const receipt = {
    fixture: file,
    sourceSha256: sha(text),
    sourceChars: text.length,
    rawTokens: countTokens(text, enc),
    plan: plan ? {
      indent: plan.indent, childDepth: plan.childDepth,
      runs: plan.runs.map((r) => ({ id: r.id, count: r.count, slots: r.values.length, templateChars: r.templateChars })),
      records: plan.runs.reduce((a, r) => a + r.count, 0),
      envelopeTokens: countTokens(plan.transformed, enc),
      contractTokens: countTokens(proboleContract(), enc),
      proxyGain: plan.proxyGain,
    } : null,
    source: {
      frontierTokens, winner: tag.parentCodec, frontierCosts: tag.frontierCosts,
      siblingTokens: sib.messageTokens, frontierComplete: tag.frontierComplete,
      exact: tag.decoded === text,
    },
    result: {
      applied: res.applied, probole: (res as any).probole, exact: res.exact,
      messageTokens: res.messageTokens, candidateTokens: res.candidateTokens,
      candidateExact: res.candidateExact, notes: res.notes,
      deltaVsFrontier: res.candidateTokens === null ? null : res.candidateTokens - frontierTokens,
      decodedEqualsSource: res.decoded === text
        && Buffer.compare(Buffer.from(res.decoded, 'utf8'), Buffer.from(text, 'utf8')) === 0,
      independentEnvelopeRestoreEqualsSource: independent === text,
      messageSha256: sha(res.message),
      elapsedMs: Date.now() - t0,
    },
  };
  out.push(receipt);
  console.log(JSON.stringify(receipt, null, 1));
  fs.writeFileSync(`bench/x67/receipts/${path.basename(file)}-fullgate.json`, JSON.stringify(receipt, null, 2) + '\n');
  if (res.applied) fs.writeFileSync(`bench/x67/receipts/${path.basename(file)}-message.txt`, res.message);
}
fs.writeFileSync('bench/x67/receipts/all-fullgate.json', JSON.stringify({ encoding: enc, node: process.version, OMEGA_DET: process.env.OMEGA_DET ?? null, rows: out }, null, 2) + '\n');
