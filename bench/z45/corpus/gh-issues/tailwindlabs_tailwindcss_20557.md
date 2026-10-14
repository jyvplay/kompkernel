# `canonicalizeCandidates` with `collapse: true`: time doubles with each linked class

**@rikbrown** opened on 2026-10-11T18:12:51Z

**What version of Tailwind CSS are you using?**

v4.3.3. v4.3.2 gives the same result. `collapseCandidates` and `combinations` on `main` (de2255b) are the same as in v4.3.3.

**What build tool (or framework if it abstracts the build tool) are you using?**

None. A Node.js script calls `canonicalizeCandidates` on a design system from `__unstable__loadDesignSystem` in `@tailwindcss/node` 4.3.3. Lint rules call it in the same way, for example `enforce-canonical-classes` in eslint-plugin-better-tailwindcss, which sets `collapse: true` by default.

**What version of Node.js are you using?**

v24.15.0

**What browser are you using?**

N/A

**What operating system are you using?**

macOS

**Reproduction URL**

https://gist.github.com/rikbrown/df3ba07ea35ee5d0dda99cd8528cf469

**Describe your issue**

`canonicalizeCandidates(candidates, { collapse: true })` takes time that doubles with each class in a group of linked classes. With `collapse: false`, the same lists take 1 ms or less.

`collapseGroup` links two classes when they have a possible replacement in common. For each property of a class, the lookup adds every static utility that sets the property, at any value. So a static utility that sets many properties links all classes that set one of them:

- In the default theme, `sr-only` and `not-sr-only` set `position`, `width`, `height`, `padding`, `margin`, `overflow` and `white-space`. For example, `relative` and `mt-1` are linked through them. Case A below uses only such classes.
- A project `@utility` that sets many properties, like a component class, does the same for its properties, also when the class string does not use it. Case B below adds one such utility.

`combinations()` then gives every subset of the group with 2 or more classes, 2^n − n − 1 subsets, and `collapseGroup` computes a signature for each one. In a local copy with a counter, case A computed 16,369 signatures for 14 classes (2^14 − 15).

Results: median of 3 runs in ms, Node.js 24.15.0, Apple M4 Max with other load on the machine. In each row, all classes are in one linked group.

| Case | Classes | v4.3.2 | v4.3.3 |
| --- | --: | --: | --: |
| A: default theme | 8 | 12 | 12 |
| | 10 | 35 | 36 |
| | 12 | 133 | 140 |
| | 13 | 275 | 273 |
| | 14 | 559 | 678 |
| B: default theme and one `@utility` | 10 | 33 | 35 |
| | 12 | 131 | 136 |
| | 14 | 641 | 616 |
| | 15 | 1,288 | 1,475 |
| | 16 | 3,787 | 2,623 |

Each class added to a group doubles the time. At that rate, a group of 20 classes takes about 16 times as long as a group of 16. With eslint-plugin-better-tailwindcss 4.9.0 and the `pill` utility, the case B string plus `text-gray-900 overflow-hidden` (18 classes) took 12.5 s to lint.

In a local copy, I changed the static lookup to add only utilities with the same value. Case B with 16 classes then took 14 ms instead of 2.8 s, but `text-sm leading-5` no longer collapsed to `text-sm/5`. So that change alone is not a fix.

Script (`npm i tailwindcss@4.3.3 @tailwindcss/node@4.3.3`, then `node bench.mjs`):

