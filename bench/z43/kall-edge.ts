// Z43: KALLIGRAPHOS edge-case exactness (round trip must be byte-identical; one-chat must include the contract).
import { kalligraphosEncode, kalligraphosDecode } from '@/lib/omega/kalligraphos';
import { countTokens } from '@/lib/omega/bpe';
const families: [number, number, number | null][] = [[0x1D400, 0x1D41A, 0x1D7CE], [0x1D434, 0x1D44E, null], [0x1D468, 0x1D482, null], [0x1D49C, 0x1D4B6, null], [0x1D5A0, 0x1D5BA, 0x1D7E2], [0x1D5D4, 0x1D5EE, 0x1D7EC], [0x1D670, 0x1D68A, 0x1D7F6]];
function style(s: string, [u, l, d]: [number, number, number | null]) {
  return [...s].map((c) => { const o = c.codePointAt(0)!; if (c >= 'A' && c <= 'Z') return String.fromCodePoint(u + o - 65); if (c >= 'a' && c <= 'z') return String.fromCodePoint(l + o - 97); if (d !== null && c >= '0' && c <= '9') return String.fromCodePoint(d + o - 48); return c; }).join('');
}
const plain = 'The quick brown fox jumps over the lazy dog while the build runs on Friday 2026.';
const cases: Record<string, string> = {
  empty: '',
  short: 'hi',
  plainProse: plain + ' ' + plain,
  markersInText: '✅ marker and ✔ escape and ⌁ open and ⌂ close inside plain prose sentences here.',
  markersStyled: style('Keep these markers exact today', families[0]) + ' ✅ ⌁ ⌂ ' + style('And this styled line too', families[2]),
  allFamilies: families.map((f, i) => style(`Family number ${i} has styled words in it`, f)).join('\n'),
  digitsStyled: style('Build 2026 passed all 1234 checks on 9 hosts', families[0]),
  mixedLines: style('First styled sentence goes here', families[1]) + '\nplain line of ascii text here ok\n' + style('Third styled sentence also here', families[4]),
  fencedCode: '```ts\nconst x: number = 42; // ⌁ not math\n```\n' + style('Code near styled prose text today', families[0]),
  url: 'See https://example.com/a?b=c for ' + style('the styled explanation', families[0]),
};
let bad = 0;
for (const [name, text] of Object.entries(cases)) {
  for (const enc of ['o200k_base', 'cl100k_base'] as const) {
    const r = kalligraphosEncode(text, enc);
    const back = kalligraphosDecode(r.wire);
    const ok = back === text;
    if (!ok) bad++;
    console.log(JSON.stringify({ case: name, enc, exact: ok, applied: r.kalligraphosApplied, inTokens: countTokens(text, enc), wireTokens: countTokens(r.wire, enc), messageTokens: r.messageTokens }));
  }
}
console.log(JSON.stringify({ summary: 'done', failures: bad }));
