import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import { countTokens, countTokensExact, chunkCacheClear, chunkCacheStats } from '@/lib/omega/bpe';
import { tagstackContractFor, tagstackRestore, tagstackTransform } from '@/lib/omega/tagstack';
import { siblingTemplateRestore, siblingTemplateTransform } from '@/lib/omega/sibling-template';

interface Case { name: string; source: string; expected: 'fold' | 'refuse' }
const CASES: Case[] = [
  { name: 'nested XML', source: '<a><b>x</b><c><d>y</d></c></a>', expected: 'fold' },
  { name: 'quoted greater-than and self-close', source: '<r><a value=">"/><b value="x > y">z</b></r>', expected: 'fold' },
  { name: 'comment fake close', source: '<r><!-- </fake> --> <a>x</a></r>', expected: 'fold' },
  { name: 'CDATA fake close', source: '<r><![CDATA[ </fake> <x> ]]><a>x</a></r>', expected: 'fold' },
  { name: 'PI and internal-subset doctype', source: '<?xml version="1.0"?><!DOCTYPE r [<!ELEMENT r ANY><!ENTITY e ">">]><r><a>1</a><b>2</b></r>', expected: 'fold' },
  { name: 'namespace names', source: '<x:root xmlns:x="urn:x"><x:item>v</x:item><x:item/></x:root>', expected: 'fold' },
  { name: 'mixed EOL preservation', source: '<r>\r\n<a>one</a>\n<b>two</b>\r</r>', expected: 'fold' },
  { name: 'HTML void elements', source: '<!doctype html>\n<html><body><div><img src="x"><br><input disabled><span>x</span></div></body></html>', expected: 'fold' },
  { name: 'HTML comment and quoted attributes', source: '<!doctype html><html><!-- <x></x> --><body><a title="a > b">v</a><p>p</p></body></html>', expected: 'fold' },
  { name: 'HTML script raw text', source: '<!doctype html><html><body><script>const s = "<x></x>"; if (a < b) x();</script><p>ok</p></body></html>', expected: 'fold' },
  { name: 'HTML fake raw close prefix', source: '<!doctype html><script>const s = "</scriptx>";</script><p>x</p>', expected: 'fold' },
  { name: 'HTML textarea raw text', source: '<!doctype html><html><body><textarea><x>not a child</x></textarea><p>ok</p></body></html>', expected: 'fold' },
  { name: 'marker collision across full marker pool', source: '<r>~^◆¤‡°µ@!%+=§<a>x</a><b>y</b></r>', expected: 'refuse' },
  { name: 'marker pool glyphs are one token', source: '<r><a>x</a><b>y</b></r>', expected: 'fold' },
  { name: 'SVG self-closing children', source: '<svg xmlns="urn:s"><g><path d="M0 0"/><text>ok</text></g><g/></svg>', expected: 'fold' },
  { name: 'literal less-than text', source: '<r><a>2 < 3</a><b>4</b></r>', expected: 'fold' },
  { name: 'plain prose', source: 'The closing tag </p> is mentioned in prose, not parsed markup.', expected: 'refuse' },
  { name: 'JSX with fragment marker', source: 'import React from "react"; return (<><div></div></>);', expected: 'refuse' },
  { name: 'single closer below minimum', source: '<r><a/></r>', expected: 'refuse' },
  { name: 'mismatched nesting', source: '<a><b></a></b>', expected: 'refuse' },
  { name: 'unclosed element', source: '<a><b>x</a>', expected: 'refuse' },
  { name: 'case mismatch in XML', source: '<a></A>', expected: 'refuse' },
  { name: 'case mismatch in HTML lexical form', source: '<!doctype html><html><div></DIV></html>', expected: 'refuse' },
  { name: 'whitespace in closing tag', source: '<a><b>x</b ><c>y</c></a>', expected: 'refuse' },
  { name: 'pre-existing empty end marker', source: '<a><b>x</></a>', expected: 'refuse' },
  { name: 'malformed quoted attribute', source: '<a x="unterminated><b>y</b></a>', expected: 'refuse' },
  { name: 'malformed comment', source: '<a><!-- no end <b></b></a>', expected: 'refuse' },
  { name: 'malformed apparent end', source: '<a></b', expected: 'refuse' },
  { name: 'unsupported Unicode end name', source: '<a><é>x</é></a>', expected: 'refuse' },
  { name: 'HTML optional li closers', source: '<!doctype html><ul><li>one<li>two</ul>', expected: 'refuse' },
  { name: 'HTML raw-text close absent', source: '<!doctype html><script>const s = "</scriptx>";', expected: 'refuse' },
  { name: 'HTML void end tag refused', source: '<!doctype html><html><body><br></br><p>x</p></body></html>', expected: 'refuse' },
  { name: 'oversize guard', source: '<a>' + 'x'.repeat(100_001) + '</a>', expected: 'refuse' },
  { name: 'empty input', source: '', expected: 'refuse' },
];

