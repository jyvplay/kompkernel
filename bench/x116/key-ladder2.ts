import { countTokens } from '../../src/lib/omega/bpe';
const enc = 'o200k_base' as const;
const keys = [
  'λ=UTF8 bytes after ->.',
  'λ=len(target).',
  'λ=bytes(target).',
  'λ=strlen(target).',
  'λ=len(after ->).',
  'λ=bytes after ->.',
  'λ=byte count after ->.',
  'λ=#bytes after ->.',
  'λ=bytes in target.',
  'λ=target byte length.',
  'λ=byte length of target.',
  'λ=len(target) bytes.',
  'λ=bytes after ->.count',
  'λ=UTF8 byte count after ->.',
  'λ=octets after ->.',
  'λ=bytes(target after ->).',
  'λ=size(target) bytes.',
  'λ=bytelen(target).',
  'λ=bytes after arrow.',
  'λ=byte count of target.',
];
for (const k of keys) console.log(countTokens(k, enc), k);
