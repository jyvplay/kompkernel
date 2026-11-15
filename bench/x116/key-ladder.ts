import { countTokens } from '../../src/lib/omega/bpe';
const enc = 'o200k_base' as const;
const keys = [
  'λ=bytes after ->.',
  'λ=UTF8 bytes after ->.',
  'λ=byte length after ->.',
  'λ=len(target).',
  'λ=bytes(target).',
  'λ is bytes after ->.',
  'λ is the byte length after ->.',
  'λ=size of target after ->.',
  'λ=bytes after arrow.',
  'λ=bytes after " -> ".',
  'Body first. λ=bytes after ->.',
  'λ=bytes after ->. Body first.',
  'Replace λ with byte count after ->.',
  'λ→byte count after ->.',
  'λ→bytes after ->.',
  'λ=bytes(target after ->).',
  'λ=strlen(target).',
  'λ=octets after ->.',
  'λ=octets(target).',
  'λ=len(after ->).',
];
for (const k of keys) console.log(countTokens(k, enc), k);
