/** X88 probe 2 — is SPACE the cheapest readable channel, and can identifier text be
 *  moved into it invertibly?
 *
 *  The atom envelope wins because it carries 16 bits/token. The readable tier's densest
 *  channel is measured at ~14.9 bits/token for WORDS and only ~9.97 for DIGITS. So the
 *  question is whether structured identifier text (paths, package names, filenames) can be
 *  re-spelled into space-separated words — the densest readable channel — invertibly.
 *
 *  Every variant below is measured on real columns from real lanes, gross (no frontier).
 *  A variant is only interesting if it is CHEAPER and its inverse is statable in one line. */
import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
const enc: any = 'o200k_base';
const T = (s: string) => countTokens(s, enc);

const fl = fs.readFileSync('bench/holdout-ops/find-listing.txt', 'utf8').split('\n').filter(Boolean);
const paths = fl.map(l => l.split(/\s+/).slice(2).join(' '));
const lsl = fs.readFileSync('bench/holdout-x41/ls-l-real.txt', 'utf8').split('\n').filter(Boolean);
const names = lsl.map(l => l.replace(/^[^ ]+ +\d+ +[^ ]+ +[^ ]+ +\d+ +/, ''));
const apt = fs.readFileSync('bench/holdout-x41/apt-real.txt', 'utf8').split('\n').filter(l => l.includes('/now '));
const pkgs = apt.map(l => l.split(' ')[0]);

function report(label: string, orig: string[], variants: Record<string, (s: string) => string>) {
  const base = orig.join('\n');
  console.log(`\n--- ${label}  (${orig.length} items, joined by \\n) ---`);
  console.log(`  original                ${String(T(base)).padStart(6)} tok   ${JSON.stringify(orig[0]).slice(0,70)}`);
  for (const [name, fn] of Object.entries(variants)) {
    const v = orig.map(fn).join('\n');
    const d = T(v) - T(base);
    console.log(`  ${name.padEnd(24)}${String(T(v)).padStart(6)} tok   delta ${d >= 0 ? '+' : ''}${d}   ${JSON.stringify(orig.map(fn)[0]).slice(0,70)}`);
  }
}

report('find-listing PATH column', paths, {
  'slash->space': s => s.replace(/\//g, ' '),
  'all sep->space': s => s.replace(/[\/._@-]/g, ' '),
  'slash->space,keep ext': s => s.replace(/\//g, ' ').replace(/ js$/, '.js'),
  'drop node_modules/': s => s.replace(/^node_modules\//, ''),
  'slash->newline': s => s.replace(/\//g, '\n'),
  'reverse components': s => s.split('/').reverse().join('/'),
});

report('ls -l FILENAME column', names, {
  'dot->space': s => s.replace(/\./g, ' '),
  'sep->space': s => s.replace(/[._+-]/g, ' '),
  'sep->space (ext kept)': s => s.replace(/\.(?=[^.]*$)/, ' ').replace(/[._+-]/g, ' '),
});

report('apt PACKAGE column', pkgs, {
  'drop /now': s => s.replace(/\/now$/, ''),
  'dash->space': s => s.replace(/-/g, ' '),
  'drop lib prefix': s => s.replace(/^lib/, ''),
  'sep->space': s => s.replace(/[+.-]/g, ' '),
});

// the ambiguity fix: original spaces become a cheap glyph, separators become spaces
console.log('\n--- separator->space WITH original-space marker (the invertible form) ---');
for (const [label, items] of [['find paths', paths], ['ls names', names], ['apt pkgs', pkgs]] as any[]) {
  const base = items.join('\n');
  const mark = (s: string, g: string) => s.replace(/ /g, g).replace(/[\/._@+-]/g, ' ');
  for (const g of ['·', '|', '*', '#', '~', '@', '¦']) {
    const v = items.map((s: string) => mark(s, g)).join('\n');
    console.log(`  ${label.padEnd(12)} marker ${JSON.stringify(g)}: ${String(T(v)).padStart(6)} tok  delta ${T(v) - T(base) >= 0 ? '+' : ''}${T(v) - T(base)}  (glyph alone=${T(g)}, x5=${T(g.repeat(5))})`);
  }
  console.log(`  ${label.padEnd(12)} original    : ${String(T(base)).padStart(6)} tok`);
}

// how ambiguous is it really? count items containing a literal space
console.log('\n--- ambiguity census: items that already contain a space ---');
console.log(`  find paths with space: ${paths.filter(p => p.includes(' ')).length}/${paths.length}`);
console.log(`  ls names with space:   ${names.filter(p => p.includes(' ')).length}/${names.length}`);
console.log(`  apt pkgs with space:   ${pkgs.filter(p => p.includes(' ')).length}/${pkgs.length}`);
// separator census: how many distinct separators per lane
for (const [label, items] of [['find paths', paths], ['ls names', names], ['apt pkgs', pkgs]] as any[]) {
  const all = items.join('');
  const seps = ['/', '.', '_', '-', '@', '+'].filter(c => all.includes(c));
  console.log(`  ${label}: separators present ${JSON.stringify(seps)}  counts ${seps.map(c => c + ':' + (all.split(c).length - 1)).join(' ')}`);
}