function assert(ok: boolean, message: string): void { if (!ok) throw new Error(message); }
const rows: Array<Record<string, unknown>> = [];
let failed = 0;
for (const c of CASES) {
  const plan = tagstackTransform(c.source);
  const folded = plan !== null;
  let restored: string | null = null;
  let contractBound = false;
  if (plan) {
    restored = tagstackRestore(plan.text, plan.mode, plan.marker);
    const contract = tagstackContractFor(plan.mode, plan.marker);
    contractBound = countTokens(plan.marker, 'o200k_base') === 1 && contract.includes(plan.marker)
      && contract.includes('ignore comments, CDATA, PIs and declarations')
      && contract.includes('pops the top name') && contract.includes('Preserve every other byte.')
      && (plan.mode !== 'html' || (contract.includes('HTML voids never push:')
        && contract.includes('script/style/textarea/title text is opaque')
        && contract.includes('inside svg/math use XML rules.')));
  }
  const ok = c.expected === 'fold'
    ? Boolean(plan && restored === c.source && contractBound)
    : plan === null;
  if (!ok) failed++;
  rows.push({ name: c.name, expected: c.expected, folded, mode: plan?.mode ?? null,
    pairs: plan?.pairs ?? 0, pureInverseExact: plan ? restored === c.source : null,
    contractBound, pass: ok });
  console.log(`${ok ? 'PASS' : 'FAIL'} ${c.name} ${plan ? `${plan.mode}/${plan.pairs}` : 'refused'}`);
}

// Deterministic nested-markup fuzz: 200 valid trees with attributes, text, and EOLs.
let seed = 0x47a11;
const rnd = (n: number): number => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed % n; };
const names = ['r', 'a', 'b', 'x:item', 'v-2'];
for (let k = 0; k < 200; k++) {
  const depth = 2 + rnd(5);
  const chosen = Array.from({ length: depth }, () => names[rnd(names.length)]);
  let source = '<?xml version="1.0"?>\r\n';
  for (let j = 0; j < chosen.length; j++) source += `<${chosen[j]} a=\"v>${j}\">`;
  source += `text ${k} &amp; &lt;literal\r\n`;
  for (let j = chosen.length - 1; j >= 0; j--) source += `</${chosen[j]}>${j % 2 ? '\n' : ''}`;
  const plan = tagstackTransform(source);
  const ok = Boolean(plan && tagstackRestore(plan.text, 'xml', plan.marker) === source);
  if (!ok) failed++;
  rows.push({ name: `seeded-valid-${k}`, expected: 'fold', folded: Boolean(plan), pairs: plan?.pairs ?? 0, exact: ok, pass: ok });
}

