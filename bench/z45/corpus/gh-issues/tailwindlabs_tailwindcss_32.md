# Grid support

**@kylemilloy** opened on 2017-11-01T19:52:06Z

Support for `display: grid;` and its props would be swell.


---
**@reinink** commented on 2017-11-01T20:12:46Z

We had originally planned to ship grid utilities, but it turns out browser support is still not there. In fact, grid in IE10/11 is a dumpster fire. At this point we only want to add utilities to Tailwind that can be safety used. Here is a comment from an [earlier PR](https://github.com/tailwindcss/tailwindcss/pull/22):

> Hmm, tricky. I think our current approach makes a lot of sense. I see a ton of value in Tailwind only offering utilities that are practical to use given today's browser support. This is the exact same reason we're not including grid classes in the core right now. I could see things like grid being added as optional extensions (which is actually the plan), but not included in core until they have a sufficient amount of browser support.
> 
> One thing you can obviously do is create your own utilities if you want to use these. Check out this doc page for more info: https://tailwindcss.com/docs/adding-new-utilities

That said, we are planning to add an optional extension to Tailwind for grid for those living on the bleeding edge. Then, long term, that will likely be merged in and become part of Tailwind core.

I'd recommend simply using flex to build your grids at this point. It's wonderfully easy with the sizing helpers. For example, to create a three column grid with a gutter, you could do this:

```html
<div class="flex flex-wrap -mx-4">
    <div class="w-1/3 px-4"></div>
    <div class="w-1/3 px-4"></div>
    <div class="w-1/3 px-4"></div>
    <div class="w-1/3 px-4"></div>
    <div class="w-1/3 px-4"></div>
    <div class="w-1/3 px-4"></div>
    <div class="w-1/3 px-4"></div>
    <div class="w-1/3 px-4"></div>
</div>
```

---
**@kylemilloy** commented on 2017-11-01T20:15:35Z

I think you mean `<div class="flex flex-wrap -mx-4">` ;)

Cool...wouldn't mind contributing to a fork to figure that out. 

---
**@reinink** commented on 2017-11-01T20:16:00Z

Frig, yes, I'll update that. Been a long couple of days.

---
**@jackmcdade** commented on 2017-11-01T22:38:21Z

Yeah but who uses IE10/11? :)

---
**@reinink** commented on 2017-11-01T22:38:55Z

@jackmcdade TOO MANY PEOPLE 😭 

---
**@jackmcdade** commented on 2017-11-01T22:40:04Z

I must be delightfully isolated then, I haven't supported IE in years with Statamic and have had exactly zero complaints. Interesting!

---
**@reinink** commented on 2017-11-01T22:41:24Z

Really eh? According to [this website](http://gs.statcounter.com/browser-market-share/all/united-states-of-america), IE usage is still at 6.72%. Depressing.

![image](https://user-images.githubusercontent.com/882133/32301418-3d88dc58-bf34-11e7-8623-cae79559c5c3.png)


---
**@jackmcdade** commented on 2017-11-01T22:42:43Z

In my experience that's generally low enough on a product where you can say "We support the latest cross-platform browsers" and be fine. Those 6% are often not people who would ever be in the market for some of things we build.
