# escalade [![CI](https://github.com/lukeed/escalade/workflows/CI/badge.svg)](https://github.com/lukeed/escalade/actions) [![licenses](https://licenses.dev/b/npm/escalade)](https://licenses.dev/npm/escalade) [![codecov](https://badgen.now.sh/codecov/c/github/lukeed/escalade)](https://codecov.io/gh/lukeed/escalade)

> A tiny (183B to 210B) and [fast](#benchmarks) utility to ascend parent directories

With [escalade](https://en.wikipedia.org/wiki/Escalade), you can scale parent directories until you've found what you're looking for.<br>Given an input file or directory, `escalade` will continue executing your callback function until either:

1) the callback returns a truthy value
2) `escalade` has reached the system root directory (eg, `/`)

> **Important:**<br>Please note that `escalade` only deals with direct ancestry – it will not dive into parents' sibling directories.

---

**Notice:** As of v3.1.0, `escalade` now includes [Deno support](http://deno.land/x/escalade)! Please see [Deno Usage](#deno) below.

---

## Install

```
$ npm install --save escalade
```


## Modes

There are two "versions" of `escalade` available:

#### "async"
> **Node.js:** >= 8.x<br>
> **Size (gzip):** 210 bytes<br>
> **Availability:** [CommonJS](https://unpkg.com/escalade/dist/index.js), [ES Module](https://unpkg.com/escalade/dist/index.mjs)

This is the primary/default mode. It makes use of `async`/`await` and [`util.promisify`](https://nodejs.org/api/util.html#util_util_promisify_original).

#### "sync"
> **Node.js:** >= 6.x<br>
> **Size (gzip):** 183 bytes<br>
> **Availability:** [CommonJS](https://unpkg.com/escalade/sync/index.js), [ES Module](https://unpkg.com/escalade/sync/index.mjs)

This is the opt-in mode, ideal for scenarios where `async` usage cannot be supported.


## Usage

***Example Structure***

```
/Users/lukeed
  └── oss
    ├── license
    └── escalade
      ├── package.json
      └── test
        └── fixtures
          ├── index.js
          └── foobar
            └── demo.js
```

***Example Usage***

```js
//~> demo.js
import { join } from 'path';
import escalade from 'escalade';

const input = join(__dirname, 'demo.js');
// or: const input = __dirname;

const pkg = await escalade(input, (dir, names) => {
  console.log('~> dir:', dir);
  console.log('~> names:', names);
  console.log('---');

  if (names.includes('package.json')) {
    // will be resolved into absolute
    return 'package.json';
  }
});