// Candidate-specific adversaries: corrupt valid wires at lexical and stack boundaries.
const attackBase = '<r><a><b>payload</b></a><c>x</c></r>';
const attackPlan = tagstackTransform(attackBase);
assert(attackPlan, 'attack fixture must fold');
const m = attackPlan.marker;
const attacks = [
  attackPlan.text.replace(m, '</wrong>'),
  attackPlan.text + m,
  attackPlan.text.replace('<b>', '<b title="unterminated>'),
  attackPlan.text.replace('<r>', '<r><!-- no terminator '),
  attackPlan.text.replace(m, '</ >'),
  attackPlan.text + '</ghost>',
  attackPlan.text.replace('<r>', '<r><orphan>'),
  attackPlan.text.replace(m, '</x>'),
  attackPlan.text.replace(m, '</'),
  attackPlan.text.replace('<a>', '<a/>'),
  attackPlan.text.replace(m, '</\u00e9>'),
  attackPlan.text.replace('<b>', '<b/>'),
  '<!-- outside comment ' + m + ' -->' + attackPlan.text,
  '<!doctype html><script>' + attackPlan.text + '</script>',
  '<!doctype html><html><body><img><div>' + attackPlan.text + '</div></body></html>',
  '<r><![CDATA[' + m + ']]>' + attackPlan.text + '</r>',
];
for (let i = 0; i < attacks.length; i++) {
  const decoded = tagstackRestore(attacks[i], 'xml', m);
  const ok = decoded === null || decoded !== attackBase;
  if (!ok) failed++;
  rows.push({ name: `wire-adversary-${i}`, expected: 'reject-or-decode-different-source',
    decodedNull: decoded === null, exact: decoded === attackBase ? false : null, pass: ok });
}

// Check the actual held-out markup set through the planner only (no expensive parent encode here).
for (const file of ['page.html', 'chart.svg', 'pom.xml', 'component.jsx']) {
  const path = `bench/holdout-mk/${file}`;
  const source = fs.readFileSync(path, 'utf8');
  const plan = tagstackTransform(source);
  const restored = plan ? tagstackRestore(plan.text, plan.mode, plan.marker) : null;
  const ok = !plan || restored === source;
  if (!ok) failed++;
  rows.push({ name: `holdout-${file}`, path, chars: source.length, folded: Boolean(plan), mode: plan?.mode ?? null,
    pairs: plan?.pairs ?? 0, exact: plan ? restored === source : null, pass: ok });
  console.log(`${ok ? 'PASS' : 'FAIL'} holdout ${file}: ${plan ? `${plan.mode}/${plan.pairs}` : 'refused'}`);
}

// SIBLING-TEMPLATE: a real repository POM is the positive proof artifact; the
// parser/macro inverse is independently checked before any parent encode.
const pom = fs.readFileSync('bench/holdout-mk/pom.xml', 'utf8');
const siblingPlan = siblingTemplateTransform(pom);
const siblingRestored = siblingPlan ? siblingTemplateRestore(siblingPlan.text, siblingPlan.delimiters) : null;
const siblingPomExact = Boolean(siblingPlan && Buffer.compare(Buffer.from(siblingRestored ?? '', 'utf8'), Buffer.from(pom, 'utf8')) === 0);
if (!siblingPomExact || siblingPlan?.records !== 10 || siblingPlan?.slots !== 3) failed++;
  rows.push({ name: 'sibling-template-real-pom.xml', expected: 'fold-10-records-3-slots', folded: Boolean(siblingPlan),
  records: siblingPlan?.records ?? 0, slots: siblingPlan?.slots ?? 0, proxyGain: siblingPlan?.proxyGain ?? null,
  exact: siblingPomExact, pass: siblingPomExact && siblingPlan?.records === 10 && siblingPlan?.slots === 3 });

if (siblingPlan) {
  const markerPool = ['⟪', '⟫', '§', '¤', '‡', '°', 'µ', '◆', '⁞', '␟', '‖', '¶', '¦', '※', '~', '^', '@', '!', '%', '+', '='];
  const collisionSource = pom + markerPool.join('');
  const collisionRefused = siblingTemplateTransform(collisionSource) === null;
  if (!collisionRefused) failed++;
  rows.push({ name: 'sibling-template-all-marker-pool-collides', pass: collisionRefused });
}

