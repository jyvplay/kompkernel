# Specify password for SSL client side certificate

**@botondus** opened on 2013-09-03T13:14:44Z

As far as I know currently it's not possible to specify the password for the client side certificate you're using for authentication.
This is a bit of a problem because you typically always want to password protect your .pem file which contains the private key. `openssl` won't even let you create one without a password.



---
**@botondus** commented on 2013-09-03T13:16:56Z

Something like:

`requests.get('https://kennethreitz.com', cert='server.pem', cert_pw='my_password')`


---
**@sigmavirus24** commented on 2013-09-03T13:55:59Z

Pretty sure you're supposed to use the `cert` param for that: `cert=('server.pem', 'my_password')`


---
**@t-8ch** commented on 2013-09-03T14:46:38Z

@sigmavirus24 
The tuple is for `(certificate, key)`. Currently there is no support for encrypted keyfiles.
The [stdlib](file:///usr/share/doc/python/html/library/ssl.html#ssl.SSLContext.load_cert_chain) only got support for those in version 3.3.


---
**@Lukasa** commented on 2013-09-03T15:05:15Z

Heh, @t-8ch, you accidentally linked to a file on your local FS. ;) [Correct link](http://docs.python.org/3.3/library/ssl.html#ssl.SSLContext.load_cert_chain).


---
**@sigmavirus24** commented on 2013-09-04T02:43:57Z

Quite right @t-8ch. This is why I should never answer issues from the bus. :/


---
**@Lukasa** commented on 2013-09-04T05:31:45Z

So the current consensus is we don't support this. How much work is it likely to be to add support in non-3.3 versions of Python?


---
**@sdog869** commented on 2014-02-18T05:06:30Z

How hard would it be to throw an error on this condition? I just ran into this silly problem and it took two hours to figure out, it would be nice if it would throw an error, it currently just sits there looping. Thanks for the awesome library!


---
**@Lukasa** commented on 2014-02-18T08:39:40Z

Wait, it sits where looping? Where in execution do we fail? Can you print the traceback from where we loop?

