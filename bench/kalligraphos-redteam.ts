/** KALLIGRAPHOS adversarial verification. */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { countTokens } from '../src/lib/omega/bpe';
import { daedalusDecode, daedalusEncode } from '../src/lib/omega/daedalus';
import {
  KALLIGRAPHOS_ESCAPE, KALLIGRAPHOS_MARK, MATH_CLOSE, MATH_OPEN,
  kalligraphosDecode, kalligraphosDecoderPrompt, kalligraphosEncode, kalligraphosTransform,
} from '../src/lib/omega/kalligraphos';
import { KALLIGRAPHOS_FIXTURES, formalMathParagraph, styledOperationsBrief } from './kalligraphos-fixtures';

const ENC = 'o200k_base' as const;
const T = (s: string) => countTokens(s, ENC);
let pass = 0, fail = 0;
const errors: string[] = [];
function check(gate: string, yes: boolean, detail: string) { if (yes) pass++; else { fail++; errors.push(`${gate}: ${detail}`); } }

// Independent spec reader.  It shares only the established inner DAEDALUS
// reader; mathematical style bases are literal values from the contract.
function specDecode(wire: string): string {
  if (!wire) return wire;
  if (wire[0] === KALLIGRAPHOS_ESCAPE) return daedalusDecode(wire.slice(1));
  const inner = wire[0] === KALLIGRAPHOS_MARK ? daedalusDecode(wire.slice(1)) : daedalusDecode(wire);
  if (wire[0] !== KALLIGRAPHOS_MARK) return inner;
  const styles: Record<string, [number, number, number?]> = {
    B: [0x1d400, 0x1d41a, 0x1d7ce], I: [0x1d468, 0x1d482], S: [0x1d5a0, 0x1d5ba, 0x1d7e2],
    F: [0x1d5d4, 0x1d5ee, 0x1d7ec], T: [0x1d608, 0x1d622], X: [0x1d63c, 0x1d656], M: [0x1d670, 0x1d68a, 0x1d7f6],
  };
  let out = '', i = 0;
  while (i < inner.length) {
    if (inner[i] !== MATH_OPEN) { out += inner[i++]; continue; }
    const end = inner.indexOf(MATH_CLOSE, i + 1);
    const tuple = styles[inner[i + 1]];
    if (end < 0 || !tuple || inner[i + 2] !== ':') { out += end < 0 ? inner[i++] : inner.slice(i, end + 1); if (end >= 0) i = end + 1; continue; }
    for (const ch of inner.slice(i + 3, end)) {
      const cp = ch.codePointAt(0)!;
      out += cp >= 65 && cp <= 90 ? String.fromCodePoint(tuple[0] + cp - 65)
        : cp >= 97 && cp <= 122 ? String.fromCodePoint(tuple[1] + cp - 97)
          : tuple[2] !== undefined && cp >= 48 && cp <= 57 ? String.fromCodePoint(tuple[2] + cp - 48) : ch;
    }
    i = end + 1;
  }
  return out;
}

const table = new Map<string, ReturnType<typeof kalligraphosEncode>>();
for (const [name, text] of Object.entries(KALLIGRAPHOS_FIXTURES)) table.set(name, kalligraphosEncode(text, ENC, { budgetMs: 3000, maxArms: 2 }));
for (const [name, text] of Object.entries(KALLIGRAPHOS_FIXTURES)) {
  const r = table.get(name)!;
  check('G1', kalligraphosDecode(r.wire) === text, `${name} library round trip`);
  check('G2', specDecode(r.wire) === text, `${name} independent TypeScript reader`);
  check('G5', r.messageTokens === T(r.decoderPrompt), `${name} honest delivered message count`);
  const plain = daedalusEncode(text, ENC, { budgetMs: 3000, maxArms: 2 });
  check('G6', r.messageTokens <= plain.messageTokens, `${name} does not lose to DAEDALUS`);
}
{
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kalligraphos-'));
  const input = path.join(dir, 'in.json'), output = path.join(dir, 'out.json');
  fs.writeFileSync(input, JSON.stringify([...table.values()].map((x) => x.wire)), 'utf8');
  execFileSync('python3', ['bench/kalligraphos_decode.py', input, output], { cwd: path.resolve('.'), stdio: 'pipe' });
  check('G3', JSON.stringify(JSON.parse(fs.readFileSync(output, 'utf8'))) === JSON.stringify(Object.values(KALLIGRAPHOS_FIXTURES)), 'independent CPython reader agrees');
}

