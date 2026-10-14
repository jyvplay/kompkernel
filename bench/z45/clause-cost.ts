import { countTokens } from '../../src/lib/omega/bpe';
const cands = ['⁂','†','‡','¤','∴','⊢','¬','⟐','⌁','⧉','❖','◈','⊗','⊕','¦','¶','§','⇔','↯','⟡','⚑','☛','⧫','※','‖'];
for (const c of cands) console.log(c, countTokens(c, 'o200k_base'), countTokens(c, 'cl100k_base'), countTokens(c + 'Spaces', 'o200k_base'), countTokens('\n' + c, 'o200k_base'));
const clauses = [
  'Spaces were removed after . ! ? before a capital letter; put them back when printing.',
  'Spaces were removed after . ! ? before a capital letter and after , before a lowercase letter; put them back when printing.',
  'Spaces were removed after . ! ? before a capital letter, after , before a lowercase letter, and before ( after a letter or digit; put them back when printing.',
  'Spaces were removed after . ! ? before a capital letter, after , before a lowercase letter, before ( after a letter or digit, and before " after , . ; :; put them back when printing.',
  'Restore the missing space after each . ! ? that touches a capital letter and after each , that touches a lowercase letter.',
  'Insert a space after every . ! ? followed by a capital letter and after every , followed by a lowercase letter.',
  'Outside ``` blocks, insert a space after every . ! ? followed by a capital letter and after every , followed by a lowercase letter.',
  'Add a space: after . ! ? before a capital letter; after , before a lowercase letter.',
  'Add a space: after .!? before a capital; after , before a lowercase letter; before ( after a letter or digit.',
  'Missing spaces: after .!? before a capital; after , before a lowercase letter; before ( after a letter or digit. Restore them.',
];
for (const c of clauses) console.log(countTokens(c, 'o200k_base'), countTokens(c, 'cl100k_base'), c);
