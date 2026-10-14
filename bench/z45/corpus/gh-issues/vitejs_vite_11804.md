# TypeError: Failed to fetch dynamically imported module

**@IPWright83** opened on 2023-01-24T14:36:07Z

### Describe the bug

Since switching to Vite we noticed a new production issue, where sometimes users are encountering an error if we deploy while they have an active session:

> **TypeError: Failed to fetch dynamically imported module**

I believe this is because if any code is modified in an area that Vite would turn into a dynamic module, then the file hash changes, however when they try to visit an area that would trigger the dynamic load, those files no longer exist so they hit the error message above. 

Quoting from https://stackoverflow.com/a/74057337/21061
> When you dynamically import a route/component, during build it creates a separate chunk. By default, chunk filenames are hashed according to their content – Overview.abc123.js. If you don't change the component code, the hash remains the same. If the component code changes, the hash changes too - Overview.32ab1c.js. This is great for caching.
> 
> Now this is what happens when you get this error:
>
> - You deploy the application
> - Your Home chunk has a link to /overview route, which would load Overview.abc123.js
> - Client visits your site
> - You make changes in your code, not necessarily to the Overview component itself, but maybe to some children components that Overview imports.
> - You deploy changes, and Overview is built with a different hash now - Overview.32ab1c.js
> - Client clicks on /overview link - gets the Failed to fetch dynamically imported module error, because Overview.abc123.js no longer exists
>
> That is why the errors correlate with deployments. One way to fix it is to not use lazy loaded routes, but that's not a great solution when you have many heavy routes - it will make your main bundle large

What I expect to happen, is not to encounter any errors if the users session remains active during a deployment.

