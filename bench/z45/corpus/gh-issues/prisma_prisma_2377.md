# Support for splitting Prisma schema into multiple files

**@albertoperdomo** opened on 2020-05-05T18:40:27Z

## Problem

Prisma currently only supports one single Prisma Schema file. Developers want more flexibility for managing their Prisma Schema files.
 
Motivations:

* breaking up large schema files to make them more manageable
* flexible integration with certain architectures, i.e. each module has its own self-contained logic including its schema

## Solution

Support importing additional schema files, i.e. `import "user.schema"`, `import models/*.prisma` or `import modules/**/*.prisma`.

## Alternatives

Not researched at this time. 

## Additional context

https://github.com/prisma/prisma/issues/92




---
**@ChristophDietrich** commented on 2020-05-08T16:01:31Z

Like prisma one ... there was a feature like this implemented.

---
**@paniavula** commented on 2020-05-14T16:47:01Z

Appreciate prioritisation of this. It is really painful to write all the schema in one file.

---
**@beeplin** commented on 2020-05-14T17:09:23Z

badly need this feature. currently I have to `cat a.prisma b.prisma > schema.prisma`. it works but is so clumsy.

---
**@JontyCoertzen** commented on 2020-06-02T15:40:01Z

Any update on this?

---
**@SteveSonoa** commented on 2020-11-13T03:20:32Z

Any movement on this? Really looking for this solution.

---
**@yhaiovyi** commented on 2020-11-14T18:34:08Z

It's a dealbreaker for me...

---
**@Mark-Panda** commented on 2020-11-20T01:36:10Z

Urgent need

---
**@tylim88** commented on 2020-11-29T12:41:43Z

need this badly
