import fs from 'node:fs';
import { codecEntries } from '@/lib/omega/registry';
import { countTokens } from '@/lib/omega/bpe';

const CATEGORIES: Record<string, string> = {
  'dump.sql': 'markup-sql',
  'find-listing.txt': 'ops-listing', 'git-log-fuller.txt': 'ops-listing', 'git-log-iso.txt': 'ops-listing',
  'git-numstat.txt': 'ops-listing', 'ls-full-iso.txt': 'ops-listing', 'node-stacktraces.txt': 'ops-listing',
  'ops-git-log-stat.txt': 'ops-listing', 'ops-ls-l-bin.txt': 'ops-listing', 'ops-ls-l-omega.txt': 'ops-listing',
  'openstack-loghub-26.log': 'ops-log',
  'chart.svg': 'ops-table', 'df-h.txt': 'ops-table', 'kubectl-get-pods.txt': 'ops-table', 'psql-output.txt': 'ops-table',
  'bibliography.txt': 'prose', 'de-kb.txt': 'prose', 'email-thread.txt': 'prose', 'kb-article.txt': 'prose',
  'llm-answer.md': 'prose', 'meeting-transcript.txt': 'prose', 'readme.txt': 'prose',
  'spring-projects_spring-framework_35118.md': 'source-changelog-trace', 'svenstaro_miniserve.md': 'source-changelog-trace',
  'aapl-2014.csv': 'temporal-table', 'csv-8.csv': 'temporal-table', 'sp500-200.csv': 'temporal-table', 'vix-daily-1990.csv': 'temporal-table',
};

const files = process.argv.slice(2);
const entries = codecEntries();
for (const f of files) {
  const name = f.split('/').pop()!;
  const t = fs.readFileSync(f, 'utf8');
  const base = countTokens(t, 'o200k_base');
  const scores: Record<string, number> = {};
  const bad: string[] = [];
  for (const e of entries) {
    try {
      const r: any = await e.run(t, 'o200k_base' as any);
      if (typeof r.oneChat === 'number') {
        if (r.decoded === t) scores[e.key] = r.oneChat;
        else bad.push(e.key);
      }
    } catch { /* codec threw: inadmissible */ }
  }
  console.log(JSON.stringify({ file: name, category: CATEGORIES[name] ?? '?', base, scores, inexact: bad }));
}
