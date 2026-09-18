/**
 * Executable tokenizer audit. This is intentionally separate from compression:
 * it tests the exact tokenizer dependency used by every omega lane.
 */
import { buildAtomAlphabet, encodeIds, type EncodingName } from './bpe';
import { encode as packageO200kEncode } from 'gpt-tokenizer/encoding/o200k_base';
import { encode as packageCl100kEncode } from 'gpt-tokenizer/encoding/cl100k_base';

export interface BpeAuditRow { name: string; encoding: EncodingName; pass: boolean; details: string }

export function runBpeAudit(): BpeAuditRow[] {
  const vectors = [
    ['', 'empty'],
    ['中文汉字日本語한국어', 'CJK'],
    ['中文 🚀 café Привет', 'multilingual'],
    ['line one\r\nline two\n', 'newlines'],
    ['[MZ1] ⟨QSR⟩ [RP1] [[VX1', 'codec sentinels'],
    ['𠀀𪚥𠀀', 'CJK extension'],
  ] as const;
  const out: BpeAuditRow[] = [];
  for (const enc of ['o200k_base', 'cl100k_base'] as EncodingName[]) {
    const directEncode = enc === 'o200k_base' ? packageO200kEncode : packageCl100kEncode;
    for (const [text, name] of vectors) {
      const ours = encodeIds(text, enc);
      const direct = directEncode(text);
      const idsMatch = JSON.stringify(ours) === JSON.stringify(direct);
      out.push({ name, encoding: enc, pass: idsMatch, details: `ids=${ours.length}, direct=${direct.length}, idsMatch=${idsMatch}` });
    }
    const alpha = buildAtomAlphabet(enc);
    const sample = alpha.atoms.slice(0, Math.min(512, alpha.atoms.length)).join('');
    const sampleIds = encodeIds(sample, enc);
    const oneEach = alpha.atoms.slice(0, Math.min(512, alpha.atoms.length)).every((a) => encodeIds(a, enc).length === 1);
    out.push({
      name: 'Chinese/atom alphabet invariance', encoding: enc,
      pass: oneEach && sampleIds.length === Math.min(512, alpha.atoms.length) && alpha.proof.exact,
      details: `atoms=${alpha.atoms.length}, sample=${Math.min(512, alpha.atoms.length)}, concatenated=${sampleIds.length}, proof=${alpha.proof.tokens}/${alpha.proof.sample}`,
    });
  }
  return out;
}
