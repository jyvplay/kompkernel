import { buildSessions } from './sessions';
import { createSession, anamnesisEncodeMessage, anamnesisDecodeWith, expandCopies } from '@/lib/omega/anamnesis';
import { chironDecode } from '@/lib/omega/chiron';
const s = buildSessions().find(x => x.name === 'ops-log-tails')!;
const sess = createSession('o200k_base');
anamnesisEncodeMessage(s.messages[0], sess, {});
const m1 = anamnesisEncodeMessage(s.messages[1], sess, {});
console.log('m1 mode', m1.mode, m1.notes);
// manual: take the wire that WAS produced before the gate rejected it
// rebuild by hand
const C = s.messages.slice(0,1).join('\n');
console.log('wire head:', JSON.stringify(m1.wire.slice(0,120)));
const d = anamnesisDecodeWith(m1.wire, sess.rules, C);
console.log('decode null?', d === null);
