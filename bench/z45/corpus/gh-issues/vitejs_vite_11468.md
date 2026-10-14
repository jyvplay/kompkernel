# Vite dev hangs indefinitely without errors on page with many components and imports

**@hanszoons** opened on 2022-12-22T20:51:39Z

### Describe the bug

I use SvelteKit. I have a somewhat complex page that contains quite a lot of components and imported functions. I had sporadic problems with this page hanging in the browser (both Firefox and Chrome). However, no error or notification in the vite cli. I was usually able to fix this by restarting the dev server several times whether or not in combination with restarting the browser. Other, simpler pages, always just kept working. Restarting my computer always works. 

In recent days, I have been adding extra functionality, and the more I added, the more often the page kept hanging and the harder I got it to work again. When I get the page online (after frequently restarting everything I get restarted), everything just works. Until I make an adjustment in the code and because of the HMR the thing hangs again. I don't see any other pattern to it.

The problem does not occur when I build and preview the page, the production code always works.

It's driving me crazy, I can hardly get anything developed.

### Reproduction

I can't build a reproduction, there is no pattern.

### Steps to reproduce

It happens only on the dev server. I can find no pattern, cannot pinpoint a cause and thus cannot foresee any reproduction. There is nothing wrong with the code itself, the production build works perfectly.

The debug logs below are what I get when browsing to /leerlijn/54159.
It starts doing it's thing, and then just randomly stops at some point. 

### System Info

```shell
System:
    OS: macOS 13.0.1
    CPU: (10) arm64 Apple M1 Pro
    Memory: 12.20 GB / 32.00 GB
    Shell: 5.8.1 - /bin/zsh
  Binaries:
    Node: 18.12.1 - ~/.nvm/versions/node/v18.12.1/bin/node
    npm: 8.19.2 - ~/.nvm/versions/node/v18.12.1/bin/npm
  Browsers:
    Chrome: 108.0.5359.124
    Firefox: 108.0.1
    Safari: 16.1
  npmPackages:
    vite: ^4.0.3 => 4.0.3
```


### Used Package Manager

npm

### Logs

Posted here: https://gist.github.com/hanszoons/2c511fa66ad76bd5181f84f7f7115eb5 because of the maximum 65536 characters.

These are the logs when requesting the page /leerlijn/54159, after wich it simply hangs indefinitely. 

The second file are the logs when the page is rendered successfully. Same exact code, same config, same everything. Just some dev server restarts and good luck. 1 code change with HMR and the thing  hang again.

### Validations

- [X] Follow our [Code of Conduct](https://github.com/vitejs/vite/blob/main/CODE_OF_CONDUCT.md)
- [X] Read the [Contributing Guidelines](https://github.com/vitejs/vite/blob/main/CONTRIBUTING.md).
- [X] Read the [docs](https://vitejs.dev/guide).
- [X] Check that there isn't [already an issue](https://github.com/vitejs/vite/issues) that reports the same bug to avoid creating a duplicate.
- [X] Make sure this is a Vite issue and not a framework-specific issue. For example, if it's a Vue SFC related bug, it should likely be reported to [vuejs/core](https://github.com/vuejs/core) instead.
- [X] Check that this is a concrete bug. For Q&A open a [GitHub Discussion](https://github.com/vitejs/vite/discussions) or join our [Discord Chat Server](https://chat.vitejs.dev/).
- [X] The provided reproduction is a [minimal reproducible example](https://stackoverflow.com/help/minimal-reproducible-example) of the bug.


---
**@fc** commented on 2022-12-23T07:19:47Z

I have also run into chrome spontaneously crashing (well just the tab) seemingly due to HMR but there was nothing useful that came out of verbose logging or anywhere else. When you say it stops working/hangs, what does it show in the browser?

---
**@hanszoons** commented on 2022-12-23T08:29:44Z

> When you say it stops working/hangs, what does it show in the browser?

Nothing at all. Just a pending request and a spinner. The hanging only happens on requests to this 'route'/page, the vite process/server still accepts other requests even after the hanging happened. And handles them just fine without requiring a restart.

![image](https://user-images.githubusercontent.com/91126835/209300471-237c5f61-be6f-4989-ba40-c4c95e295985.png)

I have no idea where to even start to 'debug' this problem.

It does not seem chrome related, it happens in Firefox and Safari as well.

---
**@hanszoons** commented on 2022-12-23T09:58:51Z

I found a (consistent) way to temporary fix a hanging route.
* I delete a bunch of imports (and the code using them) in the file. 
* Restart the server. 
* Reload the hanging page (it loads). 
* Paste imports back in the file. Save. 
* HMR does it's thing. 
* Route can be reloaded and works fine.

Changing anything in one of the imported files (something as simple as adding a console log) can result in the HMR making the page hang again. 

---
**@fc** commented on 2022-12-23T21:51:00Z

I've run into infinite pending requests and other issues but here are a few thoughts that maybe will help you although what you describe doesn't sound exactly the same as what I ran into...

Untrusted SSL/cache issues -  for SSL we needed to have a trusted SSL certificate - it doesn't look like you're using SSL based on your screenshot but mentioning it just in case because there were equally frustrating and baffling issues with that.  Using an untrusted SSL could lead to unexpected behavior since it wouldn't correctly cache anything.  I see that 'Disable cache' is checked in your screenshot, and I wonder if that is maybe causing problems (or just a coincidence).

Infinite pending requests - the infinite pending request problem that we had was caused by a bug in `http` that we could never fully root cause (`http` is used under the hood by the vite proxy).  To workaround this, we setup a proxy that doesn't use node at all that would act as a reverse proxy to all requests to vite, e.g., `localhost:9000` would proxy all the requests to `localhost:5173`.  We also had to remove to the `server.proxy` settings from our vite config.
There is a GitHub issue that says this may be a problem with a file descriptor limit although increasing the file descriptor limit didn't seem to resolve it for us.



---
**@wtachau** commented on 2023-01-02T23:20:18Z

I have seen this as well, with SvelteKit. In my case I get a log that ssr compilation starts, but it never finishes. It is non-deterministic and only happens in dev. If you figure out what's causing it, I'd love to know— it's driving me crazy.

---
**@mike-lischke** commented on 2023-01-05T16:28:30Z

Same problem here, but with a preact app that uses web workers with very large TS files (a parser). HMR is not my problem, though. I can run the app once. Have to wait a couple of seconds until everything is loaded. Then I go to the page that requires parsing and get a couple of these messages:

> [BABEL] Note: The code generator has deoptimised the styling of undefined as it exceeds the max of 500KB.

Once the last of the message is through I can actually use the page and the worker (pool) works. Then I try to restart the app and nothing works anymore. It just hangs and after a while I get a timeout error.

When I now try to stop the dev server (by pressing q in the VS Code terminal) nothing happens. Same for ctrl+c. I have to kill the process and start the dev server again before I can continue. This is so annoying. If I only had a log that would tell me what's going wrong...

---
**@mike-lischke** commented on 2023-01-05T16:40:53Z

Following the advice from @fc I disabled https and that seems to help with my issues. I used `"@vitejs/plugin-basic-ssl"` to provide a self signed certificate.

I then checked also HMR and the updates are instant! So https seems definitely to be an issue with the dev server/browser.

---
**@fc** commented on 2023-01-05T16:52:52Z

@mike-lischke if you do need/want https, you need to trust the ssl by manually setting it to be trusted in Keychain Access on macOS. 

I had submitted a PR that added instructions/info about this on the troubleshooting page.

https://github.com/vitejs/vite/pull/11126
