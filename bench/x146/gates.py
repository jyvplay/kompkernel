"""Acceptance assertions, including the invalid modal inference."""
import json,pathlib
# Actual status: a program inverse does not establish a behavioral result.
claim={'programInverse':True,'nativeEvidence':None,'speedEvidence':None}
assert not (claim['programInverse'] and claim['nativeEvidence'] is not None)
# Constructive counting obstruction: 95^n printable-ASCII strings cannot inject into fewer
# than sum(V^i, i=0..k) token sequences. This is not a corpus lower bound.
V=1000000;n=100;k=10;assert 95**n>sum(V**i for i in range(k+1))
r={'modalShortcutRejected':True,'native':'NOT_RUN','countingWitness':{'byteLength':n,'maximumTokens':k,'vocabularyBound':V,'sourceAlphabet':'95 printable ASCII characters','sources':str(95**n),'availableTokenSequences':str(sum(V**i for i in range(k+1))),'injectiveUniversalCompressionImpossibleForThisBound':True},'note':'Does not preclude any measured lane improvement or solve native reliability.'}
pathlib.Path('bench/x146/receipts/gates.json').write_text(json.dumps(r,indent=2)+'\n')
