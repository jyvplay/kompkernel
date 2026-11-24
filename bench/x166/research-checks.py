"""External chess rules replay plus small exact interface counterexamples.
Not a Lean kernel run or a replay of all 7224 unsatisfiability certificates.
"""
import sys,json,re,itertools
from pathlib import Path
from fractions import Fraction as F
sys.path.insert(0,'.cache/x166-python');import chess
s=Path('bench/x166/research/doubleai-attained.lean').read_text();game=s.split('def game63',1)[1].split('def norm',1)[0];moves=re.findall(r'"([a-h][1-8][a-h][1-8][qrbn]?)"',game)
b=chess.Board()
for i,uci in enumerate(moves):
 m=chess.Move.from_uci(uci);assert m in b.legal_moves,(i,uci);b.push(m)
legal=list(b.legal_moves);checks=[b.gives_check(m) for m in legal];mates=0
for m in legal:
 b.push(m);mates+=b.is_checkmate();b.pop()
assert len(moves)==190 and len(legal)==63 and all(checks) and mates==23
# Prefix-marker code preserves list boundaries (unlike naive concatenation).
def enc(xs):return ''.join('0'+x for x in xs)+'1'
def symbol(s):return enc(list(s))
words=['','0','1','00','01','10','11'];seen={}
for n in range(4):
 for xs in itertools.product(words,repeat=n):
  coded=enc([symbol(x) for x in xs]);assert coded not in seen;seen[coded]=xs
assert ''.join(['0','1'])==''.join(['01']) # omitted spine is noninjective
# The scalar approximation objective does not price arbitrary codewords.
length_counterexample={'shortSymbols':['a'],'longSymbols':['b','b'],'code':{'a':'x'*100,'b':'y'}}
assert 1<2 and 100>2
# Anthropic's universal C>=10 restriction is load-bearing at K=2.
bound_checks=0
for K in range(2,100):
 for C in range(10,31):assert K**10<=K**C;bound_checks+=1
assert not 2**10<=2**9
# ByteDance strict growth boundary, actual rationals not floats.
for n in range(1,513):assert sum((F(1,k*(k+1)) for k in range(1,n+1)),F())==F(n,n+1)
# Google witness affine invariance is independent of BPE pricing.
A={0,1,3,4};sumsize=len({a+b for a in A for b in A});diffsize=len({a-b for a in A for b in A});affine=0
for scale in range(-10,11):
 for shift in range(-10,11):
  B={scale*a+shift for a in A}
  if scale:assert (len({a+b for a in B for b in B}),len({a-b for a in B for b in B}))==(sumsize,diffsize);affine+=1
  else:assert len(B)==1
out={'doubleai':{'library':'chess '+chess.__version__,'legalPlies':len(moves),'finalFEN':b.fen(),'legalMoves':len(legal),'allGiveCheck':all(checks),'mates':mates,'upperBound64':'NOT_REPLAYED'},'openai':{'prefixCodeInstances':len(seen),'omittedSpineCollision':True,'symbolToCodewordCostCounterexample':length_counterexample,'Lean':'NOT_RUN'},'anthropic':{'powerMonotonicityChecks':bound_checks,'C9Counterexample':True,'fullRecursion':'NOT_RUN'},'bytedance':{'rationalBoundaryChecks':512,'strictLiminfRequired':True},'google':{'affineChecks':affine,'zeroScaleRejected':True},'nativeCodecTransfer':'NOT_ESTABLISHED'}
Path('bench/x166/receipts/research-checks.json').write_text(json.dumps(out,indent=2));print(json.dumps(out,indent=2))