const siblingRefusalCases: Array<[string, string]> = [
  ['plain-prose', 'three copies of this line, but no tags'],
  ['two-record-minimum', '<root><r><a>1</a><b>x</b></r><r><a>2</a><b>y</b></r></root>'],
  ['one-slot-only', '<root><r><a>1</a></r><r><a>2</a></r><r><a>3</a></r></root>'],
  ['outer-name-mismatch', '<root><r><a>1</a><b>x</b></r><s><a>2</a><b>y</b></s><t><a>3</a><b>z</b></t></root>'],
  ['outer-attribute-mismatch', '<root><r id="1"><a>1</a><b>x</b></r><r id="2"><a>2</a><b>y</b></r><r id="3"><a>3</a><b>z</b></r></root>'],
  ['child-order-mismatch', '<root><r><a>1</a><b>x</b></r><r><b>y</b><a>2</a></r><r><a>3</a><b>z</b></r></root>'],
  ['child-name-mismatch', '<root><r><a>1</a><b>x</b></r><r><a>2</a><c>y</c></r><r><a>3</a><b>z</b></r></root>'],
  ['template-whitespace-mismatch', '<root><r><a>1</a><b>x</b></r><r><a>2</a> <b>y</b></r><r><a>3</a><b>z</b></r></root>'],
  ['different-record-separators', '<root><r><a>1</a><b>x</b></r>\n<r><a>2</a><b>y</b></r>\n\n<r><a>3</a><b>z</b></r></root>'],
  ['non-whitespace-record-separator', '<root><r><a>1</a><b>x</b></r>,<r><a>2</a><b>y</b></r>,<r><a>3</a><b>z</b></r></root>'],
  ['nested-slot-element', '<root><r><a><q>1</q></a><b>x</b></r><r><a><q>2</q></a><b>y</b></r><r><a><q>3</q></a><b>z</b></r></root>'],
  ['self-closing-slot-element', '<root><r><a/><b>x</b></r><r><a/><b>y</b></r><r><a/><b>z</b></r></root>'],
  ['mismatched-close', '<root><r><a>1</a><b>x</b></r><r><a>2</a><b>y</b></q><r><a>3</a><b>z</b></r></root>'],
  ['unclosed-element', '<root><r><a>1</a><b>x</b></r><r><a>2</a><b>y</b></r><r><a>3</a><b>z</b></r>'],
  ['closing-tag-attributes', '<root><r><a>1</a><b>x</b></r><r><a>2</a><b>y</b></r><r><a>3</a><b>z</b></r x></root>'],
  ['preexisting-slot-syntax', '<root>{{1}}<r><a>1</a><b>x</b></r><r><a>2</a><b>y</b></r><r><a>3</a><b>z</b></r></root>'],
  ['over-text-limit', 'x'.repeat(100_001)],
];
for (const [name, source] of siblingRefusalCases) {
  const refused = siblingTemplateTransform(source) === null;
  if (!refused) failed++;
  rows.push({ name: `sibling-template-refuses-${name}`, pass: refused, refused });
}

// A compact, deeply nested balanced XML-shaped input makes the cumulative
// subtree-shape accounting exceed its bound; refusal is the required outcome.
let nested = '<a>1</a><b>2</b>';
for (let i = 0; i < 1000; i++) nested = `<x>${nested}<b>2</b></x>`;
const budgetRefused = siblingTemplateTransform(`<root>${nested}</root>`) === null;
if (!budgetRefused) failed++;
rows.push({ name: 'sibling-template-shape-work-budget', pass: budgetRefused, refused: budgetRefused,
  sourceChars: nested.length + 13 });

