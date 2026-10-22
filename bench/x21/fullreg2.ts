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

// Codecs that have ever looked competitive go first so a good bound exists early.
const PRIORITY = ['morphe','stigme','hemera','eidos','aion','lethe','oracle','nyx','echo','mnemosyne','glossia',
  'dens2','dendron','daedalus','daedalusD','akolouthia2','a10','lakonikos','lakonikosD','ariadne','sibyl','tachys',
  'kiones','plinthos','polytropos','logistike','akribeia','anastrophe','syntomia','chiron'];

const lane = process.argv[2];
const budgetMs = Number(process.argv[3] ?? 240000);
let entries = codecEntries();
const byKey = new Map(entries.map(e => [e.key, e]));
const ordered: typeof entries = [];
for (const k of PRIORITY) { const e = byKey.get(k); if (e) { ordered.push(e); byKey.delete(k); } }
ordered.push(...byKey.values());

const name = lane.split('/').pop()!;
const t = fs.readFileSync(lane, 'utf8');
const base = countTokens(t, 'o200k_base');
const t0 = Date.now();
const scores: Record<string, number> = {};
const slow: string[] = [];
const bad: string[] = [];
for (const e of ordered) {
  const c0 = Date.now();
  try {
    const r: any = await e.run(t, 'o200k_base' as any);
    if (typeof r.oneChat === 'number') {
      if (r.decoded === t) scores[e.key] = r.oneChat; else bad.push(e.key);
    }
  } catch { /* inadmissible */ }
  const dt = Date.now() - c0;
  if (dt > 3000) slow.push(`${e.key}:${dt}`);
  if (Date.now() - t0 > budgetMs) { console.error(`BUDGET-STOP ${name} after ${Object.keys(scores).length} codecs`); break; }
}
console.log(JSON.stringify({ file: name, category: CATEGORIES[name] ?? '?', base, scores, inexact: bad, slow, ms: Date.now() - t0 }));
