import { countTokens } from '../../src/lib/omega/bpe';
const enc: any = 'o200k_base';
const hosts = [' document',' the',' of',' and',' policy',' retention',' workspace',' document',' functions',' return',' const',' string',' value',' number',' result',' error',' status',' user',' data',' file',' path',' line',' code',' test'];
const marks: Array<[string, number[]]> = [
  ['combining diacriticals', Array.from({length: 0x50}, (_, i) => 0x0300 + i)],
  ['combining ext', Array.from({length: 0x30}, (_, i) => 0x1AB0 + i)],
  ['combining suppl', Array.from({length: 0x30}, (_, i) => 0x1DC0 + i)],
  ['combining for symbols', Array.from({length: 0x21}, (_, i) => 0x20D0 + i)],
  ['half marks', Array.from({length: 0x10}, (_, i) => 0xFE20 + i)],
  ['cyrillic comb', Array.from({length: 7}, (_, i) => 0x0483 + i)],
  ['variation sel', Array.from({length: 16}, (_, i) => 0xFE00 + i)],
];
let total = 0, free = 0;
const freeByBlock: Record<string, [number, number]> = {};
const examples: string[] = [];
for (const host of hosts) {
  const base = countTokens(host, enc);
  for (const [name, cps] of marks) {
    freeByBlock[name] ??= [0, 0];
    for (const cp of cps) {
      const m = String.fromCodePoint(cp);
      const t = countTokens(host + m, enc);
      total++; freeByBlock[name][1]++;
      if (t === base) { free++; freeByBlock[name][0]++; if (examples.length < 25) examples.push(JSON.stringify(host + m) + ' mark=U+' + cp.toString(16) + ' base=' + base + ' marked=' + t); }
    }
  }
}
console.log(JSON.stringify({ total, free, pct: +(free / total * 100).toFixed(1), freeByBlock }, null, 1));
console.log(examples.join('\n'));
