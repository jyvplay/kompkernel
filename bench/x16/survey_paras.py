# X16 survey: near-duplicate paragraph pairs inside single real files.
# Paragraph = blank-line-separated block with >= 25 words. Similarity = Jaccard of word 3-grams.
# Reports, per file: number of paragraphs, number of (later, earlier) pairs with similarity >= 0.5.
import sys, re, os, json
def shingles(words, n=3):
    return {tuple(words[i:i+n]) for i in range(len(words)-n+1)}
res = []
for path in sys.argv[1:]:
    try:
        text = open(path, encoding='utf8', errors='strict').read()
    except Exception:
        continue
    paras = [p for p in re.split(r'\n\s*\n', text) if len(p.split()) >= 25]
    if len(paras) < 2:
        continue
    sh = [shingles(p.split()) for p in paras]
    pairs = []
    for j in range(len(paras)):
        best = (0.0, -1)
        for i in range(j):
            a, b = sh[i], sh[j]
            if not a or not b: continue
            s = len(a & b) / len(a | b)
            if s > best[0]: best = (s, i)
        if best[0] >= 0.5:
            pairs.append({'later': j, 'earlier': best[1], 'jaccard': round(best[0], 3), 'words_later': len(paras[j].split())})
    if pairs:
        res.append({'file': path, 'paras': len(paras), 'pairs': len(pairs), 'words_in_pairs': sum(p['words_later'] for p in pairs), 'bytes': len(text), 'max_j': max(p['jaccard'] for p in pairs)})
res.sort(key=lambda r: -r['words_in_pairs'])
for r in res[:40]:
    print(json.dumps(r))
print('files_with_pairs', len(res))
