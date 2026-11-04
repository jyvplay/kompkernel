/** t18: is XML/HTML indentation a function of tag nesting depth? */
import * as fs from 'node:fs';
import { countTokens as T } from '../../src/lib/omega/bpe';
const enc: any = 'o200k_base';
const VOID = new Set('area base br col embed hr img input link meta param source track wbr'.split(' '));
for (const p of process.argv.slice(2)) {
  const t = fs.readFileSync(p, 'utf8');
  const lines = t.split('\n');
  let depth = 0, ok = 0, bad = 0; const units = new Map<number, number>(); const bads: string[] = [];
  const reparsed: string[] = [];
  for (const l of lines) {
    const body = l.replace(/^[ \t]+/, '');
    const lead = l.slice(0, l.length - body.length);
    // compute expected indent by unit
    const unit = 2;
    const guess = ' '.repeat(Math.max(0, depth) * unit);
    if (lead === guess) ok++; else { bad++; if (bads.length < 3) bads.push(`depth ${depth} lead ${JSON.stringify(lead)} want ${JSON.stringify(guess)} :: ${body.slice(0,40)}`); }
    if (lead) units.set(lead.length, (units.get(lead.length) ?? 0) + 1);
    reparsed.push(guess + body);
    // update depth by scanning tags
    let scan = body.replace(/<!--[\s\S]*?-->/g, '');
    const tagRe = /<(\/?)([A-Za-z][\w:-]*)((?:"[^"]*"|'[^']*'|[^>"'])*)>/g;
    let m; let opens = 0, closes = 0;
    while ((m = tagRe.exec(scan))) {
      const isClose = m[1] === '/', name = m[2].toLowerCase(), self = /\/\s*$/.test(m[3]);
      if (isClose) closes++; else if (!self && !VOID.has(name)) opens++;
    }
    depth = Math.max(0, depth + opens - closes);
  }
  console.log(`${p.split('/').pop()!.padEnd(20)} raw ${String(T(t,enc)).padStart(5)} stripped ${String(T(lines.map(l=>l.replace(/^[ \t]+/,'')).join('\n'),enc)).padStart(5)} lines ${lines.length} depth-exact ${ok}/${lines.length} leading ${[...units.entries()].sort((a,b)=>b[1]-a[1]).slice(0,5).map(x=>x[0]+'x'+x[1]).join(' ')}`);
  for (const b of bads) console.log('    ' + b);
}