I have been unable to come up with a good workaround (specifically for me using React ErrorBoundary is the best I can do so far with a re-direct similar to https://stackoverflow.com/a/74861436/21061 which is a mitigation and provides quite a poor user experience flashing an error message).

### Reproduction

https://github.com/IPWright83/vite-dynamic-import

### Steps to reproduce

The above repository has been set up to **mimick** a production deployment as obviously that is a much more complicated set-up. It leverages `React.lazy` to force a dynamic module and uses a `setTimeout` to provide a delay with which to simulate a user navigation to a page requiring a module. In a real production scenario I don't believe `React.lazy` is required.

- Clone the above repository
- npm install
- npm run build
- open a 2nd terminal

- **Terminal 1** npx serve dist (starts a web server)
- **Browser** open the URL (usually localhost:3000)
- **Text Editor** modify src/Foo.jsx changing the string "Foo" to something else (within 30s of launching the page - increase the setTimeout in App.jsx if this is not long enough)
- **Terminal 2** npm run build

Wait... 30s after loading the page you should see a blank page render with errors in the browser console:

![image](https://user-images.githubusercontent.com/1374775/214322173-001e2852-9d13-49ea-a47f-a01fd4e4558f.png)

If you were to reload the page, you can see that `Foo-b53985a6.js` has been renamed to `Foo-535d5a10.js` (or similar new hash)

### System Info

```shell
❯ npx envinfo --system --npmPackages '{vite,@vitejs/*}' --binaries --browsers

  System:
    OS: Linux 5.15 Ubuntu 20.04.5 LTS (Focal Fossa)
    CPU: (12) x64 Intel(R) Core(TM) i7-10750H CPU @ 2.60GHz
    Memory: 18.36 GB / 31.10 GB
    Container: Yes
    Shell: 5.0.17 - /bin/bash
  Binaries:
    Node: 16.14.0 - ~/.nvm/versions/node/v16.14.0/bin/node
    Yarn: 1.22.18 - ~/.nvm/versions/node/v16.14.0/bin/yarn
    npm: 8.3.1 - ~/.nvm/versions/node/v16.14.0/bin/npm
  Browsers:
    Chrome: 109.0.5414.74
    Chromium: 109.0.5414.74
    Firefox: 109.0
```
```


### Used Package Manager

pnpm

### Logs

_No response_

### Validations

- [X] Follow our [Code of Conduct](https://github.com/vitejs/vite/blob/main/CODE_OF_CONDUCT.md)
- [X] Read the [Contributing Guidelines](https://github.com/vitejs/vite/blob/main/CONTRIBUTING.md).
- [X] Read the [docs](https://vitejs.dev/guide).
- [X] Check that there isn't [already an issue](https://github.com/vitejs/vite/issues) that reports the same bug to avoid creating a duplicate.
- [X] Make sure this is a Vite issue and not a framework-specific issue. For example, if it's a Vue SFC related bug, it should likely be reported to [vuejs/core](https://github.com/vuejs/core) instead.
- [X] Check that this is a concrete bug. For Q&A open a [GitHub Discussion](https://github.com/vitejs/vite/discussions) or join our [Discord Chat Server](https://chat.vitejs.dev/).
- [X] The provided reproduction is a [minimal reproducible example](https://stackoverflow.com/help/minimal-reproducible-example) of the bug.


---
**@sapphi-red** commented on 2023-01-24T16:46:37Z

This is not something specific to Vite and happens with Webpack, too.

https://mitchgavan.com/code-splitting-react-safely/
http://dimaip.github.io/2020/04/25/deploying-apps-with-code-splitting/

I don't have any idea to solve this on a bundler side.


---
**@awacode21** commented on 2023-01-24T17:08:22Z

We are experiencing the same issues with a vite+vue SSR application.
we are experiencing thousands of those a day. also multiple days after deployment... we also saw this after our very first go-live, where no "previous version" was online. We are completely desperate since one week on how to fix this.
Other strange thing is, sometimes we get this error logged in Sentry, and when we try to check if the file really is not available, we are able to access it. Others are not working

---
**@IPWright83** commented on 2023-01-24T18:11:12Z

Thanks @sapphi-red, is it Vite or Rollup generating these hashes (assuming that's what they are) on the filenames? I wonder if there's a way to suppress that behaviour and if it's required for cache busting whether there's any alternative approaches.

---
**@victorlmneves** commented on 2023-01-24T18:46:27Z

@sapphi-red both generate hashes when running the build. If your product it's a SPA you can try to use a service worker together with an interceptor (if you use Axios) to manage that. I did it on Vue 2 where it's basically stores on the localStorage a version of the app and then compares if the one that you access it's the same or not and if not it triggers a reload of the browser in order to get the updated version

---
**@IPWright83** commented on 2023-01-24T18:52:02Z

@victorlmneves could you provide a bit of a fuller explanation/ code snippets maybe of tha so I understand the concepts a bit more? I'd be quite interested in exploring what that might look like.

---
**@victorlmneves** commented on 2023-01-24T21:26:33Z

@IPWright83 
https://dev.to/voodu/vue-3-pwa-service-worker-12di
https://medium.com/@FezVrasta/service-worker-updates-and-error-handling-with-react-1a3730800e6a

And here is an example that I did some years ago
```
import { register } from "register-service-worker"

if (process.env.NODE_ENV === "production") {
  register(`${process.env.BASE_URL}service-worker.js`, {
    ready() {
      console.log(
        "App is being served from cache by a service worker.\n" +
          "For more details, visit https://goo.gl/AFskqB"
      )
    },
    registered() {
      console.log("Service worker has been registered.")
    },
    cached() {
      console.log("Content has been cached for offline use.")
    },
    updatefound() {
      console.log("New content is downloading.")
    },
    updated() {
      console.log("New content is available please refresh.")
      caches.keys().then(names => {
        for (let name of names) {
          console.log(name)
          caches.delete(name)
        }
      })
      setTimeout(() => {
        window.location.reload()
      }, 1000)
    },
    offline() {
      console.log(
        "No internet connection found. App is running in offline mode."
      )
    },
    error(error) {
      console.error("Error during service worker registration:", error)
    }
  })
}
```

And another one using Axios interceptors
```
axios.interceptors.response.use((resp) => {
  let v = resp.headers['vers'] || 'default'

  if (v !== localStorage.getItem('vers') && resp.config.method == 'get') {
    localStorage.setItem('vers', v)
    window.location.reload() // For new version, simply reload on any get
  }

  return Promise.resolve(resp)
})
```



---
**@sapphi-red** commented on 2023-01-25T02:55:10Z

@IPWright83 
You can remove these hashes from the filename by configuring [`entryFileNames`](https://rollupjs.org/configuration-options/#output-entryfilenames) and [`chunkFileNames`](https://rollupjs.org/configuration-options/#output-chunkfilenames).
```js
import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    rollupOptions: {
      entryFileNames: '[name].js',
      chunkFileNames: '[name].js'
    }
  }
})
```
But yes this is recommended for cache busting.

I don't know any alternatives other than the ones described in the articles I linked above.


---
**@victorlmneves** commented on 2023-01-25T11:35:02Z

@IPWright83 by the way, have you tried to access directly the file that is displayed on the console that wasn't possible to import? I'm asking because on our project we get those errors randomly but when we access them directly the file exist