// The strongest specific attacker: real mathematical variables and malformed
// spans.  Exact restoration, not semantic equivalence, is the required gate.
for (const s of [
  '', KALLIGRAPHOS_MARK + 'literal collision', KALLIGRAPHOS_ESCAPE + 'literal collision',
  `${MATH_OPEN}F:plain${MATH_CLOSE}`, `${MATH_OPEN}Q:hello${MATH_CLOSE}`, `${MATH_OPEN}F:unterminated`,
  'A short mathematical variable 𝐯 is not normal prose and must remain byte-exact.',
  'Unsupported 𝔄 and supported 𝗕 styles adjacent must retain their exact original glyphs.',
  `${MATH_OPEN}B:literal${MATH_CLOSE} followed by 𝗧𝗵𝗶𝘀 𝗶𝘀 𝗱𝗲𝗰𝗼𝗿𝗮𝘁𝗶𝘃𝗲 𝗽𝗿𝗼𝘀𝗲 𝘄𝗶𝘁𝗵 𝗲𝗻𝗼𝘂𝗴𝗵 𝘄𝗼𝗿𝗱𝘀.`,
]) {
  const r = kalligraphosEncode(s, ENC, { budgetMs: 1500, maxArms: 1 });
  check('G4', kalligraphosDecode(r.wire) === s, `total/collision exact: ${JSON.stringify(s)}`);
}

// Context safety gate: the same Unicode block in a long real formula must not
// be treated as decorative prose merely because its wire would be shorter.
{
  const r = kalligraphosEncode(formalMathParagraph, ENC, { budgetMs: 1500, maxArms: 1 });
  check('G7', !r.kalligraphosApplied && kalligraphosTransform(formalMathParagraph, ENC).spans.length === 0,
    'formula punctuation/math vocabulary decline before economic selection');
  const decorative = table.get('styledOperationsBrief')!;
  check('G7', decorative.kalligraphosApplied, 'ordinary styled operations prose remains eligible');
}

{
  let seed = 0x12345678;
  const next = () => ((seed = Math.imul(seed ^ (seed >>> 13), 0x5bd1e995)) >>> 0) / 2 ** 32;
  const atoms = ['word', ' ', '𝗔𝗯', '𝐂𝐝', '𝚎𝚏', '𝔾', '123', MATH_OPEN, MATH_CLOSE, KALLIGRAPHOS_MARK, KALLIGRAPHOS_ESCAPE, '😀', '中文'];
  let broken = 0;
  for (let k = 0; k < 500; k++) {
    const s = Array.from({ length: 3 + Math.floor(next() * 20) }, () => atoms[Math.floor(next() * atoms.length)]).join('');
    if (kalligraphosDecode(kalligraphosEncode(s, ENC, { budgetMs: 500, maxArms: 1 }).wire) !== s) broken++;
  }
  check('G8', broken === 0, `${500 - broken}/500 deterministic fuzz cases exact`);
}
{
  const r = table.get('styledOperationsBrief')!;
  const plain = daedalusEncode(styledOperationsBrief, ENC, { budgetMs: 3000, maxArms: 2 });
  const saved = plain.messageTokens - r.messageTokens;
  const pct = 100 * saved / plain.messageTokens;
  console.log(`G9 receipt: raw=${T(styledOperationsBrief)} plain=${plain.messageTokens} kalligraphos=${r.messageTokens} saved=${saved} (${pct.toFixed(1)}%), spans=${r.kalligraphosSpans}`);
  check('G9', r.kalligraphosApplied && saved >= 50 && pct >= 25, 'fancy-text operations brief clears 50 tokens and 25%');
}
console.log(`KALLIGRAPHOS RED TEAM: ${pass} passed, ${fail} failed`);
if (errors.length) console.log(errors.join('\n'));
process.exitCode = fail ? 1 : 0;
