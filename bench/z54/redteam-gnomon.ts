// z54 red team for GNOMON: edge cases for the REST and npm rules. Writes the whole chat message the reader sees
// (encoder's decoderPrompt) for every case where a rule was applied, so the CPython reader parses the real message.
import fs from 'node:fs';
import { gnomonEncode, gnomonReduce, gnomonRestore, gnomonSentences, gnomonPrompt, gnomonWireOk, gnomonCompose, GNOMON_GRAMMA_DIALECTS, type GnomonRule } from '@/lib/omega/gnomon';
import { grammaEncode, grammaDecode, GRAMMA_DIALECTS } from '@/lib/omega/gramma';
import { daedalusEncode, daedalusDecode } from '@/lib/omega/daedalus';

let seed = 12345;
const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
const pick = <T,>(a: T[]) => a[Math.floor(rnd() * a.length)];

const cases: { name: string; text: string }[] = [
  { name: 'empty', text: '' },
  { name: 'rest-basic', text: '[\n {\n  "url": "https://api.github.com/repos/o/r/issues/7",\n  "comments_url": "https://api.github.com/repos/o/r/issues/7/comments",\n  "events_url": "https://api.github.com/repos/o/r/issues/7/events",\n  "labels_url": "https://api.github.com/repos/o/r/issues/7/labels{/name}",\n  "html_url": "https://github.com/o/r/pull/7"\n }\n]' },
  { name: 'rest-digit-trap', text: '{\n "url": "https://x.example/repos/aaaaaaaa/issues/12",\n "a_url": "https://x.example/repos/aaaaaaaa/issues/123",\n "b_url": "https://x.example/repos/aaaaaaaa/issues/12/x"\n}' },
  { name: 'rest-stem-before-url', text: '{\n "a_url": "https://h.example/a/b/c/d",\n "url": "https://h.example/a/b/c/d/e",\n "z_url": "https://h.example/a/b/c/d/e/z"\n}' },
  { name: 'rest-no-url-key', text: '{\n "x_url": "https://h.example/aaaaaaaaaaaaaa/x",\n "y_url": "https://h.example/aaaaaaaaaaaaaa/x/y"\n}' },
  { name: 'rest-nested', text: '{\n "url": "https://h.example/q/zzzzzzzzzzzz",\n "user": {\n  "url": "https://h.example/u/qqqqqqqqqqq",\n  "followers_url": "https://h.example/u/qqqqqqqqqqq/followers"\n },\n "events_url": "https://h.example/q/zzzzzzzzzzzz/events"\n}' },
  { name: 'rest-self-equal', text: '{\n "url": "https://h.example/self/equal/value",\n "self_url": "https://h.example/self/equal/value"\n}' },
  { name: 'rest-tabs', text: '{\n\t"url": "https://h.example/t/tttttttttttt",\n\t"x_url": "https://h.example/t/tttttttttttt/x"\n}' },
  { name: 'rest-nonhttps-url', text: '{\n "url": "/relative/path/xxxxxxxxxxxxxx",\n "x_url": "/relative/path/xxxxxxxxxxxxxx/x"\n}' },
  { name: 'npm-basic', text: '{\n "name": "t",\n "lockfileVersion": 3,\n "packages": {\n  "": {\n   "name": "t"\n  },\n  "node_modules/@scope/pkg": {\n   "version": "1.2.3-rc.1",\n   "resolved": "https://registry.npmjs.org/@scope/pkg/-/pkg-1.2.3-rc.1.tgz",\n   "integrity": "sha512-AAAA"\n  },\n  "node_modules/a/node_modules/b": {\n   "version": "0.0.1",\n   "resolved": "https://registry.npmjs.org/b/-/b-0.0.1.tgz"\n  }\n }\n}' },
  { name: 'npm-version-mismatch', text: '{\n "packages": {\n  "node_modules/p": {\n   "version": "2.0.0",\n   "resolved": "https://registry.npmjs.org/p/-/p-1.0.0.tgz"\n  }\n }\n}' },
  { name: 'npm-version-after', text: '{\n "packages": {\n  "node_modules/q": {\n   "resolved": "https://registry.npmjs.org/q/-/q-3.0.0.tgz",\n   "version": "3.0.0"\n  }\n }\n}' },
  { name: 'npm-crlf', text: '{\r\n "packages": {\r\n  "node_modules/c": {\r\n   "version": "1.0.0",\r\n   "resolved": "https://registry.npmjs.org/c/-/c-1.0.0.tgz"\r\n  }\r\n }\r\n}' },
  { name: 'npm-unicode-name', text: '{\n "packages": {\n  "node_modules/ünï": {\n   "version": "1.0.0",\n   "resolved": "https://registry.npmjs.org/ünï/-/ünï-1.0.0.tgz"\n  }\n }\n}' },
  { name: 'payload-contains-sentences', text: 'Resolved ~ = https://registry.npmjs.org/NAME/-/BASE-VERSION.tgz, NAME = the package path after node_modules/, BASE = its last segment, VERSION = the entry version.\n~ in a "_url" value = the object url + "/" + the key without "_url"; ~k+x = link k of the object (0 = url, then earlier links in order) + x.\n{\n "url": "https://h.example/payload/aaaaaaaaaaaa",\n "x_url": "https://h.example/payload/aaaaaaaaaaaa/x"\n}' },
  { name: 'payload-tilde-prose', text: 'Use ~ for home and ~1 for the first item. The rate is ~5 per cent, see ~/notes.' },
  { name: 'prose-plain', text: 'The quick brown fox jumps over the lazy dog. Everything is fine and nothing is broken here.' },
];
// generated: a 30-entry lockfile with scoped, nested and pre-release versions
{
  const lines: string[] = ['{', ' "packages": {'];
  for (let i = 0; i < 30; i++) {
    const scope = rnd() < 0.4 ? '@s' + Math.floor(rnd() * 9) + '/' : '';
    const name = scope + 'pkg' + i + pick(['', '-core', '-x']);
    const ver = `${Math.floor(rnd() * 5)}.${Math.floor(rnd() * 20)}.${Math.floor(rnd() * 9)}${rnd() < 0.2 ? '-beta.' + i : ''}`;
    const base = name.split('/').pop();
    const url = rnd() < 0.9 ? `https://registry.npmjs.org/${name}/-/${base}-${ver}.tgz` : `https://registry.npmjs.org/${name}/-/${base}-9.9.9.tgz`;
    lines.push(`  "node_modules/${name}": {`, `   "version": "${ver}",`, `   "resolved": "${url}",`, `   "integrity": "sha512-${'A'.repeat(20)}${i}"`, '  },');
  }
  lines[lines.length - 1] = '  }';
  lines.push(' }', '}');
  cases.push({ name: 'npm-generated-30', text: lines.join('\n') });
}
// generated: 20 objects with REST links, shared bases, some digit traps and some exact-match fields
{
  const out: string[] = ['['];
  for (let i = 0; i < 20; i++) {
    const n = 100 + Math.floor(rnd() * 900);
    const repo = pick(['alpha/one', 'beta/two-x', 'gamma/three']);
    const base = `https://api.example.com/repos/${repo}/issues/${n}`;
    out.push(' {', `  "url": "${base}",`, `  "repository_url": "https://api.example.com/repos/${repo}",`, `  "comments_url": "${base}/comments",`, `  "events_url": "${base}/events",`, `  "html_url": "https://example.com/${repo}/pull/${n}",`, `  "diff_url": "https://example.com/${repo}/pull/${n}.diff",`, `  "self_url": "${base}",`, `  "timeline_url": "${base}/timeline"`, ' },');
  }
  out.push(']');
  cases.push({ name: 'rest-generated-20', text: out.join('\n') });
}
// fuzz: random mixtures of URL-key lines, npm lines, braces and prose
for (let f = 0; f < 60; f++) {
  const L: string[] = [];
  const n = 5 + Math.floor(rnd() * 40);
  const b = 'https://h.example/' + 'seg'.repeat(1 + Math.floor(rnd() * 5)) + '/' + Math.floor(rnd() * 99999);
  for (let i = 0; i < n; i++) {
    const r = rnd();
    if (r < 0.15) L.push('{');
    else if (r < 0.25) L.push('}');
    else if (r < 0.45) L.push(`  "${pick(['url', 'a_url', 'comments_url', 'x_url', 'events_url'])}": "${rnd() < 0.7 ? b + pick(['', '/c', '/cc', '1', '/9/z']) : pick(['/rel', 'plain', 'https://other.example/q'])}",`);
    else if (r < 0.6) L.push(`  "node_modules/p${Math.floor(rnd() * 4)}": {`);
    else if (r < 0.7) L.push(`   "version": "${Math.floor(rnd() * 3)}.0.0",`);
    else if (r < 0.8) L.push(`   "resolved": "https://registry.npmjs.org/p${Math.floor(rnd() * 4)}/-/p${Math.floor(rnd() * 4)}-${Math.floor(rnd() * 3)}.0.0.tgz",`);
    else L.push(pick(['lorem ipsum dolor', '~ 1', '', '  x', 'Resolved ~ =']));
  }
  cases.push({ name: 'fuzz-' + f, text: L.join('\n') });
}

