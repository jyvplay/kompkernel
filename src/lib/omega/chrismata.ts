/**
 * CHRISMATA (X150): guarded, content-conditioned terminal SGR elision.
 *
 * Git's colored diff emits the same two SGR pairs around almost every + or -
 * line. The line's existing + / - is a locally available selector: for lines
 * that match Git's exact framing we can strip the control sequences, then
 * restore them from that selector. No style information is guessed: the whole
 * transformed source is inverted and compared before a plan is returned.
 * Other escapes remain literal. This specializes derivable-character elision
 * (e.g. STOICHOS), rather than claiming a novel compression primitive.
 *
 * Optional experiment, NOT registered in the default stack. An extra parent
 * search costs time even on refusal. The full envelope is token-priced; a
 * message-only bounded parent reader must reconstruct the original exactly.
 * Native LLM behavior is untested, especially emitting U+001B.
 */
import {countTokens, type EncodingName} from './bpe';
import {isUtf8TransportStable} from './utf8-wire';
import {tagstackEncode} from './tagstack';
import {readPlainParent} from './ekdysis-frontier';

const CAP = 50000;
const esc = '\x1b';
const reset = `${esc}[m`;
const choices = [
  {sign: '+', code: '32'},
  {sign: '-', code: '31'},
] as const;
type Sign = '+' | '-';

export function chrismataKey(plus: boolean, minus: boolean): string {
  const rules: string[] = [];
  if (plus) rules.push('+ means 32');
  if (minus) rules.push('- means 31');
  if (!rules.length) throw Error('CHRISMATA: no rules');
  return `After decoding, for each line starting with ${rules.join(' or ')}, insert ESC[code m before its first character, ESC[m after it, ESC[code m after that, and ESC[m at line end. If the line is only that character, insert only ESC[code m before it and ESC[m after it. ESC is U+001B; omit the space in code m. Preserve other characters and line endings.\n`;
}

export function chrismataRestore(folded: string, plus: boolean, minus: boolean): string {
  if (folded.length > CAP || (!plus && !minus)) throw Error('CHRISMATA: domain');
  const out = folded.split('\n').map(line => {
    const s = line[0] as Sign;
    if ((s !== '+' || !plus) && (s !== '-' || !minus)) return line;
    const code = s === '+' ? '32' : '31';
    const prefix = `${esc}[${code}m${s}${reset}`;
    return line.length === 1 ? prefix : prefix + `${esc}[${code}m` + line.slice(1) + reset;
  }).join('\n');
  if (out.length > CAP) throw Error('CHRISMATA: expansion limit');
  return out;
}

export function chrismataPlan(source: string): {folded:string; key:string; plus:boolean; minus:boolean; sites:number} | null {
  if (!source || source.length > CAP || !isUtf8TransportStable(source) || source.includes('\r')) return null;
  let plus = false, minus = false, sites = 0;
  const lines = source.split('\n').map(line => {
    for (const {sign, code} of choices) {
      const head = `${esc}[${code}m${sign}${reset}`;
      if (!line.startsWith(head)) continue;
      const suffix = line.slice(head.length), color = `${esc}[${code}m`;
      let content: string;
      if (!suffix) content = '';
      else {
        if (!suffix.startsWith(color) || !suffix.endsWith(reset)) continue;
        content = suffix.slice(color.length, -reset.length);
        // Empty body with two wrappers is not the one-wrapper empty-line form.
        if (!content || content.includes(esc)) continue;
      }
      if (sign === '+') plus = true; else minus = true;
      sites++;
      return sign + content;
    }
    return line;
  });
  if (!sites) return null;
  const folded = lines.join('\n');
  try { if (chrismataRestore(folded, plus, minus) !== source) return null; }
  catch { return null; }
  return {folded, key:chrismataKey(plus, minus), plus, minus, sites};
}

/** Read only applied envelopes; caller must use the incumbent's reader for a fallback. */
export function chrismataRead(message: string): string {
  if (message.length > CAP + 1024 || !isUtf8TransportStable(message)) throw Error('CHRISMATA: transport');
  for (const [plus, minus] of [[true,false], [false,true], [true,true]] as const) {
    const key = chrismataKey(plus, minus);
    if (message.startsWith(key)) return chrismataRestore(readPlainParent(message.slice(key.length)), plus, minus);
  }
  throw Error('CHRISMATA: envelope');
}

/** Experimental tournament over the actual parent message, not raw savings. */
export function chrismataEncode(source: string, enc: EncodingName = 'o200k_base') {
  if (!isUtf8TransportStable(source)) throw Error('CHRISMATA: invalid UTF-8 transport');
  const base = tagstackEncode(source, enc);
  if (base.decoded !== source || !base.exact || !base.frontierComplete) throw Error('CHRISMATA: incomplete parent');
  const fallback = (reason: string, candidateTokens: number | null = null) => ({
    message: base.message, tokens: base.messageTokens, decoded: base.decoded, applied: false,
    baseTokens: base.messageTokens, candidateTokens, reason,
  });
  const plan = chrismataPlan(source);
  if (!plan) return fallback('no reversible eligible lines');
  const child = tagstackEncode(plan.folded, enc);
  if (child.decoded !== plan.folded || !child.exact || !child.frontierComplete) return fallback('incomplete transformed parent');
  const message = plan.key + child.message, candidateTokens = countTokens(message, enc);
  try { if (chrismataRead(message) !== source) return fallback('message-only reader mismatch', candidateTokens); }
  catch { return fallback('unsupported message-only reader', candidateTokens); }
  if (candidateTokens >= base.messageTokens) return fallback('no full-message token gain', candidateTokens);
  return {message, tokens: candidateTokens, decoded: source, applied: true,
    baseTokens: base.messageTokens, candidateTokens, reason: `${plan.sites} content-selected SGR lines`};
}
