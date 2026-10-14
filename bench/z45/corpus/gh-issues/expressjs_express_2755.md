# Should Express 5.0 require a minimum of Node.js 4?

**@dougwilson** opened on 2015-09-12T16:41:29Z

This is a discussion regarding having Express 5.0 drop support for Node.js 0.10. One of the reasons for the delay in Express 5.0 was the announcement of the official merging of Node.js and io.js, and we were looking forward to it's outcome to determine what we should do with Express 5.0.

Here at Express, we value very long-lived major versions, allowing users to confidentially build their new server on Express and not have to worry about needing to upgrade across a major, breaking change for years. Express 4.0 has been out for over a year now and Express 3.0 was supported for over 3 years !!

When Express 5.0 comes out, Express 4.x line will continue to be fully supported, delivering our users bug fixes, new features, and more!

To this end, we have been carefully watching io.js/Node.js in relation to Express 5.0 such that we can continue this great support history without accidentally locking us into the past for a long time.

Please share your thoughts here.



---
**@Fishrock123** commented on 2015-09-12T16:50:26Z

Fwiw 0.10 will be EOL'd October 2016, and 0.12 at the end of year, 2016.

The former is already in maintenance mode, and 0.12 will go into maintenance-only next April. 0.12's EOL was cut short due to OpenSSL ending support for 1.0.1 at end-of-year 2016.

More info: https://github.com/nodejs/LTS (Slightly outdated)

I'd personally vote for yes (biased I suppose), and try to encourage a larger move to 4.0.0 sooner than later for users.


---
**@Twipped** commented on 2015-09-12T23:09:59Z

Dropping 0.10 for 5.0 sounds good to me. Express 4 isn't that different, right?


---
**@alanpurple** commented on 2015-09-13T13:51:31Z

+1
drop support for 0.10


---
**@hacksparrow** commented on 2015-09-13T14:01:39Z

Highly in favor of dropping support for 0.10.


---
**@talon** commented on 2015-09-13T18:43:18Z

Open source should move as fast as possible w/ option for sponsored LTS. Drop it.


---
**@aredridel** commented on 2015-09-14T03:03:16Z

What's the cost of not dropping 0.10?


---
**@andineck** commented on 2015-09-14T08:04:08Z

Moving forward to node 4.0 seems more important than supporting 0.10


---
**@dougwilson** commented on 2015-09-14T13:59:21Z

So, just to be clear: Express 5.x dropping support for Node.js 0.10 does not mean _Express_ will drop support for Node.js 0.10. Just like Express 3.x has lived in parallel with Express 4.x for almost 2 years now, Express 4.x will continue to live alongside Express 5.x.

To answer @aredridel , not dropping 0.10 from Express 5.x means that 5.x would be hard-pressed to consume and support various features in the newer V8 and Node.js platform (things like Intl, generators, promises, and more). Because we want to make longtivity promises, this means that once Express 5.0 comes out, an Express 6.0 is unlikely to appear until 1 year or more later, putting it further behind the curve.

Here is a little mock-up support example:

```
Year             0      1      2      3      4      5      6

Express 3 (0.8 ) +--------------------+
Express 4 (0.10)               +--------------------+
Express 5 (4?  )                      +--------------------+
```

Typically we'll have 2 active Express majors at a time (more than that gets harder, and the benefit decreases). The idea is that we can then perhaps up the minimum Node.js version with a major, since the previous major will still be around for a long time to come after the release. If you look back at the history of the 3.x line while 4.x has existed, we continued to backport every single new feature from Express 4.x into 3.x that was possible with 3.x's design. We intend to do the same with 4.x/5.x, which means 4.x will keep up; the release of 5.x does not move 4.x into "maintenance mode", either.

