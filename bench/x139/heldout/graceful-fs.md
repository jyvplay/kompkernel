# graceful-fs

graceful-fs functions as a drop-in replacement for the fs module,
making various improvements.

The improvements are meant to normalize behavior across different
platforms and environments, and to make filesystem access more
resilient to errors.

## Improvements over [fs module](https://nodejs.org/api/fs.html)

* Queues up `open` and `readdir` calls, and retries them once
  something closes if there is an EMFILE error from too many file
  descriptors.
* fixes `lchmod` for Node versions prior to 0.6.2.
* implements `fs.lutimes` if possible. Otherwise it becomes a noop.
* ignores `EINVAL` and `EPERM` errors in `chown`, `fchown` or
  `lchown` if the user isn't root.
* makes `lchmod` and `lchown` become noops, if not available.
* retries reading a file if `read` results in EAGAIN error.

On Windows, it retries renaming a file for up to one second if `EACCESS`
or `EPERM` error occurs, likely because antivirus software has locked
the directory.

## USAGE

```javascript
// use just like fs
var fs = require('graceful-fs')

// now go and do stuff with it...
fs.readFile('some-file-or-whatever', (err, data) => {
  // Do stuff here.
})
```

## Sync methods

This module cannot intercept or handle `EMFILE` or `ENFILE` errors from sync
methods.  If you use sync methods which open file descriptors then you are
responsible for dealing with any errors.

This is a known limitation, not a bug.

## Global Patching

If you want to patch the global fs module (or any other fs-like
module) you can do this:

```javascript
// Make sure to read the caveat below.
var realFs = require('fs')
var gracefulFs = require('graceful-fs')
gracefulFs.gracefulify(realFs)
```

This should only ever be done at the top-level application layer, in
order to delay on EMFILE errors from any fs-using dependencies.  You
should **not** do this in a library, because it can cause unexpected
delays in other parts of the program.

## Changes

This module is fairly stable at this point, and used by a lot of
things.  That being said, because it implements a subtle behavior
change in a core part of the node API, even modest changes can be
extremely breaking, and the versioning is thus biased towards
bumping the major when in doubt.

The main change between major versions has been switching between
providing a fully-patched `fs` module vs monkey-patching the node core
builtin, and the approach by which a non-monkey-patched `fs` was
created.

The goal is to trade `EMFILE` errors for slower fs operations.  So, if
you try to open a zillion files, rather than crashing, `open`
operations will be queued up and wait for something else to `close`.

There are advantages to each approach.  Monkey-patching the fs means
