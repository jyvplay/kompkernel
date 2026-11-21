import ChessProof.All63.Trust

namespace Chess.All63

axiom u0000_10679a4b55d6e585 : (G63 0).Unsat
axiom u0001_111f7e9cf1617a81 : (G63 1).Unsat
axiom u0002_54f5060a10c3dcd2 : (G63 2).Unsat
axiom u0003_581a9b23b433b7a1 : (G63 3).Unsat
axiom u0004_c84aeda22d6ac3f2 : (G63 4).Unsat
axiom u0005_628b3d6804e1e67d : (G63 5).Unsat
axiom u0006_83f59d202307441e : (G63 6).Unsat
axiom u0007_1b5c07203f817752 : (G63 7).Unsat
axiom u0008_e9083ded725400f1 : (G63 8).Unsat
axiom u0009_4b4826bef5f446ad : (G63 9).Unsat
axiom u0010_e450996d62c7ae77 : (G63 10).Unsat
axiom u0011_b0ee199ec8affd2e : (G63 11).Unsat
axiom u0012_675f4d5f5d1129f1 : (G63 12).Unsat
axiom u0013_74b5b4eb8863630f : (G63 13).Unsat
-- ... excerpt; omitted middle, not replayed ...
                            Eq.subst (motive := fun j => (G63 j).Unsat) (Nat.le_antisymm (Nat.not_lt.mp h11) (Nat.le_of_lt_succ h12)) u7218_093976f7e27df2a2
                          else
                            Eq.subst (motive := fun j => (G63 j).Unsat) (Nat.le_antisymm (Nat.not_lt.mp h12) (Nat.le_of_lt_succ h10)) u7219_7cfed5c29b292a38
                      else
                        if h11 : i < 7222 then
                          if h12 : i < 7221 then
                            Eq.subst (motive := fun j => (G63 j).Unsat) (Nat.le_antisymm (Nat.not_lt.mp h10) (Nat.le_of_lt_succ h12)) u7220_b18177eec20b8d39
                          else
                            Eq.subst (motive := fun j => (G63 j).Unsat) (Nat.le_antisymm (Nat.not_lt.mp h12) (Nat.le_of_lt_succ h11)) u7221_3e9d8beaa3643424
                        else
                          if h12 : i < 7223 then
                            Eq.subst (motive := fun j => (G63 j).Unsat) (Nat.le_antisymm (Nat.not_lt.mp h11) (Nat.le_of_lt_succ h12)) u7222_763d4225d991499c
                          else
                            Eq.subst (motive := fun j => (G63 j).Unsat) (Nat.le_antisymm (Nat.not_lt.mp h12) (Nat.le_of_lt_succ h)) u7223_2790a1626931de66

theorem routeB_facts : UnsatFacts := ⟨unsat63⟩

end Chess.All63
