# TypeError: getProcessedPlugins is not a function

**@GregSitholeEntrostat** opened on 2020-11-19T08:13:37Z

### Describe the problem:

Upgraded from TailwindCSS 1.9.6 to 2.0.1 for my angular project following the instructions on their website. I had previously used the following guide: https://notiz.dev/blog/angular-10-with-tailwindcss#setup to Install the previous version and that worked before.

Please see error below:

```
ERROR in Module build failed (from ./node_modules/postcss-loader/dist/cjs.js):
TypeError: getProcessedPlugins is not a function
    at /home/greg/angular-website/frontend/node_modules/tailwindcss/lib/processTailwindFeatures.js:71:83
    at LazyResult.runOnRoot (/home/greg/angular-website/frontend/node_modules/postcss/lib/lazy-result.js:276:16)
    at LazyResult.runAsync (/home/greg/angular-website/frontend/node_modules/postcss/lib/lazy-result.js:328:26)
    at async Object.loader (/home/greg/angular-website/frontend/node_modules/postcss-loader/dist/index.js:94:14)

ERROR in ./src/styles.scss (./node_modules/css-loader/dist/cjs.js??ref--13-1!./node_modules/@angular-devkit/build-angular/node_modules/postcss-loader/src??embedded!./node_modules/resolve-url-loader??ref--13-3!./node_modules/sass-loader/dist/cjs.js??ref--13-4!./node_modules/postcss-loader/dist/cjs.js??ref--17!./src/styles.scss)
Module build failed (from ./node_modules/postcss-loader/dist/cjs.js):
TypeError: getProcessedPlugins is not a function
    at /home/greg/angular-website/frontend/node_modules/tailwindcss/lib/processTailwindFeatures.js:71:83
    at LazyResult.runOnRoot (/home/greg/angular-website/frontend/node_modules/postcss/lib/lazy-result.js:276:16)
    at LazyResult.runAsync (/home/greg/angular-website/frontend/node_modules/postcss/lib/lazy-result.js:328:26)
    at async Object.loader (/home/greg/angular-website/frontend/node_modules/postcss-loader/dist/index.js:94:14)

```


---
**@alexcroox** commented on 2020-11-19T09:09:53Z

I too am getting this, I'm using the PostCSS 7 compatibility build with Vue 2

"postcss": "^7.0.35",
"tailwindcss": "^2.0.1-compat"

**For anyone coming from Google, you need to make sure you have upgraded to Node.js 12.13 or higher for Tailwind v2**

---
**@GregSitholeEntrostat** commented on 2020-11-19T09:53:00Z

@alexcroox I managed to fix it on my end. 

What I did was I removed the existing `tailwind.config.js` and just ran the command `npx tailwindcss init --full`, then I just applied the custom configurations that I did to it. I'm going to close the issue since I fixed my original issue

---
**@SimonPrague** commented on 2020-11-19T10:02:08Z

I have the same issue and was not able to resolve it yet. 
Can it be due to the use of plugins?
```
  plugins: [
    require('@tailwindcss/ui'),
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
  ],
```

---
**@alexcroox** commented on 2020-11-19T10:04:42Z

@GregSitholeEntrostat what was the diff on your tailwind.config.js? Perhaps there is something missing in the upgrade guide? 

Could you re-open as it seems others are hitting this issue and we've not got to the cause yet.

---
**@GregSitholeEntrostat** commented on 2020-11-19T10:11:11Z

@alexcroox There's quite a bit of change. Here's a link to their latest version https://github.com/tailwindlabs/tailwindcss/blob/master/stubs/defaultConfig.stub.js

@SimonPrague I'm not too sure, I'm not familiar with those plugins and currently not using any! Have you tried to see what happens when you remove the plugins?

---
**@SimonPrague** commented on 2020-11-19T10:13:55Z

It breaks the same even with removing those plugins :(

---
**@SimonPrague** commented on 2020-11-19T10:26:17Z

Ok I removed the UI plugin as it seems no longer required for TailwindUI. But I get this error instead:

```
error  in ./src/components/profile/widgets/***.vue?vue&type=style&index=0&id=71d401a6&scoped=true&lang=postcss

Module build failed (from ./node_modules/.pnpm/postcss-loader@3.0.0/node_modules/postcss-loader/src/index.js):
TypeError: Cannot convert undefined or null to object
    at Function.entries (<anonymous>)
    at Object.module.exports [as typography] (/home/***/client/node_modules/.pnpm/@tailwindcss/typography@0.3.1_tailwindcss@2.0.1/node_modules/@tailwindcss/typography/src/styles.js:1076:13)
    at /home/***/client/node_modules/.pnpm/tailwindcss@2.0.1_01b244ddc5034529ac96d3fe28ec275b/node_modules/tailwindcss/lib/util/resolveConfig.js:135:65
    at Array.reduce (<anonymous>)
    at resolveFunctionKeys (/home/***/client/node_modules/.pnpm/tailwindcss@2.0.1_01b244ddc5034529ac96d3fe28ec275b/node_modules/tailwindcss/lib/util/resolveConfig.js:133:30)
    at resolveConfig (/home/***/client/node_modules/.pnpm/tailwindcss@2.0.1_01b244ddc5034529ac96d3fe28ec275b/node_modules/tailwindcss/lib/util/resolveConfig.js:270:12)
    at /home/***/client/node_modules/.pnpm/tailwindcss@2.0.1_01b244ddc5034529ac96d3fe28ec275b/node_modules/tailwindcss/lib/index.js:75:37
    at /home/***/client/node_modules/.pnpm/tailwindcss@2.0.1_01b244ddc5034529ac96d3fe28ec275b/node_modules/tailwindcss/lib/processTailwindFeatures.js:50:20
    at LazyResult.run (/home/***/client/node_modules/.pnpm/postcss@7.0.35/node_modules/postcss/lib/lazy-result.js:288:14)
    at LazyResult.asyncTick (/home/***/client/node_modules/.pnpm/postcss@7.0.35/node_modules/postcss/lib/lazy-result.js:212:26)
    at LazyResult.asyncTick (/home/***/client/node_modules/.pnpm/postcss@7.0.35/node_modules/postcss/lib/lazy-result.js:225:14)
    at /home/***/client/node_modules/.pnpm/postcss@7.0.35/node_modules/postcss/lib/lazy-result.js:254:14
    at new Promise (<anonymous>)
    at LazyResult.async (/home/***/client/node_modules/.pnpm/postcss@7.0.35/node_modules/postcss/lib/lazy-result.js:250:23)
    at LazyResult.then (/home/***/client/node_modules/.pnpm/postcss@7.0.35/node_modules/postcss/lib/lazy-result.js:131:17)
    at /home/***/client/node_modules/.pnpm/postcss-loader@3.0.0/node_modules/postcss-loader/src/index.js:142:8
```

---
**@SimonPrague** commented on 2020-11-19T10:27:36Z

I guess that could be related to #861