// The same reversible mechanism is checked on other existing XML-family lanes;
// unsupported HTML/JSX/TeX/SQL are legitimate no-plan outcomes.
for (const file of ['chart.svg', 'page.html', 'component.jsx', 'dump.sql', 'paper.tex', 'agent-history.md']) {
  const source = fs.readFileSync(`bench/holdout-mk/${file}`, 'utf8');
  const plan = siblingTemplateTransform(source);
  const restored = plan ? siblingTemplateRestore(plan.text, plan.delimiters) : null;
  const exact = !plan || Buffer.compare(Buffer.from(restored ?? '', 'utf8'), Buffer.from(source, 'utf8')) === 0;
  if (!exact) failed++;
  rows.push({ name: `sibling-template-holdout-${file}`, folded: Boolean(plan),
    records: plan?.records ?? 0, slots: plan?.slots ?? 0, exact: plan ? exact : null, pass: exact });
}
for (const file of ['apache-maven.pom.xml', 'commons-lang.pom.xml']) {
  const source = fs.readFileSync(`bench/x47/holdouts/${file}`, 'utf8');
  const plan = siblingTemplateTransform(source);
  const restored = plan ? siblingTemplateRestore(plan.text, plan.delimiters) : null;
  const exact = !plan || Buffer.compare(Buffer.from(restored ?? '', 'utf8'), Buffer.from(source, 'utf8')) === 0;
  if (!exact) failed++;
  rows.push({ name: `sibling-template-external-${file}`, sha256: crypto.createHash('sha256').update(source, 'utf8').digest('hex'),
    folded: Boolean(plan), records: plan?.records ?? 0, slots: plan?.slots ?? 0,
    proxyGain: plan?.proxyGain ?? null, exact: plan ? exact : null, pass: exact });
}

// Corrupt one field separator and one closing sentinel in the actual POM macro.
if (siblingPlan) {
  const d = siblingPlan.delimiters;
  const badField = siblingPlan.text.replace(d.field, d.row);
  const badClose = siblingPlan.text.replace(d.close, d.open);
  const fieldDecoded = siblingTemplateRestore(badField, d);
  const closeDecoded = siblingTemplateRestore(badClose, d);
  const fieldRejects = fieldDecoded === null || fieldDecoded !== pom;
  const closeRejects = closeDecoded === null || closeDecoded !== pom;
  if (!fieldRejects || !closeRejects) failed++;
  rows.push({ name: 'sibling-template-corrupt-field-delimiter', pass: fieldRejects, rejected: fieldDecoded === null });
  rows.push({ name: 'sibling-template-corrupt-close-marker', pass: closeRejects, rejected: closeDecoded === null });
}

// Large candidate strings are exact-counted but must not be retained as cache
// keys. The cache remains useful for a 4,096-character repeatable candidate.
chunkCacheClear();
const cacheSmall = 'a'.repeat(4_096);
const cacheLarge = 'b'.repeat(4_097);
const smallCount = countTokens(cacheSmall, 'o200k_base');
const largeCount = countTokens(cacheLarge, 'o200k_base');
const smallExact = countTokensExact(cacheSmall, 'o200k_base');
const largeExact = countTokensExact(cacheLarge, 'o200k_base');
const cacheStats = chunkCacheStats();
const cacheBoundPass = smallCount === smallExact && largeCount === largeExact
  && cacheStats.longSize === 1 && cacheStats.longChars === cacheSmall.length;
if (!cacheBoundPass) failed++;
rows.push({ name: 'large-token-count-memo-bound', smallChars: cacheSmall.length, largeChars: cacheLarge.length,
  smallExact: smallCount === smallExact, largeExact: largeCount === largeExact,
  retainedLongEntries: cacheStats.longSize, retainedLongChars: cacheStats.longChars, pass: cacheBoundPass });

const summary = { cases: rows.length, handCases: CASES.length, seededFuzz: 200, wireAdversaries: attacks.length,
  failures: failed, passed: rows.length - failed,
  source: 'TAGSTACK and SIBLING-TEMPLATE exact transform/restore red-team; parent frontier tested separately; no external LLM reader' };
fs.mkdirSync('bench/x47/receipts', { recursive: true });
fs.writeFileSync('bench/x47/receipts/redteam.json', JSON.stringify({ summary, rows }, null, 2) + '\n');
console.log('SUMMARY', JSON.stringify(summary));
if (failed) process.exitCode = 1;
