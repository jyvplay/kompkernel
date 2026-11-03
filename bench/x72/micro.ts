import { fastCount, libraryChunkCount, fastReady } from '../../src/lib/omega/bpe-fast';
fastReady();
const chunks = [' the', 'Function', ' import', '(', 'a)', '  ', '\n', '├──', '│', '0x7f', 'kubectl', ' ready', '1/1', 'Running', '2026-11-02', 'psql', '│ id', '1234', ' --', 'the ', 'value:', 'and', 'of', 'a', 'if', 'not', 'in'];
for (const pass of [0, 1]) {
  let t = Date.now(), acc = 0;
  for (let i = 0; i < 300000; i++) acc += libraryChunkCount(chunks[i % chunks.length]);
  const lib = Date.now() - t;
  t = Date.now();
  for (let i = 0; i < 300000; i++) acc += fastCount(chunks[i % chunks.length])!;
  const fast = Date.now() - t;
  if (pass) console.log(`library ${lib}ms  fast ${fast}ms  ratio ${(lib / fast).toFixed(2)}x  (acc ${acc})`);
}
