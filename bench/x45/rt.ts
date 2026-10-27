import * as fs from 'node:fs';
import { SYNKRISIS_REPEAT_CONTRACT, SYNKRISIS_WORD_CONTRACT, synkrisisDecode, synkrisisEncode } from '@/lib/omega/synkrisis';

const failures: string[] = [];
const receipt: string[] = [];
const pass = (name: string, ok: boolean, detail = '') => {
  const line = `${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ` · ${detail}` : ''}`;
  console.log(line);
  receipt.push(line);
  if (!ok) failures.push(name);
};

const djangoText = fs.readFileSync('bench/z45/corpus/licenses/django_django.txt', 'utf8');
const django = synkrisisEncode(djangoText, 'o200k_base');
pass('real BSD-3 word-canon exact', django.arm === 'word-canon' && django.decoded === djangoText && synkrisisDecode(django.message) === djangoText,
  `M=${django.messageTokens} prior=${django.parentTokens}`);

const bundleText = fs.readFileSync('bench/x44/lanes/third-party-notices.txt', 'utf8');
const bundle = synkrisisEncode(bundleText, 'o200k_base');
pass('real six-MIT multi-copy exact', bundle.arm === 'multi-copy' && bundle.decoded === bundleText && synkrisisDecode(bundle.message) === bundleText,
  `M=${bundle.messageTokens} prior=${bundle.parentTokens}`);

const badJson = django.message.replace('"layout":[', '"layout":["bad",');
pass('malformed word payload fails closed', synkrisisDecode(badJson) === badJson);
const wordMarker = 'SYNKRISIS/WORD\n';
const wordAt = django.message.indexOf(wordMarker);
const wordPayload = JSON.parse(django.message.slice(wordAt + wordMarker.length));
const tooManyLayoutLines = SYNKRISIS_WORD_CONTRACT + '\n' + wordMarker + JSON.stringify({ ...wordPayload, layout: Array(801).fill(0) });
pass('over-limit layout fails closed', synkrisisDecode(tooManyLayoutLines) === tooManyLayoutLines);
const oversizedIndent = SYNKRISIS_WORD_CONTRACT + '\n' + wordMarker + JSON.stringify({ ...wordPayload, indents: [[1, 40_001]] });
pass('over-limit indentation fails closed', synkrisisDecode(oversizedIndent) === oversizedIndent);

const badPhrase = django.message.replace('"the copyright holder"', '"absent phrase"');
pass('non-matching phrase fails closed', synkrisisDecode(badPhrase) === badPhrase);

const badRepeat = bundle.contract + '\n' + bundle.wire.split('\n').slice(0, 2).join('\n');
pass('too-few repeat slots fail closed', synkrisisDecode(badRepeat) === badRepeat);
const overfullRepeat = SYNKRISIS_REPEAT_CONTRACT + '\n' + Array.from({ length: 26 }, (_, i) => `holder-${i}`).join('\n');
pass('too-many repeat slots fail closed', synkrisisDecode(overfullRepeat) === overfullRepeat);
const oversizeMessage = 'x'.repeat(100_001);
pass('oversize message is not parsed', synkrisisDecode(oversizeMessage) === oversizeMessage);

const flaskText = fs.readFileSync('bench/z45/corpus/licenses/pallets_flask.txt', 'utf8');
const flask = synkrisisEncode(flaskText, 'o200k_base');
pass('unsupported double-space variant is identity', flask.arm === 'identity' && flask.decoded === flaskText &&
  flask.messageTokens === flask.parentTokens, `M=${flask.messageTokens} prior=${flask.parentTokens}`);
const mixedEolText = djangoText.replace('\n', '\r\n');
const mixedEol = synkrisisEncode(mixedEolText, 'o200k_base');
pass('mixed-EOL canonical text declines word-canon', mixedEol.arm !== 'word-canon' && mixedEol.decoded === mixedEolText &&
  mixedEol.messageTokens <= mixedEol.parentTokens);

const prose = 'No known canonical license appears here; leave every byte untouched.\n';
const identity = synkrisisEncode(prose, 'o200k_base');
pass('ordinary prose remains exact and gated', identity.arm === 'identity' && identity.decoded === prose &&
  identity.messageTokens === identity.parentTokens);

if (failures.length) {
  const summary = `RED TEAM FAILURES (${failures.length}): ${failures.join(', ')}`;
  console.error(summary);
  receipt.push(summary);
  process.exitCode = 1;
} else {
  console.log('RED TEAM: all cases passed.');
  receipt.push('RED TEAM: all cases passed.');
}
fs.mkdirSync('bench/x45/receipts', { recursive: true });
fs.writeFileSync('bench/x45/receipts/redteam.txt', receipt.join('\n') + '\n');
