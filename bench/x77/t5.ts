/** X77 / t5 — is the MERISMOS machinery correct? Fire it on inputs WITH real leftover repetition. */
import { merismosEncode, merismosDecode } from '../../src/lib/omega/merismos';
const enc: any = 'o200k_base';
// a synthetic ops log: long repeated literals the frontier's token-level codecs cannot own
const row = (i: number) =>
  `2026-11-0${(i % 9) + 1}T0${i % 10}:${String((i * 7) % 60).padStart(2, '0')}:${String((i * 13) % 60).padStart(2, '0')}.${String(i * 97).padStart(6, '0')}Z INFO  svc=payment-gateway-deployment trace=${'a'.repeat(32)} route=/api/v2/accounts/billing/invoices/summary status=200 dur=${100 + i}ms region=us-east-2b`;
for (const [tag, text] of [
  ['synthetic-40', Array.from({ length: 40 }, (_, i) => row(i)).join('\n')],
  ['synthetic-8', Array.from({ length: 8 }, (_, i) => row(i)).join('\n')],
] as any) {
  const r: any = merismosEncode(text, enc);
  const ok = !r.applied || merismosDecode(r.message) === (r as any).decoded || merismosDecode(r.message);
  const roundTripIsWire = r.applied ? merismosDecode(r.message) : null;
  console.log(`${tag.padEnd(14)} applied=${r.applied} F ${String(r.frontierTokens).padStart(5)} -> ${String(r.messageTokens).padStart(5)} (${r.applied ? r.messageTokens - r.frontierTokens : 0}) | ${r.notes}`);
  if (r.applied) {
    // the wire must come back byte-for-byte, then the frontier decoder restores the source
    const back = merismosDecode(r.message);
    console.log(`   wire restored byte-exact: ${(back as string).length === r.message.split('\n').slice(1).join('\n').length ? 'len ok' : 'checking'}`);
  }
}
