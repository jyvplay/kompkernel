# [NEXT-1143] Dev mode slow compilation

**@jeengbe** opened on 2023-04-23T12:39:20Z

⚠️ this original post has been edited by @timneutkens to reflect [this comment](https://github.com/vercel/next.js/issues/48748#issuecomment-1578374105) ⚠️

## Changes in the past week

I've been investigating this over the past week. Made a bunch of changes, some make a small impact, some make a large impact. Here's a list:

* Affects all applications
  * [https://github.com/vercel/next.js/pull/50745](https://github.com/vercel/next.js/pull/50745)
  * [https://github.com/vercel/next.js/pull/50795](https://github.com/vercel/next.js/pull/50795) -- If you don't have a favicon.ico
  * [https://github.com/vercel/next.js/pull/50379](https://github.com/vercel/next.js/pull/50379) -- If you have both `pages` and `app` and you're only working on `app` it will no longer compile the runtime for `pages`. Note: this shifts the compilation of the runtime to when you first open a page
* Might not affect your app
  * [https://github.com/vercel/next.js/pull/50792](https://github.com/vercel/next.js/pull/50792) -- This one I've only been able to reproduce on the Vercel website in development, it might make your compilation a lot faster (i.e. 50% faster for Vercel's website) but in most cases it likely won't affect your application.

You can try them using `npm install next@canary`.

## Help Investigate

In order to help me investigate this I'll ideally need an application that can be run, if you can't provide that (I understand if you can't) please provide the `.next/trace` file.

If possible follow these steps which would give me the best picture to investigate:

* `npm install next@canary` (use the package manager you're using) -- We want to make sure you're using the very latest version of Next.js which includes the fixes mentioned earlier.
* `rm -rf .next`
* start development using the `NEXT_CPU_PROF=1` and `NEXT_TURBOPACK_TRACING=1` (regardless of if you're using Turbopack, it only affects when you do use Turbopack) environment variable.  E.g.:
  * npm:  `NEXT_TURBOPACK_TRACING=1 NEXT_CPU_PROF=1 npm run dev`
  * yarn:  `NEXT_TURBOPACK_TRACING=1 NEXT_CPU_PROF=1 yarn dev`
  * pnpm: `NEXT_TURBOPACK_TRACING=1 NEXT_CPU_PROF=1 pnpm dev`
* Wait a few seconds
* Open a page that you're working on
* Wait till it's fully loaded
* Wait a few seconds
* Make an edit to a file that holds a component that is on the page
* Wait for the edit to apply
* Wait a few seconds
* Make another edit to the same file
* Wait a few seconds
* Exit the dev command (`ctrl+c`)
* Upload the CPU traces put in the root of the application directory to [https://gist.github.com](https://gist.github.com)
* Upload the `.next/trace` file to [https://gist.github.com](https://gist.github.com) -- Please **don't** run trace-to-tree yourself, as I use some other tools (e.g. Jaeger) that require the actual trace file.
* If you're using Turbopack upload the `.next/trace.log` as well, if it's too large for GitHub gists you can upload it to Google Drive or Dropbox and share it through that.
* Upload `next.config.js` (if you have one) to  [https://gist.github.com](https://gist.github.com)
* Share it here

## Known application-side slowdowns

To collect things I've seen before that cause slow compilation as this is often the root cause:

* If you're on Windows, disable Windows Defender, it's a known cause of extreme slowdowns in filesystem access as it sends each file to an external endpoint before allowing to read/write
* Filesystem slowness overall is what we've seen as the cause of problems, e.g. with Docker
* `react-icons`, material icons, etc. Most of these libraries publish barrel files with a *lot* of re-exports. E.g. material-ui/icons ships **5500** module re-exports, which causes all of them to be compiled. You have to add `modularizeImports ` to reduce it, here's an example: [https://github.com/vercel/next.js/issues/45529#issuecomment-1531912811](https://github.com/vercel/next.js/issues/45529#issuecomment-1531912811)
* Custom postcss config, e.g. tailwindcss with a `content` setting that tries to read too many files (e.g. files not relevant for the application)

---

This and other slowdown reports are currently the top priority for our team. We'll continue optimizing Next.js with webpack where possible.
The Turbopack team is currently working on getting all Next.js integration tests passing when using Turbopack as we continue working towards stability of Turbopack.

<details>
<summary>Original post</summary>

### Verify canary release

* [X] I verified that the issue exists in the latest Next.js canary release

### Provide environment information

```
Operating System:
      Platform: linux
      Arch: x64
      Version: #1 SMP Fri Jan 27 02:56:13 UTC 2023
    Binaries:
      Node: 18.13.0
      npm: 8.19.3
      Yarn: 1.22.18
      pnpm: 7.30.5
    Relevant packages:
      next: 13.3.1
      eslint-config-next: 13.3.1
      react: 18.2.0
      react-dom: 18.2.0
```

### Which area(s) of Next.js are affected? (leave empty if unsure)

*No response*

### Link to the code that reproduces this issue

[https://github.com/DigitalerSchulhof/digitaler-schulhof](https://github.com/DigitalerSchulhof/digitaler-schulhof)

### To Reproduce

Note that I have been unable to replicate this issue in a demo repository.

### Describe the Bug

The issue is that Next.js is generally slow in dev mode. Navigating to new pages takes several seconds:

```
[next] ready - started server on 0.0.0.0:3000, url: http://localhost:3000
[next] info  - Loaded env from /home/jeengbe/dsh/digitaler-schulhof/.env
[next] warn  - You have enabled experimental feature (appDir) in next.config.js.
[next] warn  - Experimental features are not covered by semver, and may cause unexpected or broken application behavior. Use at your own risk.
[next] info  - Thank you for testing `appDir` please leave your feedback at https://nextjs.link/app-feedback
[next] event - compiled client and server successfully in 1574 ms (267 modules)
[next] wait  - compiling...
[next] event - compiled client and server successfully in 219 ms (267 modules)
[next] wait  - compiling /(schulhof)/Schulhof/page (client and server)...
[next] event - compiled client and server successfully in 3.6s (1364 modules)
[next] wait  - compiling /(schulhof)/Schulhof/(login)/Anmeldung/page (client and server)...
[next] event - compiled client and server successfully in 1920 ms (1411 modules)
[next] wait  - compiling /api/schulhof/auth/login/route (client and server)...
[next] event - compiled client and server successfully in 625 ms (1473 modules)
[next] wait  - compiling /(schulhof)/Schulhof/Nutzerkonto/page (client and server)...
[next] event - compiled client and server successfully in 1062 ms (1482 modules)
[next] wait  - compiling /(schulhof)/Schulhof/Nutzerkonto/Profil/page (client and server)...
[next] event - compiled client and server successfully in 1476 ms (1546 modules)
[next] wait  - compiling /(schulhof)/Schulhof/Nutzerkonto/Profil/Einstellungen/page (client and server)...
[next] event - compiled client and server successfully in 2.1s (1559 modules)
```

The only somewhat reasonable time would be 600ms for the API route `/api/schulhof/auth/login/route`, even though that is still quite a lot slower than what it should be given its size.

It also doesn't look right to compile \~1500 modules for each page, as most of them should be cached. The pages are not very different.

Even an empty API route takes several hundreds of ms. The following example contains solely type exports:

```
[next] wait  - compiling /api/schulhof/administration/persons/persons/settings/route (client and server)...
[next] event - compiled successfully in 303 ms (107 modules)
```

---

I am not exactly sure how to read trace trees, but what stands out is that there are (over multiple runs) several `entry next-app-loader` that take 2+ seconds to complete:

```
│  │  ├─ entry next-app-loader?name=app/(schulhof)/Schulhof/page&page=/(schulhof)/Schulhof/page&appPaths=/(schulhof)/Schulhof/page&pagePath=private-next-app-dir/(schulhof)/Schulhof/page.tsx&appDir=/home/jeengbe/dsh/digitaler-schulhof/app&pageExtensions=tsx&pageExtensions=ts&pageExtensions=jsx&pageExtensions=js&rootDir=/home/jeengbe/dsh/digitaler-schulhof&isDev=true&tsconfigPath=tsconfig.json&assetPrefix=&nextConfigOutput=! 1.9s
```

Find both dev and build traces here: [https://gist.github.com/jeengbe/46220a09846de6535c188e78fb6da03e](https://gist.github.com/jeengbe/46220a09846de6535c188e78fb6da03e)

Note that I have modified `trace-to-tree.mjs` to include event times for all events.

It also seems unusual that none of the modules have child traces.

### Expected Behavior

Initial load and navigating should be substantially faster.

### Which browser are you using? (if relevant)

*No response*

### How are you deploying your application? (if relevant)

*No response*

<sub>From [SyncLinear.com](https://synclinear.com) | [NEXT-1143](https://linear.app/vercel/issue/NEXT-1143/dev-mode-slow-compilation)</sub>


---
**@joacub** commented on 2023-04-24T18:20:54Z

same here, and in docker env is even worse, seems like is processing same files over and over without caching them.

---
**@jinojacob15** commented on 2023-04-25T03:57:46Z

Same for me also dev env ,navigating to different pages via link component is pretty slow

---
**@denu5** commented on 2023-04-25T17:28:59Z

+1 its same here, hitting the page first time seems fine but routing via links gets stuck

---
**@joacub** commented on 2023-04-25T17:34:00Z

last canary version has a better cold build times improvements, still slow like 2-5 seconds (in docker env) waiting but much better

the version im talking about is 13.3.2-canary.6

---
**@denu5** commented on 2023-05-02T09:02:10Z

Hey, @jeengbe there have been some patch updates (13.3.1 -> 13.3.4) did it improve for you?

---
**@jeengbe** commented on 2023-05-02T17:42:47Z

Hi @denu5,

unfortunately, I can't report any real performance changes since I opened this issue.

You might want to check out the above linked issue in the TypeScript repo though - might be related.

---
**@joacub** commented on 2023-05-02T17:50:57Z

As @jeengbe mention there is no performance improvement, there is also a lot of I/O I don’t know why, one request gets pretty much like 1gb-2gb of io. And it is very slow. 

---
**@jeengbe** commented on 2023-05-02T18:07:49Z

> As @jeengbe mention there is no performance improvement, there is also a lot of I/O I don’t know why, one request gets pretty much like 1gb-2gb of io. And it is very slow.

Unfortunately, I can't confirm this for my case

![image](https://user-images.githubusercontent.com/51749023/235749078-16739a6d-14fd-4cb5-8674-918f5057a5db.png)

