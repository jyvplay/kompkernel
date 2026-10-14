# Hooks + multiple instances of React

**@brunolemos** opened on 2018-10-27T00:34:08Z

# To people coming from search: please [read this page first](https://reactjs.org/warnings/invalid-hook-call-warning.html). It contains most common possible fixes!



**Do you want to request a *feature* or report a *bug*?**

Enhancement

**What is the current behavior?**

I had multiple instances of React by mistake.

When trying to use hooks, got this error:
`hooks can only be called inside the body of a function component`

Which is not correct since I was using function components. Took me a while to find the real cause of the issue.

**What is the expected behavior?**

Show the correct error message. Maybe detect that the app has multiple instances of React and say that it may be the reason of bugs. 


---
**@philipp-spiess** commented on 2018-10-27T15:17:59Z

So just for clarification: You were importing a hook (say `useState`) from a different `react` module than the one used to render the component?

I agree that this is confusing. I'm not sure though if we have a way of knowing if any other React module is rendering. AFAIK we try to run React in isolation as much as possible so that multiple React instances can work in the same global context without issues.

Otherwise we could probably update the error message and mention this case as well if it's not too confusing.

---
**@brunolemos** commented on 2018-10-27T15:31:08Z

Yes, I compared `React1 === React2` and it was `false` (React1 being from index.js and React2 being from the file using the hook). When this happens, hooks fail with the generic error message above.

This issue is to raise awareness of this case and maybe improve the error message in some way to help people that face this. It's probably very edge though.

---
**@GabrielBB** commented on 2018-11-01T18:16:30Z

Yup, i tried to [npm link](http://www.deadcoderising.com/how-to-smoothly-develop-node-modules-locally-using-npm-link/) a package i'm creating. It throws that same error since the other package is also using hooks but with its own React. I had to publish my package to NPM and then import it directly from NPM. That way the error was gone, but i hope this is fixed since publishing a package without testing it is bad, obviously 

---
**@mpeyper** commented on 2018-11-02T11:00:27Z

Lerna monorepos suffer from this as well when a custom hook is defined in one package and used by another as the symlinked dependencies use their own copy of react.

I have a (hacky) workaround at the moment using [`npm-link-shared`](https://www.npmjs.com/package/npm-link-shared) and a `prestart` npm script to essentially replace the one package's `react` dependency with a symlink to the other's, so they use the same instance.

```json
"prestart": "npm-link-shared ./node_modules/<other package>/node_modules . react"
```

---
**@apieceofbart** commented on 2018-11-03T13:25:39Z

I had the same issue and I resolved it by adding:
```
 alias: {
        react: path.resolve('./node_modules/react')
      }
```
to `resolve` property in webpack config of my main app. 

It's was obviously my mistake of using two copies of React but I agree that it would be great if the error message was better. I think this is maybe similar to: https://github.com/facebook/react/issues/2402

---
**@GabrielBB** commented on 2018-11-05T16:40:02Z

@mpeyper It works. Thanks


---
**@jimbo** commented on 2018-11-18T04:33:17Z

@apieceofbart That worked for me. Thanks for the suggestion. 👍 

---
**@jbandi** commented on 2018-12-03T23:23:16Z

As I understand this problem arises when there are multiple copies of React in the same bundle.

Is this also a problem if two separate bundles with their own copies of React are bootstrapping their own React applications on separate dom elements, like described here: https://medium.jonasbandi.net/hosting-multiple-react-applications-on-the-same-document-c887df1a1fcd

I think the latter is a common "integration" pattern used for instance in the single-spa meta-framework (https://github.com/CanopyTax/single-spa).
