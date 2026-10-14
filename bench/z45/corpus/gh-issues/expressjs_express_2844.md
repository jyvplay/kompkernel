# is express dying?

**@TrejGun** opened on 2016-01-10T01:59:45Z

Since TJ left the project and it became "property" of StrongLoop the project is slowly dying.
I guess you (StrongLoop) promised TJ and thus a community to continue to maintain the code.
Sure you want to push part of express users to use yours solutions and to make money on support.
But open-source gave a start to your company and if you don't want to share back your code and time, just give a control back to community



---
**@aredridel** commented on 2016-01-10T07:09:24Z

What? Doug Wilson is doing a spectacular job of maintenance. One of the hardest working folks I've ever encountered in open source.


---
**@Knighton910** commented on 2016-01-10T07:29:00Z

I agree with @aredridel Doug wilson is always working his ass off. I'm a huge Tj fan @tj . I think what your comparing is, express when it was hot & it was the go to framework for Node.js , but now there are more frameworks vying for the attention of developers. I don't think you're completely off your rocker, but to each his own :smile:  :+1: 


---
**@TrejGun** commented on 2016-01-10T10:27:50Z

I know Doug Wilson was committing to express (and other TJ's project) since its beginning and i appreciate his work. However i don't know if he works for strongloop now and have less free time.

please, look at commits 
there are nothing except new npm versions and some docs since august and a very few before

PR for async route handlers was introduced in november and not merged yet
https://github.com/strongloop/express/pull/2809

release 5.0 was initiated on july but stale since november
https://github.com/strongloop/express/pull/2237


---
**@ghost** commented on 2016-01-10T11:06:39Z

You should check this out: https://github.com/strongloop/express/issues/2827


---
**@Twipped** commented on 2016-01-10T17:19:08Z

@TrejGun If the intent of your post is to shame strongloop, you _really_ need to mention strongloop in the post, because right now it looks like you're shitting all over @dougwilson's hard work.

Most of the bulk of Express' codebase has been refactored out into external dependencies, which Doug is constantly maintaining. That is why the only commits you see are npm version bumps, because he's updating for changes in those dependencies.  Express 5 will take this even further by [completely removing the routing engine from express core](https://github.com/pillarjs/router).  Look at [Doug's public timeline](https://github.com/dougwilson?tab=activity) and tell me that he isn't actively working on Express.

Doug is one of the hardest working OSS contributors in the NodeJS community. Comments such as yours not only undermine his massive efforts, but also contribute to developer burn out (which Doug has recently recovered from).  You are not helping with the problem, @TrejGun, you're making it worse.


---
**@dougwilson** commented on 2016-01-10T19:59:10Z

Hi everyone, reading @TrejGun 's initial post, it doesn't sound directed to me, more directed to the project/StrongLoop/IBM. Thanks for the kind works, everyone, I really want to see the continued success of Express, but the situation of the project ownership makes this extremely difficult.

I am working with IBM to find a good path forward.


---
**@NetOpWibby** commented on 2016-01-10T20:19:51Z

Yikes!

Express is awesome. I don't understand why StrongLoop/IBM won't speak, that's absurd.


---
**@tj** commented on 2016-01-10T20:37:03Z

FWIW projects don't _have_ to change in order to be good. Nothing wrong with a project finding its place and staying relatively put. I haven't been following what's going on with Express, that might not even be the case but that's my opinion. 

