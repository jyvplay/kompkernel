/** t19: indent = depth after pre-dedenting leading closers (standard pretty-printer rule) */
import * as fs from 'node:fs';
import { countTokens as T } from '../../src/lib/omega/bpe';
const enc: any = 'o200k_base';
const VOID = new Set('area base br col embed hr img input link meta param source track wbr'.split(' '));
for (const p of process.argv.slice(2)) {
  const t = fs.readFileSync(p, 'utf8');
  const lines = t.split('\n');
  for (const unit of [2, 4, 1]) {
    let depth = 0, ok = 0, bad = 0; const bads: string[] = [];
    for (const l of lines) {
      const body = l.replace(/^[ \t]+/, '');
      const lead = l.slice(0, l.length - body.length);
      const leadClosers = /^(<\/([A-Za-z][\w:-]*)\s*>(?=\s*$))/.test(body) ? 1 : 0;
      const guess = ' '.repeat(Math.max(0, depth - leadClosers) * unit);
      if (lead === guess) ok++; else { bad++; if (bads.length < 2) bads.push(`${JSON.stringify(lead)} vs ${JSON.stringify(guess)} :: ${body.slice(0, 44)}`); }
      const scan = body.replace(/<!--[\s\S]*?-->/g, '');
      const tagRe = /<(\/?)([A-Za-z][\w:-]*)((?:"[^"]*"|'[^']*'|[^>"'])*)>/g;
      let m; let opens = 0, closes = 0;
      while ((m = tagRe.exec(scan))) { const isClose = m[1] === '/', name = m[2].toLowerCase(), self = /\/\s*$/.test(m[3]);
        if (isClose) closes++; else if (!self && !VOID.has(name)) opens++; }
      depth = Math.max(0, depth + opens - closes);
    }
    console.log(`${p.split('/').pop()!.padEnd(20)} unit ${unit}: depth-exact ${ok}/${lines.length}`);
    if (bads.length && unit === 2) for (const b of bads) console.log('    ' + b);
  }
}
