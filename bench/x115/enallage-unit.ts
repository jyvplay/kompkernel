/** X115 ENALLAGE unit probes: bijection, ambiguity guard, independent decoder,
 * contract token ladder. No frontier calls. */
import assert from 'node:assert/strict';
import { countTokens } from '../../src/lib/omega/bpe';
import { enallageRewrite, enallageExpand, enallageSymbolicToOctal, enallageOctalToSymbolic, ENALLAGE_KEY } from '../../src/lib/omega/enallage';
import { tagstackDecode } from '../../src/lib/omega/tagstack';

const enc = 'o200k_base' as const;
let passed = 0;
function ok(name: string, fn: () => void) { fn(); passed++; console.log(`PASS ${name}`); }

// Independent decoder written from the contract, not importing the encoder inverse.
function independentExpand(s: string): string {
  return s.replace(/^([dlcbps-])([0-7]{4})(?= )/gm, (_all, t: string, d: string) => {
    const sp = Number(d[0]);
    let out = t;
    for (let i = 0; i < 3; i++) {
      const v = Number(d[i + 1]);
      out += (v & 4) ? 'r' : '-';
      out += (v & 2) ? 'w' : '-';
      const x = (v & 1) !== 0;
      if (i === 0 && (sp & 4)) out += x ? 's' : 'S';
      else if (i === 1 && (sp & 2)) out += x ? 's' : 'S';
      else if (i === 2 && (sp & 1)) out += x ? 't' : 'T';
      else out += x ? 'x' : '-';
    }
    return out;
  });
}

ok('all 4096 modes round-trip through independent decoder', () => {
  for (let n = 0; n < 4096; n++) {
    const d = n.toString(8).padStart(4, '0');
    const sym = enallageOctalToSymbolic('-', d)!;
    assert.equal(sym.length, 10);
    assert.equal(enallageSymbolicToOctal('-', sym.slice(1)), '-'+d);
    const line = `-` + d + ` 1 root root 0 Jan 1 00:00 f\n`;
    assert.equal(independentExpand(line), sym + ` 1 root root 0 Jan 1 00:00 f\n`);
  }
});

ok('file type chars preserved', () => {
  for (const t of ['d','l','c','b','p','s','-']) {
    const line = `${t}0755 x\n`;
    assert.equal(independentExpand(line), enallageOctalToSymbolic(t, '0755') + ' x\n');
  }
});

ok('ambiguity guard refuses pre-existing octal form', () => {
  const text = '-rw-r--r-- 1 root root 0 x\n-0644 1 root root 0 y\n';
  assert.equal(enallageRewrite(text), null);
});

ok('no mode fields refuses', () => {
  assert.equal(enallageRewrite('hello world\n'), null);
});

ok('line-local rewrite preserves other bytes', () => {
  const text = 'header\n-rwxr-xr-x 2 root root 4096 Jun 1 12:00 dir\ntrailer';
  const rw = enallageRewrite(text)!;
  assert.equal(rw.hits, 1);
  assert.equal(rw.wire, 'header\n-0755 2 root root 4096 Jun 1 12:00 dir\ntrailer');
  assert.equal(enallageExpand(rw.wire), text);
  assert.equal(independentExpand(rw.wire), text);
});

ok('special bits s/S/t/T', () => {
  const cases = ['-rwsr-xr-x', '-rw-r-Sr-x', '-rwxr-xr-t', '-rwxr-xr-T', '-rwsr-sr-t'];
  for (const c of cases) {
    const text = c + ' 1 root root 0 f\n';
    const rw = enallageRewrite(text)!;
    assert.equal(enallageExpand(rw.wire), text);
    assert.equal(independentExpand(rw.wire), text);
  }
});

ok('contract token ladder', () => {
  const keys = [
    ENALLAGE_KEY,
    'X115. Body first. Then line-start Tnnnn before space is type T plus octal chmod nnnn; expand to ls -l symbolic mode. Print only.',
    'X115. Body first. Then Tnnnn at line start before space = T + symbolic chmod nnnn. Print only.',
    'X115. Body first. Line-start Tnnnn␠ is T plus ls -l mode for octal nnnn. Print only.',
  ];
  for (const k of keys) console.log(`  key ${countTokens(k, enc)} tok: ${k}`);
  assert.ok(countTokens(ENALLAGE_KEY, enc) <= 15);
});

ok('tagstackDecode dispatches the compact key and expands after the parent', () => {
  const body = '-0755 1 root root 0 f\n';
  const source = '-rwxr-xr-x 1 root root 0 f\n';
  const msg = ENALLAGE_KEY + '\n' + body;
  assert.equal(tagstackDecode(msg), source);
  assert.equal(tagstackDecode(msg, (x) => x), source);
});

console.log(`${passed} passed`);
