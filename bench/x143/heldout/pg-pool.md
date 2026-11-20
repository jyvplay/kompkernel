# pg-pool

[![Build Status](https://travis-ci.org/brianc/node-pg-pool.svg?branch=master)](https://travis-ci.org/brianc/node-pg-pool)

A connection pool for node-postgres

## install

```sh
npm i pg-pool pg
```

## use

### create

to use pg-pool you must first create an instance of a pool

```js
const Pool = require('pg-pool')

// by default the pool uses the same
// configuration as whatever `pg` version you have installed
const pool = new Pool()

// you can pass properties to the pool
// these properties are passed unchanged to both the node-postgres Client constructor
// and the pool constructor, allowing you to fully configure the behavior of both
const pool2 = new Pool({
  database: 'postgres',
  user: 'brianc',
  password: 'secret!',
  port: 5432,
  ssl: true,
  max: 20, // set pool max size to 20
  idleTimeoutMillis: 1000, // close idle clients after 1 second
  connectionTimeoutMillis: 1000, // return an error after 1 second if connection could not be established
  maxUses: 7500, // close (and replace) a connection after it has been used 7500 times (see below for discussion)
})

// you can supply a custom client constructor
// if you want to use the native postgres client
const NativeClient = require('pg').native.Client
const nativePool = new Pool({ Client: NativeClient })

// you can even pool pg-native clients directly
const PgNativeClient = require('pg-native')
const pgNativePool = new Pool({ Client: PgNativeClient })
```

##### Note:

The Pool constructor does not support passing a Database URL as the parameter. To use pg-pool on heroku, for example, you need to parse the URL into a config object. Here is an example of how to parse a Database URL.

```js
const Pool = require('pg-pool')
const url = require('url')

const params = url.parse(process.env.DATABASE_URL)
const auth = params.auth.split(':')

const config = {
  user: auth[0],
  password: auth[1],
  host: params.hostname,
  port: params.port,
  database: params.pathname.split('/')[1],
  ssl: true,
}

const pool = new Pool(config)

/*
  Transforms, 'postgres://DBuser:secret@DBHost:#####/myDB', into
  config = {
    user: 'DBuser',
    password: 'secret',
    host: 'DBHost',
    port: '#####',
    database: 'myDB',
    ssl: true
  }
*/
```

### acquire clients with a promise

pg-pool supports a fully promise-based api for acquiring clients

```js
const pool = new Pool()
pool.connect().then((client) => {
  client
    .query('select $1::text as name', ['pg-pool'])
    .then((res) => {
      client.release()
      console.log('hello from', res.rows[0].name)
    })
    .catch((e) => {
      client.release()
