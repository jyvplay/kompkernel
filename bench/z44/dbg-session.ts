// Z44 debug: why do session messages fall back to raw?
import { buildSessions } from './sessions';
import { anchoredCopies, expandCopies, anamnesisCore, createSession, anamnesisEncodeMessage } from '@/lib/omega/anamnesis';
import { countTokens } from '@/lib/omega/bpe';

const only = (process.env.ONLY ?? 'ops-log-tails').split(',')[0];
const s = buildSessions().find(x => x.name === only)!;
const sess = createSession('o200k_base');
for (let i = 0; i < s.messages.length; i++) {
  const T = s.messages[i];
  const C = s.messages.slice(0, i).join('\n');
  const raw = countTokens(T, 'o200k_base');
  if (i > 0) {
    const r = anchoredCopies(T, C, 'o200k_base', {});
    const back = expandCopies(r.wire, C);
    console.log(`m${i} raw=${raw} copies=${r.copies} saved=${r.saved} wireTok=${countTokens(r.wire, 'o200k_base')} roundtrip=${back === T}`);
  }
  const core = anamnesisCore(T, 'o200k_base');
  const m = anamnesisEncodeMessage(T, sess, {});
  console.log(`   core=${core.messageTokens}(${core.mode}, ${core.rules}r) ${core.notes.slice(0, 90)}`);
  console.log(`   sess msg=${m.messageTokens} mode=${m.mode} new=${m.newRules} reused=${m.reusedRules} copies=${m.copies} :: ${m.notes.slice(0, 110)}`);
  console.log(`   session.rules=${sess.rules.length} priorText=${sess.priorText.length}`);
}
