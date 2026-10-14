# Consider using system trust stores by default in 3.0.0.

**@Lukasa** opened on 2016-01-11T17:15:47Z

It's been raised repeatedly, mostly by people using Linux systems, that it's annoying that requests doesn't use the system trust store and instead uses the one that certifi ships. This is an understandable position. I have some personal attachment to the certifi approach, but the other side of that argument definitely has a reasonable position too. For this reason, I'd like us to look into whether we should use the system trust store by default, and make certifi's bundle a fallback option.

I have some caveats here:
1. If we move to the system trust store, we must do so on _all_ platforms: Linux must not be its own special snowflake.
2. We must have broad-based support for Linux and Windows.
3. We must be able to fall back to certifi cleanly.

Right now it seems like the best route to achieving this would be to use [certitude](https://github.com/python-hyper/certitude). This currently has support for dynamically generating the cert bundle OpenSSL needs directly from the system keychain on OS X. If we added Linux and Windows support to that library, we may have the opportunity to switch to using certitude.

Given @kennethreitz's bundling policy, we probably cannot unconditionally switch to certitude, because certitude depends on cryptography (at least on OS X). However, certitude could take the current privileged position that certifi takes, or be a higher priority than certifi, as an optional dependency that is used if present on the system.

Thoughts? This is currently a RFC, so please comment if you have opinions. /cc @sigmavirus24 @alex @kennethreitz @dstufft @glyph @reaperhulk @morganfainberg



---
**@dstufft** commented on 2016-01-11T17:37:49Z

I think the system trust stores (or not) essentially boils down to whether you want requests to act the same across platforms, or whether you want it to act in line with the platform it is running on. I do not think that _either_ of these options are wrong (or right), just different trade offs.

I think that it's not as simple on Windows as it is on Linux or OSX (although @tiran might have a better idea). I _think_ that Windows doesn't ship with all of the certificates available and you have to do something (use WinHTTP?) to get it to download any additional certificates on demand. I think that means that a brand new Windows install, if you attempt to dump the certificate store will be missing a great many certificates.

On Linux, you still have the problem that there isn't one single set location for the certificate files, the best you can do is try to heuristically guess at where it might be. This gets better on Python 2.7.9+ and Python  3.4+ since you can use `ssl.get_default_verify_paths()` to get what the default paths are, but you can't rely on that unless you drop 2.6, 2.7.8, and 3.3. In pip we attempt to discover the location of the system trust store (just by looping over some common file locations) and if we can't find it we fall back to certifi, and one problem that has come up is that sometimes we'll find a location, but it's an old outdated copy that isn't being updated by anything. People then get really confused because it works in their browser, it works with requests, but it doesn't in pip.

I assume the fall back to certifi ensures that things will still work correctly on platforms that either don't ship certificates at all, or don't ship them by default and they aren't installed? If so, that's another possible niggle here that you'd want to think about. Some platforms, like say FreeBSD, don't ship them by default at all. So it's possible that people will have a requests using thing running just fine without the FreeBSD certificates installed, and they then install them (explicitly or implicitly) and suddenly they trust something different and the behavior of the program changes.

Anyways, the desire seems reasonable to me and, if all of the little niggles get worked out, it really just comes down to a question of if requests wants to fall on the side of "fitting in" with a particular platform, or if it wants to prefer cross platform uniformity.


---
**@glyph** commented on 2016-01-11T21:28:45Z

> I think the system trust stores (or not) essentially boils down to whether you want requests to act the same across platforms, or whether you want it to act in line with the platform it is running on. I do not think that either of these options are wrong (or right), just different trade offs.

I wouldn't say that either option is _completely_ wrong, but I do think that using the platform trust store is significantly right-er, due to the availability of tooling to adjust trust roots on the platform and the relative unavailability of any such tooling for requests or certifi.  If you go into Keychain Access to add an anchor (or the Windows equivalent) nothing about requests makes it seem like it would be special, that it would be using a different set of trust roots than you had already configured for everything else.


---
**@dstufft** commented on 2016-01-11T21:36:34Z

It depends if your audience are people who are familiar with a particular platform or not. I have no idea how to manage the trust store on Windows but I know how to manage the trust store for requests because requests currently chooses being internally consistent cross platform over being externally consistent with any particular platform. 

IOW this change makes it easier for people who are familiar with the system the software is running on at the cost of people who are not. 

Sent from my iPhone

> On Jan 11, 2016, at 4:29 PM, Glyph notifications@github.com wrote:
> 
> I wouldn't say that either option is completely wrong, but I do think that using the platform trust store is significantly right-er


---
**@glyph** commented on 2016-01-11T21:58:46Z

> IOW this change makes it easier for people who are familiar with the system the software is running on at the cost of people who are not.

In the abstract, I disagree.  Of course, we may have distribution or build toolchain issues which make people have to care about this fact, but if it works _properly_ (`pip install`s without argument, doesn't require C compiler shenanigans for the end user) then what is the penalty to people who are not familiar with the platform?


---
**@dstufft** commented on 2016-01-11T22:07:50Z

It forces them to learn the differences of every platform they are running on. 

Sent from my iPhone

> On Jan 11, 2016, at 4:59 PM, Glyph notifications@github.com wrote:
> 
> what is the penalty to people who are not familiar with the platform?


---
**@tempusfrangit** commented on 2016-01-11T22:16:40Z

So I am in favour of using the system store in general because in most cases [outside of dev] if you're relying on requests or a similar library you're going to expect it to work similar to the rest of the system/tooling. Asking someone to learn the tooling for the system they are deploying on is not unreasonable. If an application uses requests and needs to trust a specific cert (end-user story here), it is usual that it'll handle the installation for that platform at install time (aka OS X or Windows). 

From a developer perspective, it becomes a little more difficult but still not insurmountable as long as we approach this in a way that the developer has clear methods to continue with the same behaviour as today.

As discussed in IRC, perhaps the easiest method to ensure sanity is to really finish up and polish certitude(? was this the tool discussed?) so we can encapsulate the platform/system-specifics clearly and try and ensure requests logic is the same on all of the platforms.


---
**@glyph** commented on 2016-01-11T22:21:21Z

> It forces them to learn the differences of every platform they are running on.

How so? By default, it ought to get the trust roots you expect on every platform. It's not like I need to learn new and exciting things when I launch Safari vs. IE just to type `https://`...


---
**@glyph** commented on 2016-01-11T22:22:45Z

> I think that it's not as simple on Windows as it is on Linux or OSX (although @tiran might have a better idea). I think that Windows doesn't ship with all of the certificates available and you have to do something (use WinHTTP?) to get it to download any additional certificates on demand. I think that means that a brand new Windows install, if you attempt to dump the certificate store will be missing a great many certificates.

You are right about this.  I have verified it on my nearly-pristine Windows VM; in a Python prompt, I do:

``` python
>>> import wincertstore
>>> print(len(list(wincertstore.CertSystemStore("ROOT"))))
```

and get "21".  Visit some HTTPS websites, up-arrow/enter in the python interpreter, and now I get "23".

