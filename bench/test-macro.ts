import { astraeaEncode, astraeaDecode } from '../src/lib/omega/astraea';
import { countTokens } from '../src/lib/omega/bpe';

const CODEBASE_BLOCK = `export interface ClusterMetrics {
  nodeId: string;
  region: string;
  status: 'HEALTHY' | 'DEGRADED' | 'FAILED';
  latencyMs: number;
  activePods: number;
  errorCount: number;
  creationTimestamp: string;
}

export function evaluateClusterHealth(clusterCtx: Record<string, ClusterMetrics>, thresholdMs = 800): number {
  const degradedNodes: Array<[string, number]> = [];
  for (const [node, metrics] of Object.entries(clusterCtx)) {
    if (metrics.latencyMs > thresholdMs || metrics.status !== 'HEALTHY') {
      degradedNodes.push([node, metrics.latencyMs]);
    }
  }
  if (degradedNodes.length > 0) {
    throw new Error(\`Cluster degraded: \${JSON.stringify(degradedNodes)}\`);
  }
  return Object.values(clusterCtx).reduce((sum, m) => sum + m.activePods, 0);
}\n`;

function generateCorpus(targetChars: number): string {
  let out = '';
  while (out.length < targetChars) {
    out += CODEBASE_BLOCK;
  }
  return out.slice(0, targetChars);
}

async function testMacroDensity() {
  console.log(`=== MACRO BLOCK DENSITY UPGRADE AUDIT ===\n`);

  const sizes = [5_000_000, 10_000_000];

  for (const size of sizes) {
    const input = generateCorpus(size);
    const inTok = countTokens(input, 'o200k_base');
    const r = await astraeaEncode(input, 'o200k_base');
    const decoded = astraeaDecode(r.wire, 'o200k_base');
    const exact = decoded === input;

    const wireChars = r.wire.length;
    const wireTok = r.outTokens;
    const charRed = ((1 - wireChars / size) * 100).toFixed(2);
    const tokRed = r.savingsPct.toFixed(2);

    console.log(`Input: ${size.toLocaleString()} chars | ${inTok.toLocaleString()} BPE tokens`);
    console.log(`  Wire Output: ${wireChars.toLocaleString()} chars | ${wireTok.toLocaleString()} BPE tokens`);
    console.log(`  Reduction:   ${charRed}% char reduction | ${tokRed}% BPE token reduction`);
    if (size === 5_000_000) {
      console.log(`  Beats 48,314 limit (fits 65k wire)?  ${wireChars < 48_314 ? `YES (${wireChars.toLocaleString()} < 48,314) ✓` : `NO (${wireChars.toLocaleString()}) ✗`}`);
    }
    if (size === 10_000_000) {
      console.log(`  Beats 91,194 limit (fits 120k wire)? ${wireChars < 91_194 ? `YES (${wireChars.toLocaleString()} < 91,194) ✓` : `NO (${wireChars.toLocaleString()}) ✗`}`);
    }
    console.log(`  Exact Reconstruction:                 ${exact ? 'VERIFIED ✓' : 'FAILED ✗'}\n`);
  }
}

testMacroDensity();
