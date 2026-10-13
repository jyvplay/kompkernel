// Z44 session corpus builder.
// Every session is built from REAL files already in the repository or the npm registry corpus.
// No synthetic text is invented. Each entry records exactly how the session was constructed so
// the receipts can be audited.
import fs from 'node:fs';
import path from 'node:path';

export interface Session { name: string; how: string; messages: string[] }

function byLines(s: string, n: number): string[] {
  const L = s.split('\n');
  const per = Math.ceil(L.length / n);
  const out: string[] = [];
  for (let i = 0; i < n; i++) { const c = L.slice(i * per, (i + 1) * per).join('\n'); if (c.trim()) out.push(c); }
  return out;
}

/** Sessions that model how a real chat is actually used: the same kind of artifact, pasted again. */
export function buildSessions(): Session[] {
  const out: Session[] = [];
  const rd = (p: string) => fs.readFileSync(p, 'utf8');

  out.push({
    name: 'ops-log-tails',
    how: 'bench/holdout-ops/openstack-loghub-26.log split into 6 consecutive line ranges: an operator pasting successive log tails into one chat.',
    messages: byLines(rd('bench/holdout-ops/openstack-loghub-26.log'), 6),
  });
  out.push({
    name: 'vix-monthly',
    how: 'bench/holdout-tab/vix-daily-1990.csv split into 6 consecutive line ranges: an analyst pasting successive data pulls into one chat.',
    messages: byLines(rd('bench/holdout-tab/vix-daily-1990.csv'), 6),
  });
  out.push({
    name: 'pkglock-chunks',
    how: 'bench/holdout-ops/package-lock-head.json split into 6 consecutive line ranges: dependency data pasted in pieces.',
    messages: byLines(rd('bench/holdout-ops/package-lock-head.json'), 6),
  });
  out.push({
    name: 'agent-history',
    how: 'bench/holdout-mk/agent-history.md split into 5 consecutive line ranges: successive turns of one agent transcript.',
    messages: byLines(rd('bench/holdout-mk/agent-history.md'), 5),
  });
  out.push({
    name: 'kb-translations',
    how: 'The six real translations of the same KB article in bench/holdout-lang (de, es, ja, pl, ru, tr): a localisation workflow in one chat.',
    messages: ['de-kb', 'es-kb', 'ja-kb', 'pl-kb', 'ru-kb', 'tr-kb'].map(n => rd(`bench/holdout-lang/${n}.txt`)),
  });
  out.push({
    name: 'ops-mixed',
    how: 'Six different real ops artifacts pasted into one chat: find-listing, ls-full-iso, npm-ls, node-stacktraces, git-numstat (first third), df-h.',
    messages: [
      rd('bench/holdout-ops/find-listing.txt'),
      rd('bench/holdout-ops/ls-full-iso.txt'),
      rd('bench/holdout-ops/npm-ls.txt'),
      rd('bench/holdout-ops/node-stacktraces.txt'),
      byLines(rd('bench/holdout-ops/git-numstat.txt'), 3)[0],
      rd('bench/holdout-tbl/df-h.txt'),
    ],
  });
  out.push({
    name: 'prose-study',
    how: 'Six real prose/work documents pasted into one study chat: kb-article, llm-answer, email-thread, meeting-transcript, readme, bibliography.',
    messages: [
      rd('bench/holdout-work/kb-article.txt'),
      rd('bench/holdout-work/llm-answer.md'),
      rd('bench/holdout-work/email-thread.txt'),
      rd('bench/holdout-work/meeting-transcript.txt'),
      rd('bench/holdout/readme.txt'),
      rd('bench/holdout-work/bibliography.txt'),
    ],
  });
  out.push({
    name: 'repo-review',
    how: 'Six real sibling modules from src/lib/omega reviewed in one chat: veritas-r, veritas-k, veritas-m, veritas-n, veritas-p, veritas-q.',
    messages: ['r', 'k', 'm', 'n', 'p', 'q'].map(s => rd(`src/lib/omega/veritas-${s}.ts`)),
  });
  return out;
}
