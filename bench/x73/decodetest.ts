/**
 * X73 — the standing requirement: is a shipped message decodable by a reader that
 * has NOTHING but the message?
 *
 * The stack's decoders are programs; the access model says the reader is a model
 * with one chat turn. So the test that matters is: print the message, print
 * nothing else, and try. This dumps the message and the source side by side so the
 * attempt is auditable rather than asserted. It does not cut corners: it uses a
 * SMALL input so the experiment is within human/LLM working memory, which is the
 * most favourable case the codec will ever get.
 */
import { countTokens } from '../../src/lib/omega/bpe';
import { tagstackEncode } from '../../src/lib/omega/tagstack';
const enc: any = 'o200k_base';
const src = process.env.SRC ?? `Filesystem     Type  Size  Used Avail Use% Mounted on
/dev/vda1      ext4   79G   31G   45G  41% /
tmpfs          tmpfs 3.9G     0  3.9G   0% /dev/shm
/dev/vda15     vfat  105M  5.4M  100M   5% /boot/efi
`;
const r: any = tagstackEncode(src, enc);
console.log('=== SOURCE ===');
console.log(src);
console.log('=== MESSAGE (tokens=' + r.messageTokens + ', parent=' + r.parentCodec + ') ===');
console.log(r.message);
console.log('=== END MESSAGE ===');
console.log('source tokens', countTokens(src, enc), 'decoded identical:', r.decoded === src);
