import * as fs from 'node:fs';
import { fotarContract, fotarDecode, fotarDecodeEnvelope, fotarDecodeWithTable, fotarParseEnvelope, fotarPlan } from '../../src/lib/omega/fotar';

const cases = [
  { name: 'repeated BPE fragments', text: 'alpha beta alpha beta alpha beta' },
  { name: 'CRLF and no final newline', text: 'ERROR alpha\r\nERROR alpha\r\nERROR alpha' },
  { name: 'Unicode and emoji', text: 'π emoji 😀 π emoji 😀 π' },
  { name: 'JSON quoting and escapes', text: '{"note":"a\\tb"}\n{"note":"a\\tb"}' },
  { name: 'punctuation adjacency', text: 'word,word; word,word; word,word.' },
  { name: 'repeated multiline ops fragment', text: 'unit=alpha status=ready\nunit=alpha status=ready\nunit=alpha status=ready' },
  { name: 'profitable long repeated lexical fragments plus astral Unicode', text: Array(40).fill('internationalization 😀').join(' ') },
];
const results = cases.map(({ name, text }) => {
  const plan = fotarPlan(text, 'o200k_base');
  return { name, pass: plan === null || (plan.exact && fotarDecode(plan.mapped, plan.entries) === text),
    entries: plan?.entries.length ?? 0, directMessageTokens: plan?.directMessageTokens ?? null };
});
const applied = fotarPlan(cases[cases.length - 1].text, 'o200k_base');
results.push({ name: 'candidate plan actually applies on high-repetition control', pass: !!applied && applied.entries.length > 0 && fotarDecode(applied.mapped, applied.entries) === cases[cases.length - 1].text,
  entries: applied?.entries.length ?? 0, directMessageTokens: applied?.directMessageTokens ?? null });
const overlap = fotarDecode('§F10⟧x§F1⟧', [
  { marker: '§F1⟧', surface: 'B', frequency: 1 },
  { marker: '§F10⟧', surface: 'A', frequency: 1 },
]) === 'AxB';
const markerCollision = ['⟦F', '‹F', '§F', '¤F', '¦F', '⟬F']
  .map((stem) => `${stem}0⟧`).join(' ') + ' repeated repeated repeated';
const collisionRefused = fotarPlan(markerCollision, 'o200k_base') === null;
results.push({ name: 'longest-marker parsing', pass: overlap, entries: 2, directMessageTokens: null });
results.push({ name: 'all marker-pool collisions refuse', pass: collisionRefused, entries: 0, directMessageTokens: null });
const tableJson = applied ? JSON.stringify(applied.entries.map(({ marker, surface }) => [marker, surface])) : '';
const envelope = applied ? fotarParseEnvelope(`${fotarContract()}\nTABLE:${tableJson}\nPARENT-WIRE`) : null;
const serializedTableRoundTrip = !!applied && !!envelope && envelope.parentMessage === 'PARENT-WIRE' &&
  fotarDecodeWithTable(applied.mapped, envelope.tableJson) === cases[cases.length - 1].text &&
  fotarDecodeEnvelope(`${fotarContract()}\nTABLE:${tableJson}\n${applied.mapped}`, applied.mapped) === cases[cases.length - 1].text;
results.push({ name: 'serialized in-band table parses and restores', pass: serializedTableRoundTrip,
  entries: applied?.entries.length ?? 0, directMessageTokens: applied?.directMessageTokens ?? null });
const malformedTableRefused = fotarParseEnvelope(`${fotarContract()}\nTABLE:{bad json}\nPARENT`) === null;
results.push({ name: 'malformed serialized JSON table refuses', pass: malformedTableRefused, entries: 0, directMessageTokens: null });
const independentCase = applied ? { source: cases[cases.length - 1].text, mapped: applied.mapped,
  tableJson, entries: applied.entries, exactTypeScript: fotarDecodeWithTable(applied.mapped, tableJson) === cases[cases.length - 1].text } : null;
fs.mkdirSync('bench/x65/receipts', { recursive: true });
fs.writeFileSync('bench/x65/receipts/fotar-redteam.json', JSON.stringify({ checks: results, independentCase }, null, 2) + '\n');
console.log(JSON.stringify(results, null, 2));
if (results.some((r) => !r.pass)) process.exitCode = 1;
