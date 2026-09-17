import { cjkContractorEncode, cjkContractorDecode } from './src/lib/omega/cjk-contractor';

// Simulate a 10,000,000 character codebase / repo log
const repoSample = `
// FILE: src/core/engine.ts
import { StateManager, Dispatcher, Logger } from '../utils/kernel';

export class EngineCore implements StateManager {
  private logger: Logger;
  constructor(options: { debug: boolean }) {
    this.logger = new Logger('EngineCore', options.debug);
  }
  public async executeTask<T>(taskId: string, payload: Record<string, unknown>): Promise<T> {
    this.logger.info(\`Executing task \${taskId} with payload size: \${JSON.stringify(payload).length}\`);
    return await Dispatcher.dispatch(taskId, payload);
  }
}
`;

let text10M = repoSample;
while (text10M.length < 10000000) text10M += repoSample;
text10M = text10M.slice(0, 10000000);

console.log('--- 10,000,000 CHARACTER CODEBASE REPO BENCHMARK ---');
let t0 = performance.now();
const res = cjkContractorEncode(text10M, 'cl100k_base', {
  sentinel: '★T\n',
  modeName: 'TERMINUS-T1',
  maxCandidateTrials: 8,
  maxEntries: 12
});
const encMs = performance.now() - t0;

console.log(`Encoding Time: ${encMs.toFixed(2)} ms (${(encMs / 1000).toFixed(2)} seconds)`);
console.log(`Raw Input Tokens: ${res.inTokens}`);
console.log(`Wire Output Tokens: ${res.outTokens}`);
console.log(`Compression Savings: ${res.savingsPct.toFixed(2)}%`);

t0 = performance.now();
const dec = cjkContractorDecode(res.wire, { sentinel: '★T\n', modeName: 'TERMINUS-T1' });
const decMs = performance.now() - t0;

console.log(`Decoding Time: ${decMs.toFixed(2)} ms (${(decMs / 1000).toFixed(2)} seconds)`);
console.log(`Byte-Exact Lossless Match: ${dec === text10M}`);