const messages: string[] = [];
const expected: string[] = [];
const rows: any[] = [];
// (a) the shipped guarded encoder, as the user would see it
for (const c of cases) {
  const r = gnomonEncode(c.text, 'o200k_base');
  const row: any = { name: c.name, arm: 'guarded', rules: r.rules.join('+') || 'plain', tsExact: r.exact, M: r.messageTokens, frontierM: r.frontierM };
  if (r.rules.length) { messages.push(r.decoderPrompt); expected.push(c.text); row.pyChecked = true; }
  else row.pyChecked = false;
  rows.push(row);
}
// layout cases: the same JSON objects printed with 2 and 4 spaces (JSON.stringify), so every JSON unit is exercised
{
  const obj = {
    url: 'https://api.example.org/repos/acme/tool/issues/7',
    comments_url: 'https://api.example.org/repos/acme/tool/issues/7/comments',
    events_url: 'https://api.example.org/repos/acme/tool/issues/7/events',
    packages: {
      'node_modules/@acme/core': { version: '2.4.1', resolved: 'https://registry.npmjs.org/@acme/core/-/core-2.4.1.tgz' },
      'node_modules/x/node_modules/y': { version: '1.0.0', resolved: 'https://registry.npmjs.org/y/-/y-1.0.0.tgz' },
    },
  };
  cases.push({ name: 'layout-json2', text: JSON.stringify(obj, null, 2) });
  cases.push({ name: 'layout-json4', text: JSON.stringify(obj, null, 4) });
}
// (b) FORCED: every rule subset on every case, whether or not it pays, so the readers meet every edge
const SUBSETS: GnomonRule[][] = [['npm'], ['rest'], ['npm', 'rest']];
let forcedOk = 0, forcedBad = 0, forcedApplied = 0, forcedGramOk = 0;
for (const c of cases) {
  for (const rules of SUBSETS) {
    const { reduced, fields } = gnomonReduce(c.text, rules);
    if (fields.rest + fields.npm === 0) continue;
    forcedApplied++;
    const d = daedalusEncode(reduced, 'o200k_base');
    if (!gnomonWireOk(d)) { rows.push({ name: c.name, arm: 'inadmissible:' + rules.join('+'), tsExact: true, pyChecked: false }); continue; }
    const tsOk = d.exact && gnomonRestore(daedalusDecode(d.wire), rules) === c.text;
    if (!tsOk) { forcedBad++; rows.push({ name: c.name, arm: 'forced:' + rules.join('+'), tsExact: false }); continue; }
    forcedOk++;
    messages.push(gnomonPrompt(d.wire, rules));
    expected.push(c.text);
    rows.push({ name: c.name, arm: 'forced:' + rules.join('+'), tsExact: true, pyChecked: true, fields });
    // GRAMMA base (JSON dialects): same subset, its own reader inside, then restore
    const g = grammaEncode(reduced, 'o200k_base', { dialects: GNOMON_GRAMMA_DIALECTS });
    const gInner = grammaDecode(g.decoderPrompt);
    const gOk = g.exact && gnomonWireOk(g.inner) && gInner === reduced && gnomonRestore(gInner, rules) === c.text;
    if (!gOk) { forcedBad++; rows.push({ name: c.name, arm: 'forced-gramma:' + rules.join('+'), tsExact: false }); continue; }
    forcedGramOk++;
    messages.push(gnomonCompose(g.decoderPrompt, rules));
    expected.push(c.text);
    rows.push({ name: c.name, arm: 'forced-gramma:' + rules.join('+') + '/' + g.winningDialect, tsExact: true, pyChecked: true, fields });
  }
}
// (c) FORCED DIALECTS: every JSON dialect (json1/json2/json4/jsontab) on every case and rule set, when its
//     expansion is exact on the text. This exercises each CPython jsonPretty unit, whether or not GRAMMA picks it.
let dialectMsgs = 0, dialectBad = 0;
const dialectIds: Record<string, number> = {};
for (const c of cases) {
  for (const rules of [[] as GnomonRule[], ...SUBSETS]) {
    const { reduced } = gnomonReduce(c.text, rules);
    for (const dd of GRAMMA_DIALECTS) {
      if (!dd.id.startsWith('json')) continue;
      const cheap = dd.canon(reduced);
      if (cheap === reduced || dd.expand(cheap) !== reduced) continue;
      const r = daedalusEncode(cheap, 'o200k_base');
      if (!gnomonWireOk(r) || r.decoded !== cheap || dd.expand(r.decoded) !== reduced) continue;
      if (gnomonRestore(dd.expand(r.decoded), rules) !== c.text) { dialectBad++; rows.push({ name: c.name, arm: 'dialect:' + dd.id, tsExact: false }); continue; }
      const prompt = dd.clause + '\n' + r.decoderPrompt;
      messages.push(gnomonCompose(prompt, rules));
      expected.push(c.text);
      dialectMsgs++;
      dialectIds[dd.id] = (dialectIds[dd.id] ?? 0) + 1;
      rows.push({ name: c.name, arm: 'dialect:' + dd.id + ':' + (rules.join('+') || 'plain'), tsExact: true, pyChecked: true });
    }
  }
}
console.log(JSON.stringify({ dialectMsgs, dialectIds, dialectBad }));
console.log(JSON.stringify({ forcedApplied, forcedTsOk: forcedOk, forcedGrammaOk: forcedGramOk, forcedTsBad: forcedBad }));
fs.writeFileSync('bench/z54/receipts/redteam-gnomon.messages.json', JSON.stringify(messages));
fs.writeFileSync('bench/z54/receipts/redteam-gnomon.expected.json', JSON.stringify(expected));
fs.writeFileSync('bench/z54/receipts/redteam-gnomon.ts.jsonl', rows.map(r => JSON.stringify(r)).join('\n') + '\n');
console.log(JSON.stringify({ cases: cases.length, rulesApplied: messages.length, tsFailures: rows.filter(r => !r.tsExact).length }));
