import fs from 'node:fs';
import { morpheEncode } from '@/lib/omega/morphe';
import { eidosEncode } from '@/lib/omega/eidos';
import { aionEncode } from '@/lib/omega/aion';
import { kionesEncode } from '@/lib/omega/kiones';
import { countTokens } from '@/lib/omega/bpe';
for (const f of process.argv.slice(2)) {
  const t = fs.readFileSync(f, 'utf8');
  const out: string[] = [];
  const probe = (n: string, r: any) => {
    if (!r) return out.push(`${n}=n/a`);
    const wireTok = countTokens(r.wire ?? '', 'o200k_base');
    const prompt: string = r.decoderPrompt ?? '';
    const contractPart = prompt.slice((r.wire ?? '').length);
    out.push(`${n}: M=${r.messageTokens} wire=${wireTok} contractTok=${r.contractTokens ?? '?'} contractChars=${contractPart.trim().length}`);
  };
  try { probe('morphe', morpheEncode(t, 'o200k_base' as any)); } catch (e) { out.push('morphe=ERR'); }
  try { probe('eidos', eidosEncode(t, 'o200k_base' as any)); } catch (e) { out.push('eidos=ERR'); }
  try { probe('aion', aionEncode(t, 'o200k_base' as any)); } catch (e) { out.push('aion=ERR'); }
  try { probe('kiones', kionesEncode(t, 'o200k_base' as any)); } catch (e) { out.push('kiones=ERR'); }
  console.log(`${f.split('/').pop()!.padEnd(24)} | ${out.join('  |  ')}`);
}
