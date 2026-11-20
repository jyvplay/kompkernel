# gpt-tokenizer

[![NPM version](https://img.shields.io/npm/v/gpt-tokenizer?style=flat-square)](https://www.npmjs.com/package/gpt-tokenizer)
[![NPM downloads](https://img.shields.io/npm/dm/gpt-tokenizer?style=flat-square)](https://www.npmjs.com/package/gpt-tokenizer)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](https://opensource.org/licenses/MIT)
[![Build Status](https://img.shields.io/github/actions/workflow/status/niieani/gpt-tokenizer/ci-cd.yml?branch=main&style=flat-square)](https://github.com/niieani/gpt-tokenizer/actions)

`gpt-tokenizer` is a Token Byte Pair Encoder/Decoder supporting all OpenAI's models (including GPT-5, GPT-4o, o1, o3, o4, GPT-4.1 and older models like GPT-3.5, GPT-4).
It's the [_fastest, smallest and lowest footprint_](#benchmarks) GPT tokenizer available for all JavaScript environments and is written in TypeScript.

> Try it out in the **[playground](https://gpt-tokenizer.dev/)**!

This library has been trusted by:

- [CodeRabbit](https://www.coderabbit.ai/) (sponsor 🩷)
- Microsoft ([Teams](https://github.com/microsoft/teams-ai), [GenAIScript](https://github.com/microsoft/genaiscript/))
- Elastic ([Kibana](https://github.com/elastic/kibana))
- [Effect TS](https://effect.website/)
- [Rivet](https://github.com/Ironclad/rivet) by Ironclad

Please consider [🩷 sponsoring](https://github.com/sponsors/niieani) the project if you find it useful.

#### Features

It is the most feature-complete, open-source GPT tokenizer on NPM. This package is a port of OpenAI's [tiktoken](https://github.com/openai/tiktoken), with some additional, unique features sprinkled on top:

- Support for easily tokenizing chats thanks to the `encodeChat` function
- Support for all current OpenAI models (available encodings: `r50k_base`, `p50k_base`, `p50k_edit`, `cl100k_base`, `o200k_base`, and `o200k_harmony`)
- Can be loaded and work synchronously! (i.e. in non async/await contexts)
- Generator function versions of both the decoder and encoder functions
- Provides the ability to decode an asynchronous stream of data (using `decodeAsyncGenerator` and `decodeGenerator` with any iterable input)
- No global cache (no accidental memory leaks, as with the original GPT-3-Encoder implementation)
- Includes a highly performant `isWithinTokenLimit` function to assess token limit without encoding the entire text/chat
- Built-in cost estimation with the `estimateCost` function for calculating API usage costs
- Full library of OpenAI models with comprehensive pricing information (see [`src/models.ts`](./src/models.ts) and [`src/models.gen.ts`](./src/models.gen.ts))
- Improves overall performance by eliminating transitive arrays
- Type-safe (written in TypeScript)
- Works in the browser out-of-the-box

## Installation

### As NPM package

```bash
npm install gpt-tokenizer
```

### As a UMD module

```html
<script src="https://unpkg.com/gpt-tokenizer"></script>

<script>
  // the package is now available as a global:
  const { encode, decode } = GPTTokenizer_cl100k_base
</script>
```

If you wish to use a custom encoding, fetch the relevant script.

- https://unpkg.com/gpt-tokenizer/dist/o200k_base.js (for all modern models, such as `gpt-5`, `gpt-4o`, `gpt-4.1`, `o1` and others)
- https://unpkg.com/gpt-tokenizer/dist/o200k_harmony.js (for open-weight Harmony models such as `gpt-oss-20b` and `gpt-oss-120b`)
- https://unpkg.com/gpt-tokenizer/dist/cl100k_base.js (for `gpt-4` and `gpt-3.5`)
- https://unpkg.com/gpt-tokenizer/dist/p50k_base.js
- https://unpkg.com/gpt-tokenizer/dist/p50k_edit.js
- https://unpkg.com/gpt-tokenizer/dist/r50k_base.js

The global name is a concatenation: `GPTTokenizer_${encoding}`.

Refer to [supported models and their encodings](#Supported-models-and-their-encodings) section for more information.

## Playground

The playground is published under a memorable URL: https://gpt-tokenizer.dev/

[![GPT Tokenizer Playground](./docs/gpt-tokenizer.png)](https://gpt-tokenizer.dev/)

## Usage

The library provides various functions to transform text into (and from) a sequence of integers (tokens) that can be fed into an LLM model. The transformation is done using a Byte Pair Encoding (BPE) algorithm used by OpenAI.

```typescript
import {
  encode,
  encodeChat,
  decode,
  isWithinTokenLimit,
  encodeGenerator,
  decodeGenerator,
  decodeAsyncGenerator,
  ALL_SPECIAL_TOKENS,
} from 'gpt-tokenizer'
// note: depending on the model, import from the respective file, e.g.:
// import {...} from 'gpt-tokenizer/model/gpt-4o'

const text = 'Hello, world!'
const tokenLimit = 10

// Encode text into tokens
const tokens = encode(text)
