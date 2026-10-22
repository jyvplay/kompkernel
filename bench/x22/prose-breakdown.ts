import fs from 'node:fs';
import { countTokens } from '@/lib/omega/bpe';
import { daedalusEncode } from '@/lib/omega/daedalus';
import { lakonikosEncode } from '@/lib/omega/lakonikos';
const files = ['bench/holdout-work/kb-article.txt','bench/holdout-work/llm-answer.md','bench/holdout-lang/de-kb.txt','bench/holdout-work/email-thread.txt','bench/holdout/readme.txt','bench/holdout-work/meeting-transcript.txt','bench/holdout-work/bibliography.txt'];
for (const f of files) {
  const t = fs.readFileSync(f, 'utf8');
  const d: any = daedalusEncode(t, 'o200k_base' as any);
  const l: any = lakonikosEncode(t, 'o200k_base' as any);
  const wire: string = d.wire;
  const si = wire.indexOf('§'), pi = wire.indexOf('¶');
  const tape = si >= 0 && pi > si ? wire.slice(si + 1, pi) : '';
  const body = pi >= 0 ? wire.slice(pi + 1) : wire;
  // count glyph chars in body (any char in a Chiron script range)
  const inScript = (ch: string) => { const o = ch.codePointAt(0)!;
    return (o>=0x0400&&o<0x0500)||(o>=0x0370&&o<0x0400)||(o>=0x0530&&o<0x0600)||(o>=0x0900&&o<0x0E00)||
           (o>=0x10A0&&o<0x1100)||(o>=0xAC00&&o<0xD7A4)||(o>=0x30A0&&o<0x3100)||(o>=0x0600&&o<0x0700)||
           (o>=0x1000&&o<0x10A0)||(o>=0x1780&&o<0x1800)||(o>=0x4E00&&o<0xA000); };
  let glyphs = 0; for (const ch of body) if (inScript(ch)) glyphs++;
  console.log(`${f.split('/').pop()!.padEnd(24)} raw=${String(d.inTokens).padStart(4)} wire=${String(d.outTokens).padStart(4)} daedM=${String(d.messageTokens).padStart(4)} lakM=${String(l.messageTokens).padStart(4)} contract=${String(d.messageTokens-d.outTokens).padStart(3)} tapeChars=${String(tape.length).padStart(4)} glyphsInBody=${String(glyphs).padStart(4)} bodyChars=${body.length}`);
}
