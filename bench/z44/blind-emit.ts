// Z44: build a BLIND one-chat decode fixture.
//   visible/msg_N.txt  — exactly what the user would paste into the chat
//   hidden/exp_N.txt   — the expected decode (never shown to the decoder)
import fs from 'node:fs';
import { createSession, anamnesisEncodeMessage, anamnesisMessagePrompt } from '@/lib/omega/anamnesis';

const dir = 'bench/z44/blind';
fs.mkdirSync(dir + '/visible', { recursive: true });
fs.mkdirSync(dir + '/hidden', { recursive: true });

// Two consecutive pastes from a real operator's chat: successive tails of the
// repo's own OpenStack LogHub sample. Small enough to decode by hand.
const pick = process.env.SRC ?? 'bench/holdout-ops/openstack-loghub-26.log';
const per = Number(process.env.PER ?? 9);
const src = fs.readFileSync(pick, 'utf8').split('\n');
const n = Number(process.env.N ?? 2);
const msgs: string[] = [];
for (let i = 0; i < n; i++) { const c = src.slice(i * per, (i + 1) * per).join('\n'); if (c.trim()) msgs.push(c); }

const session = createSession('o200k_base');
for (let i = 0; i < msgs.length; i++) {
  const m = anamnesisEncodeMessage(msgs[i], session, {});
  fs.writeFileSync(`${dir}/visible/msg_${i + 1}.txt`, anamnesisMessagePrompt(m));
  fs.writeFileSync(`${dir}/hidden/exp_${i + 1}.txt`, msgs[i]);
  console.log(`msg_${i + 1}: raw=${m.rawTokens} sent=${m.messageTokens} mode=${m.mode} new=${m.newRules} recollected=${m.reusedRules} copies=${m.copies}`);
  console.log('--- what the user pastes ---');
  console.log(anamnesisMessagePrompt(m));
  console.log('--- end ---');
}
