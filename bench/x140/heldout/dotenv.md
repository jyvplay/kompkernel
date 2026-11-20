# dotenv [![NPM version](https://img.shields.io/npm/v/dotenv.svg?style=flat-square)](https://www.npmjs.com/package/dotenv) [![downloads](https://img.shields.io/npm/dw/dotenv)](https://www.npmjs.com/package/dotenv)

<img src="https://raw.githubusercontent.com/motdotla/dotenv/master/dotenv.svg" alt="dotenv" align="right" width="200" />

Dotenv is a zero-dependency module that loads environment variables from a `.env` file into [`process.env`](https://nodejs.org/docs/latest/api/process.html#process_process_env). Storing configuration in the environment separate from code is based on [The Twelve-Factor App](https://12factor.net/config) methodology.

[Watch the tutorial](https://www.youtube.com/watch?v=YtkZR0NFd1g)

&nbsp;

## Usage

Install it.

```sh
npm install dotenv --save
```

Create a `.env` file in the root of your project:

```ini
# .env
S3_BUCKET="YOURS3BUCKET"
SECRET_KEY="YOURSECRETKEYGOESHERE"
```

And as early as possible in your application, import and configure dotenv:

```javascript
require('dotenv').config() // or import 'dotenv/config' if you're using ES6
...
console.log(process.env) // remove this after you've confirmed it is working
```

That's it. `process.env` now has the keys and values you defined in your `.env` file:

&nbsp;

## Advanced

<details><summary>ES6</summary><br>

Import with [ES6](#how-do-i-use-dotenv-with-import):

```javascript
import 'dotenv/config'
```

ES6 import if you need to set config options:

```javascript
import dotenv from 'dotenv'
dotenv.config({ path: '/custom/path/to/.env' })
```

</details>
<details><summary>bun</summary><br>

```sh
bun add dotenv
```

</details>
<details><summary>yarn</summary><br>

```sh
yarn add dotenv
```

</details>
<details><summary>pnpm</summary><br>

```sh
pnpm add dotenv
```

</details>
<details><summary>Monorepos</summary><br>

For monorepos with a structure like `apps/backend/app.js`, put it the `.env` file in the root of the folder where your `app.js` process runs.

```ini
# app/backend/.env
S3_BUCKET="YOURS3BUCKET"
SECRET_KEY="YOURSECRETKEYGOESHERE"
```

</details>
<details><summary>Multiline Values</summary><br>

If you need multiline variables, for example private keys, those are now supported (`>= v15.0.0`) with line breaks:

```ini
PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----
...
Kh9NV...
...
-----END RSA PRIVATE KEY-----"
```

