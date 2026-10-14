# [Bug] next/link is not calling the server for subsequent navigations on dynamic routes 

**@Fredkiss3** opened on 2022-11-16T14:13:52Z

### Describe the feature you'd like to request

In the documentation it is said that the conditions for hard navigation are :

- when navigating between [dynamic segments](https://beta.nextjs.org/docs/routing/linking-and-navigating#conditions-for-soft-navigation)
- When navigating between two different group layouts (ex: from `(groupA)/layout` to `(groupB)/layout` )

I'd like to suggest also adding hard navigation for segments marked with `dynamic='force-dynamic'` or when using dynamic functions and even when using fetch with `cache: 'no-store'`. 

In the docs you said that using these configurations is like using `getServerSideProps()` in the pages directory, but it does not behave the same between navigations which is quite confusing.

Use cases for this feature could be these : 
- this app that only store pokemon data in cookies ([Live here](https://next-js-react-gsh7kasta-icyjoseph.vercel.app/) and [source here](https://github.com/icyJoseph/next-js-react-gbg/blob/next-13-css-modules/demo-app/app/collection/page.tsx))
- this simple case for an app that generate a random number each time : [ckblitz.com/edit/nextjs-sxijav?file=package.json,app%2Fnested%2Fpage.tsx](https://stackblitz.com/edit/nextjs-sxijav?file=package.json,app%2Fnested%2Fpage.tsx)

### Describe the solution you'd like

The solution i propose is to consider hard navigation for these cases : 

- When navigating to a page marked with `dynamic='force-dynamic'`, next should always do a hard navigation
- When navigating to a page using dynamic functions `headers()` and `cookies()`, next should always do a hard navigation 

- When navigating to a page using `fetch` with `cache: 'no-store'`, next should always do a hard navigation, or at least next should always refetch the data 
- When navigating to a page using either `fetch` with `next: { revalidate: n_seconds }` or  `export const revalidate = n_seconds`, next should only do hard navigation when the `n_seconds` has elapsed. 

The last two could be tricky and if it is not ideal, at least add a paragraph in the doc explaining why it is not possible and maybe recommending the first two approaches.

### Describe alternatives you've considered


#### Updates

- In `next@13.3.1`, using a `<Link prefetch={false} />` seems to fix the problem : https://stackblitz.com/edit/vercel-next-js-n1tqpr?file=app%2Flayout.tsx
 . But it disables link prefetching and result in slower navigations.

- As of `next@13.4.0` the client side cache has been reworked, dynamic pages are now cached in the client with a timer of `30 seconds`, so every 30 seconds your server is recalled, with one catch : this only apply if you navigates to a different page after that time, if you do very fast back & forth to the same page, the timer will reset and only wait for another 30 seconds. Disabling prefetch does not solve the problem anymore, it disables prefetching, but once the page has been navigated to, the rules of 30 seconds still applies. If you want the old behaviour, you'd have to downgrade to `next@13.3.1` for now, You will loose support for Server Actions & revalidate primitives though, Or you can also not use the Link component and use regular a tags if you still want the new features of Next.

However there are things in the work for both allowing prefetching on hover (with `<Link>`) and allowing for setting the stale time on the client side cache. You can read in the [PR about the client side rework](https://github.com/vercel/next.js/pull/48383) :

> ## Follow ups
> - we may add another API to control the cache TTL at the page level
> - a way to opt-in for prefetch on hover even with prefetch={false}


This would allow for setting a `pageTTL = 0` for calling the server on each & every navigation to always have fresh data.

<sub>[NEXT-1352](https://linear.app/vercel/issue/NEXT-1352/[bug]-nextlink-is-not-calling-the-server-for-subsequent-navigations-on)</sub>


---
**@Fredkiss3** commented on 2022-12-06T13:41:46Z

Any news yet about this feature ? 


---
**@zenflow** commented on 2022-12-14T22:21:11Z

I believe this proposal is to fix these issues:
- #42546 
- #43879

I am strongly in favor changing/fixing the rules of when soft vs hard navigation happens, to **support dynamic data on pages that have no dynamic segments**. You can see from the docs that soft navigation (i.e. client side cache) will always be used in this case (https://beta.nextjs.org/docs/routing/linking-and-navigating#conditions-for-soft-navigation) and there's no way to override this. There's effectively no way to bust the client side cache for these pages except a manual `router.refresh()`.

At the same time, I'm against the exact proposal. I'd prefer to keep rules for client-side caching (hard vs soft navigation) _separate/independent_ from rules for server-side caching (`dynamic='force-dynamic'`, `cache: 'no-store'`, etc). There seems to be some confusion around the fact that we are dealing with two separate caches and the proposed solution would definitely add to that, as well as make it more difficult learn and reason about how next.js is supposed to behave in whatever situation.

@leerob Can we have an option like `export const navigation = 'hard'` to force hard navigation on pages where it's needed?

---
**@Fredkiss3** commented on 2022-12-15T00:32:45Z

For sure, conceptually there are two caches, but to the developer who doesn’t understand NextJs RSC that deep it does not seem like it. I’ve read the docs more than 3 or 4 times, yet I didn’t see any mention of the two caches as separate, there is dynamic rendering, dynamic segments and dynamic functions which are very confusing. And for the longest time I thought they were all equivalent or similar.

As for adding a new option, this would confuse people more I think. Maybe it is the best for performance, but DX wise it is not ideal. And more, it would be difficult to wrap our head around how it would play with the rest of options (dynamic rendering, dynamic segments & functions). 

But IMO, when NextJs says in their doc that `export const dynamic="force-dynamic"` behaves like gSSP in pages directory I expect it to behave like it and rerender on page navigation, if not then the docs should precise that caveat and give us a way to make it behave exactly like gSSP. 

---
**@zenflow** commented on 2022-12-15T04:14:09Z

True that adding a new option might add some confusion in the sense that it's more cognitive overhead (more to learn from docs and think about for every page) and I think we definitely already have enough of that with app/ dir, so I definitely want to keep it as simple as possible. I have given it some more thought..

So the [Conditions for Soft Navigation](https://beta.nextjs.org/docs/routing/linking-and-navigating#conditions-for-soft-navigation) (new in app/ dir) is causing our problem, inaccurately trying to guess whether hard or soft nav is appropriate:

> On navigation, Next.js will use soft navigation if the route you are navigating to has been [prefetched](https://beta.nextjs.org/docs/routing/linking-and-navigating#prefetching), and either doesn't include [dynamic segments](https://beta.nextjs.org/docs/routing/defining-routes#dynamic-segments) or has the same dynamic parameters as the current route.
> 
> For example, ...

Why do these conditions even involve whether the page has dynamic segments or not? Does it make sense?
- (our problem) For pages without dynamic segments, we may or may not want to skip frontend cache, since these pages might also have dynamic data which we want/need to be fresh.
- (also) For pages with dynamic segments, we may or may not want to have frontend cache, since these pages might also have data which we don't need to be so fresh, and we can take advantage of client side cache to reduce requests to server.

The ideal solution IMO:
- soft vs hard navigation applied to pages regardless of dynamic segments or their params 
- static pages always use soft navigation (already the case i looks like, judging by [docs](https://beta.nextjs.org/docs/routing/linking-and-navigating#prefetching))
- dynamic pages default to hard navigation & can **opt in** to using soft navigation (i.e. client side cache) via `export const navigation = 'soft'` or some option like that

What do you think? There would be a new option, but you wouldn't have to use it or worry about it unless you wanted to optimize performance & reduce requests to server for a dynamic route, with using a feature that's new in app/ dir.

---
**@Fredkiss3** commented on 2022-12-15T07:11:25Z

I’m all in on your proposition 👍

---
**@njarraud** commented on 2022-12-22T23:14:29Z

The current state with hard/soft navigation as well as prefetch is still very buggy and I would love seeing the improvements stated above.

- `prefetch={false}` currently fully reloads the page (with loss of state that goes with). The SSR components also run twice (navigate from `homepage` to `page1` in example)
- In the documentation it is stated that soft navigation occurs `if the route you are navigating to has been prefetched, and either doesn't include dynamic segments or has the same dynamic parameters as the current route.` It is actually not fully true. Navigating from `page1` or `page2` to `page1/123`will actually perform a hard navigation but from `/` to `page1/123` does not (soft navigation).

Link to my simple example https://codesandbox.io/p/sandbox/nextjsappdirnav-d6clzo
I console log on the server when the SSR components are rendered.

- `page 1` links are `prefetch={false}`

Currently I cannot find a solution to force re-rendering SSR pages (hard navigation) as prefetch false is broken.

---
**@Fredkiss3** commented on 2022-12-22T23:30:53Z

@njarraud I don't remember where i've seen this but someone suggested to create a client component solely for the sake of refreshing the page, something like this : 

```tsx
// components/refresh-page
'use client';

import { useRouter } from 'next/navigation';

export function RefreshPage() {
  const router = useRouter();
  useEffect(() => {
      router.refresh();
  }, []);
  return null;
}

// page.tsx

export default function Page() {
  return (
   <>
      <RefreshPage />
       {/*... rest of your server-component code*/}
   </>
 )
}
```

But to be honest with you this workaround is not ideal.



---
**@njarraud** commented on 2022-12-23T00:55:05Z

Thanks. It kinda does the trick-ish as a quick and dirty temporary "fix".
It renders the page twice on first page load (production) and multiple times in dev. Just have to cross my fingers for a proper fix from the next team in the future.
