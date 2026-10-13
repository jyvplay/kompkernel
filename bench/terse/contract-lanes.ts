// Exact contract size per lane: decoder prompt minus the wire, o200k tokens. Fast budget (wire ops only).
import fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
import { chironEncode, chironDecoderPrompt } from '../../src/lib/omega/chiron';
for (const f of process.argv.slice(2)) {
  const t = fs.readFileSync(f, 'utf8');
  const r = chironEncode(t, 'o200k_base', { workUnits: 4_000_000 });
  const w = r.wire as string;
  const prompt = chironDecoderPrompt(w);
  const contractText = prompt.slice(w.length + 1);
  console.log(JSON.stringify({ file: f.split('/').slice(-2).join('/'), wireTok: countTokens(w, 'o200k_base'), contractTok: countTokens(contractText, 'o200k_base'), contract: contractText.slice(0, 400) }));
}
