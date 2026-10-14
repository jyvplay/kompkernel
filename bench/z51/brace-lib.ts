// DENDRON candidate (probe): path list -> nested bash-style brace groups, order-preserving, exact inverse by bash rules.
export function braceTree(ps: string[]): string[] {
  const rec = (xs: string[]): string[] => {
    const out: string[] = [];
    let i = 0;
    while (i < xs.length) {
      const k = xs[i].indexOf('/');
      if (k < 0) { out.push(xs[i]); i++; continue; }
      const head = xs[i].slice(0, k + 1);
      let j = i;
      while (j < xs.length && xs[j].startsWith(head)) j++;
      if (j - i < 2) { out.push(xs[i]); i++; continue; }
      const rest = xs.slice(i, j).map(p => p.slice(head.length));
      out.push(head + '{' + rec(rest).join(',') + '}');
      i = j;
    }
    return out;
  };
  return rec(ps);
}
