import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
import { enumerateTokenSpans } from '../../src/lib/omega/chiron';
import { apographeDecodeResult, apographeEncode } from '../../src/lib/omega/apographe';

const enc: any = 'o200k_base';
const path = process.argv[2] ?? 'bench/holdout-mk/pom.xml';
const baseline = process.argv[3] ? Number(process.argv[3]) : null;
const source = fs.readFileSync(path, 'utf8');
const glyphs0 = ['⟪', '⟫', '§', '¤', '‡', '°', 'µ', '◆', '⁞', '␟', '‖', '¶', '¦', '※', '~', '^', '@', '!', '%', '+', '='];
const glyphs = glyphs0.filter(g => !source.includes(g) && countTokens(g, enc) === 1);
if (glyphs.length < 6) throw new Error('not enough one-token collision-free glyphs');
const [open, close, field, row, meta] = glyphs;
const codes = glyphs.slice(5);
const contract = `After parent decode, ${open}entries${meta}body${close}: entries are code${field}literal pairs split by ${row}; replace each code in body by its literal. Preserve other bytes.`;
const counts = enumerateTokenSpans([source], enc, { n: 0, max: 2_000_000 });
const candidateList = [...counts.entries()].filter(([p, c]) => c >= 3 && p.length >= 8)
  .sort((a, b) => b[1] * (b[0].length - 1) - a[1] * (a[0].length - 1)).slice(0, 80)
  .map(([phrase]) => phrase);
const replacements: Array<{ code: string; phrase: string; uses: number }> = [];
let body = source;
function wire() {
  const table = replacements.map(e => `${e.code}${field}${e.phrase}`).join(row);
  return `${open}${table}${meta}${body}${close}`;
}
function complete() { return `${contract}\n${wire()}`; }
let bestTokens = countTokens(complete(), enc);
const initialTokens = bestTokens;
const history: any[] = [];
for (let round = 0; round < codes.length; round++) {
  let best: { phrase: string; uses: number; body: string; tokens: number } | null = null;
  for (const phrase of candidateList) {
    const chunks = body.split(phrase);
    const uses = chunks.length - 1;
    if (uses < 2) continue;
    const candidateBody = chunks.join(codes[round]);
    const oldBody = body;
    body = candidateBody;
    replacements.push({ code: codes[round], phrase, uses });
    const tokens = countTokens(complete(), enc);
    replacements.pop();
    body = oldBody;
    if (!best || tokens < best.tokens) best = { phrase, uses, body: candidateBody, tokens };
  }
  if (!best || best.tokens >= bestTokens) break;
  body = best.body;
  replacements.push({ code: codes[round], phrase: best.phrase, uses: best.uses });
  bestTokens = best.tokens;
  history.push({ round, code: codes[round], uses: best.uses, phraseChars: best.phrase.length,
    phraseTokens: countTokens(best.phrase, enc), messageTokens: bestTokens });
}
const finalWire = wire();
const parent = apographeEncode(finalWire, enc);
const parentMessage = `${parent.contract ? parent.contract + '\n' : ''}${parent.wire}`;
const composedMessage = `${contract}\n${parentMessage}`;
const decodedWire = apographeDecodeResult(parent);
const macroStart = decodedWire.indexOf(open);
const macroEnd = decodedWire.indexOf(close, macroStart + open.length);
const decodedMeta = decodedWire.indexOf(meta, macroStart + open.length);
if (macroStart < 0 || macroEnd < 0 || decodedMeta < 0) throw new Error('malformed phrase-pack frame');
const header = decodedWire.slice(macroStart + open.length, decodedMeta);
const bodyStart = decodedMeta + meta.length;
const framedBody = decodedWire.slice(bodyStart, macroEnd);
const decodedEntries = header ? header.split(row).map(entry => {
  const at = entry.indexOf(field);
  return at < 0 ? null : [entry.slice(0, at), entry.slice(at + field.length)];
}) : [];
if (decodedEntries.some(e => !e || !e[0] || !e[1])) throw new Error('malformed dictionary entry');
let restoredBody = framedBody;
for (const e of decodedEntries as Array<[string, string]>) restoredBody = restoredBody.split(e[0]).join(e[1]);
const decoded = decodedWire.slice(0, macroStart) + restoredBody + decodedWire.slice(macroEnd + close.length);
const result = {
  path, chars: source.length, sourceTokens: countTokens(source, enc), baseline,
  tokensBeforeDictionary: initialTokens, dictionaryMessageTokens: countTokens(complete(), enc),
  finalMessageTokensWithApographe: countTokens(composedMessage, enc),
  deltaToBaseline: baseline === null ? null : countTokens(composedMessage, enc) - baseline,
  exact: decoded === source, transformedChars: finalWire.length,
  contractTokens: countTokens(contract, enc), dictionaryEntries: replacements.length,
  entries: replacements.map(e => ({ code: e.code, uses: e.uses, phraseChars: e.phrase.length, phraseTokens: countTokens(e.phrase, enc) })),
  history, parentM: parent.messageTokens, parentNotes: parent.notes,
};
console.log(JSON.stringify(result, null, 2));
