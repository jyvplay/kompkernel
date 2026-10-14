import { countTokens } from '@/lib/omega/bpe';
for (const c of ['⟦','⟧','«','»','‹','›','†','‡','⟨','⟩','【','】','⸢','⸣','¶','§','×','…','␟','␞','◆','◇','■','□','◤','◥','⁅','⁆','⸤','⸥']) {
  console.log(JSON.stringify(c), countTokens(c, 'o200k_base'), countTokens(c, 'cl100k_base'));
}
