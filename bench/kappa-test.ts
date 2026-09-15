/** KAPPA standalone bench: all fixtures + chaos samples + fresh CHAOS_F. */
import { kappaEncode, kappaDecode } from '@/lib/omega/kappa';
import { countTokens } from '@/lib/omega/bpe';
import { signetEncode } from '@/lib/omega/signet';
import { mosaicEncode } from '@/lib/omega/mosaic';
import { meridianEncode } from '@/lib/omega/meridian';
import { tesseraEncode } from '@/lib/omega/tessera';
import { rosettaEncode } from '@/lib/omega/rosetta';
import { CHAOS_900, CHAOS_F_LLM_REPORT, mosaicFixtures, MOSAIC_HANDTRACE_300 } from './fixtures';

const CHAOS_B = [
  'Summary: the ingestion pipeline dropped 3 events during the failover window.',
  '- consumer lag 2.4k messages, resolved in 90s',
  '- dead-letter queue gained 12 entries (poison payloads)',
  'service,env,replicas,cpu_pct',
  'ingest,prod,6,71',
  'query,prod,4,88',
  'auth,staging,2,34',
  '{"event":"restart","count":2,"ok":true,"tags":["oom","deploy"],"pid":4127}',
  'func health(nodes []string) error {',
  '    for _, n := range nodes {',
  '        if !ping(n, 2*time.Second) { return fmt.Errorf("node %s down", n) }',
  '    }',
  '    return nil',
  '}',
  '注意：搜索索引重建完成，但分片再平衡仍在进行，预计三十分钟后结束。',
  'audit: 2026-09-15T06:14:52Z INFO shard 7 rebalanced (moved 12GB)',
  'gh pr view 8412 --json title,author --jq ".title" | tee /tmp/pr.txt',
  'Actions: pause the indexer, drain shard 7, then verify counts.',
].join('\n');


async function row(name: string, text: string) {
  const inT = countTokens(text, 'o200k_base');
  const k = kappaEncode(text, 'o200k_base');
  const rt = kappaDecode(k.wire) === text;
  const rivals = {
    signet: signetEncode(text, 'o200k_base').outTokens,
    mosaic: mosaicEncode(text, 'o200k_base').outTokens,
    meridian: meridianEncode(text, 'o200k_base').outTokens,
    tessera: tesseraEncode(text, 'o200k_base').outTokens,
    rosetta: (await rosettaEncode(text, 'o200k_base')).outTokens,
  };
  const bestRival = Math.min(inT, ...Object.values(rivals));
  const win = k.exact && rt && k.outTokens < bestRival ? ' κ-WIN ✦' : '';
  console.log(
    `${name.padEnd(14)} in=${String(inT).padStart(5)} κ=${String(k.outTokens).padStart(4)}` +
    ` (${k.macros}m rt=${rt}) | sg=${rivals.signet} mo=${rivals.mosaic} me=${rivals.meridian}` +
    ` te=${rivals.tessera} ro=${rivals.rosetta} best=${bestRival}${win}`,
  );
}

async function main() {
  console.log('CHAOS_F length =', CHAOS_F_LLM_REPORT.length, CHAOS_F_LLM_REPORT.length === 900 ? '(exactly 900 ✓)' : '— ADJUST');
  const f = mosaicFixtures();
  await row('chaos-900', CHAOS_900);
  await row('chaos-B', CHAOS_B);
  await row('chaos-F (LLM)', CHAOS_F_LLM_REPORT);
  await row('handtrace-300', MOSAIC_HANDTRACE_300);
  await row('json-log-40', f.jsonLog);
  await row('csv-60', f.csv);
  await row('chat-48', f.chat);
  await row('grid-30', f.grid);
  await row('rle-1400', f.rle);
  await row('idrun-200', f.idrun);
  await row('prose', f.prose);
  await row('agent-turn', f.prose + '\n' + f.jsonLog + '\n' + f.rle + '\n' + f.chat);

  // κ wire inspection on CHAOS_F
  const k = kappaEncode(CHAOS_F_LLM_REPORT, 'o200k_base');
  console.log('\n--- CHAOS_F κ wire (κ=' + k.outTokens + '/' + k.inTokens + ') ---');
  console.log(k.wire);
}
main().catch((e) => { console.error(e); process.exit(1); });
