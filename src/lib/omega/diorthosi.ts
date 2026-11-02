/** DIORTHOSI: document-version line patches. Prior art: delta encoding/version
 * control. No claim of a novel primitive. Input is arbitrary JS string, split
 * on the literal separator; no normalization. The in-band JSON preserves all
 * source code units, including CR, whitespace and lone surrogates. */
import { countTokens, type EncodingName } from './bpe';
import { tagstackEncode } from './tagstack';
import { siblingTemplateEncode } from './sibling-template';

export const DIORTHOSI_HEADER = 'DIORTHOSI-1: JSON is [separator,base lines,patches]. Each patch lists [zero-based line index,replacement] or [index,prefix length,suffix length,new middle]. For each patch independently copy base lines; for the second form replace the line with its stated prefix, then new middle, then its stated suffix. Lengths count UTF-16 code units. Join lines with LF. Join the base document and patched documents with separator. Output exactly the result.';
const SEP = '\n---\n';
type Patch = Array<[number, string] | [number, number, number, string]>;

export function diorthosiPlan(text: string): string | null {
  if (text.length > 80000) return null;
  const docs = text.split(SEP);
  if (docs.length < 3 || docs.length > 128) return null;
  const base = docs[0].split('\n');
  if (base.length < 3 || base.length > 2000) return null;
  const patches: Patch[] = [];
  for (const doc of docs.slice(1)) {
    const lines = doc.split('\n');
    if (lines.length !== base.length) return null;
    const p: Patch = [];
    for (let i = 0; i < lines.length; i++) if (lines[i] !== base[i]) {
      const a = base[i], b = lines[i]; let start = 0, end = 0;
      while (start < a.length && start < b.length && a[start] === b[start]) start++;
      while (end < a.length - start && end < b.length - start && a[a.length - 1 - end] === b[b.length - 1 - end]) end++;
      const full: [number, string] = [i, b];
      const edit: [number, number, number, string] = [i, start, end, b.slice(start, b.length - end)];
      p.push(countTokens(JSON.stringify(edit), 'o200k_base') < countTokens(JSON.stringify(full), 'o200k_base') ? edit : full);
    }
    patches.push(p);
  }
  return DIORTHOSI_HEADER + '\n' + JSON.stringify([SEP, base, patches]);
}

export function diorthosiDecode(message: string): string {
  if (!message.startsWith(DIORTHOSI_HEADER + '\n')) throw new Error('invalid header');
  const data: unknown = JSON.parse(message.slice(DIORTHOSI_HEADER.length + 1));
  if (!Array.isArray(data) || data.length !== 3 || typeof data[0] !== 'string' || !Array.isArray(data[1]) || !data[1].every((v: unknown) => typeof v === 'string') || !Array.isArray(data[2])) throw new Error('invalid data');
  const [sep, base, patches] = data as [string, string[], unknown[]];
  const docs = [base.join('\n')];
  for (const patch of patches) {
    if (!Array.isArray(patch)) throw new Error('invalid patch');
    const lines = base.slice(); let previous = -1;
    for (const change of patch) {
      if (!Array.isArray(change) || !Number.isSafeInteger(change[0]) || change[0] <= previous || change[0] >= base.length) throw new Error('invalid change');
      previous = change[0];
      if (change.length === 2 && typeof change[1] === 'string') lines[change[0]] = change[1];
      else if (change.length === 4 && Number.isSafeInteger(change[1]) && Number.isSafeInteger(change[2]) && change[1] >= 0 && change[2] >= 0 && change[1] + change[2] <= lines[change[0]].length && typeof change[3] === 'string') {
        const line = lines[change[0]];
        lines[change[0]] = line.slice(0, change[1]) + change[3] + (change[2] ? line.slice(-change[2]) : '');
      } else throw new Error('invalid change');
    }
    docs.push(lines.join('\n'));
  }
  return docs.join(sep);
}

export function diorthosiEncode(text: string, enc: EncodingName = 'o200k_base') {
  const started = performance.now();
  const parent = tagstackEncode(text, enc);
  const sibling = siblingTemplateEncode(text, enc, parent);
  if (!parent.exact || !parent.frontierComplete || !sibling.exact) throw new Error('incomplete parent frontier');
  const candidate = diorthosiPlan(text);
  const exact = candidate !== null && diorthosiDecode(candidate) === text;
  const candidateTokens = candidate === null ? null : countTokens(candidate, enc);
  const applied = exact && candidateTokens !== null && candidateTokens < sibling.messageTokens;
  const message = applied ? candidate! : sibling.message;
  return { message, decoded: applied ? diorthosiDecode(message) : sibling.decoded, exact: true,
    applied, messageTokens: countTokens(message, enc), parentTokens: sibling.messageTokens,
    parentCodec: sibling.applied ? 'sibling-template' : parent.parentCodec,
    frontierCosts: parent.frontierCosts, frontierComplete: parent.frontierComplete,
    candidateTokens, candidateExact: exact, ms: performance.now() - started };
}