```js
import { __unstable__loadDesignSystem } from "@tailwindcss/node";

const defaultTheme = '@import "tailwindcss";';
const withComponentUtility = `${defaultTheme}
@utility pill {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  height: 2rem;
  padding: 0.25rem 0.75rem;
  margin: 0;
  border-radius: 9999px;
  font-size: 0.875rem;
  line-height: 1.25rem;
  font-weight: 500;
  color: white;
  background-color: black;
  white-space: nowrap;
  overflow: hidden;
  cursor: pointer;
}`;

const cases = [
  {
    // Each class sets a property that `sr-only` also sets.
    name: "A: default theme",
    css: defaultTheme,
    classes: "relative mt-1 mr-2 mb-3 ml-4 pt-1 pr-2 pb-3 pl-4 w-64 h-10 overflow-x-auto overflow-y-hidden whitespace-nowrap",
    counts: [8, 10, 12, 13, 14],
  },
  {
    // The class string does not use `pill`.
    name: "B: default theme + one @utility",
    css: withComponentUtility,
    classes: "absolute mb-3 flex h-10 w-fit cursor-pointer items-center gap-2.5 rounded-full bg-white pr-3.5 pl-2 text-sm font-semibold leading-5 whitespace-nowrap",
    counts: [10, 12, 14, 15, 16],
  },
];

// Warm up the JIT so that the first rows are comparable.
const warmUp = await __unstable__loadDesignSystem(defaultTheme, { base: import.meta.dirname });
warmUp.canonicalizeCandidates(cases[0].classes.split(" ").slice(0, 10), { collapse: true });

for (const { name, css, classes, counts } of cases) {
  console.log(name);
  for (const count of counts) {
    const input = classes.split(" ").slice(0, count);
    const times = {};
    for (const collapse of [false, true]) {
      const designSystem = await __unstable__loadDesignSystem(css, { base: import.meta.dirname });
      designSystem.canonicalizeCandidates(["mt-1", "mb-1"], { collapse }); // build the design system caches first
      const start = performance.now();
      designSystem.canonicalizeCandidates(input, { collapse });
      times[collapse] = Math.round(performance.now() - start);
    }
    console.log(`  ${count} classes: collapse false ${times.false} ms, collapse true ${times.true} ms`);
  }
}
```



---
**@rubas** commented on 2026-10-12T11:57:15Z

daisyUI triggers case B without any `@utility` in the project. Its component classes set many properties, so most classes of a long list end up in one group. The standalone CLI is affected in the same way.

Setup: an empty directory with `npm i tailwindcss@4.3.3 @tailwindcss/node@4.3.3 daisyui@5.7.47`, Node.js 26.10.0, Linux x64, and two CSS files. `tw.css` holds only `@import "tailwindcss";`. `daisy.css`:

```css
@import "tailwindcss";
@plugin "daisyui" {
  logs: false;
}
```

`canonicalizeCandidates(classes, { collapse: true })` on a design system from `__unstable__loadDesignSystem`, after one warm-up call, one run each:

| Classes | `tw.css` | `daisy.css` |
| --- | --: | --: |
| A, first 12 | | 129 ms |
| A, first 14 | | 517 ms |
| A, first 16 | | 1,050 ms |
| A, first 18 | | 4,905 ms |
| A, all 20 | 34 ms | 10,783 ms |
| B, 25 | 50 ms | out of memory after 40 s, default heap |

With `collapse: false`, list A takes 803 ms with `daisy.css`.

The standalone CLI 4.3.3 gets one list on stdin, `tailwindcss canonicalize --stream --css=daisy.css`. It needs 18.9 s for list A, and I stopped it after 180 s for list B. With `tw.css` it needs 1.4 s for each list, which is its start time.

A: `fixed top-1/2 right-0 z-60 inline-flex cursor-pointer flex-col items-center gap-1.5 rounded-l-xl bg-blue-600 py-3 pr-2 pl-2.5 text-white shadow-md transition-[transform,opacity,background-color] duration-200 ease-out hover:bg-blue-700`

B: `fixed inset-y-0 right-0 z-50 my-auto flex h-fit max-h-[calc(100svh-2rem)] w-80 max-w-[calc(100vw-2rem)] flex-col gap-5 overflow-y-auto rounded-l-xl border border-r-0 border-zinc-200 bg-white p-5 shadow-2xl transition-[transform,opacity] duration-200 ease-out dark:border-white/10 dark:bg-zinc-900`

Phoenix projects reach this through `mix format`. The formatter plugin canonical_tailwind passes the project CSS to `tailwindcss canonicalize` since its 0.3.3, the Phoenix generator ships daisyUI, and the plugin gives up after 30 s.

