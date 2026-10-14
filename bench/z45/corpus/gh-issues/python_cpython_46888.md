# Adding a new regex module (compatible with re)

**@f0c60cc3-3318-4c1a-b471-b3af1d161d69** opened on 2008-04-15T11:57:51Z

BPO | [2636](https://bugs.python.org/issue2636)
--- | :---
Nosy | @loewis, @birkenfeld, @gpshead, @amauryfa, @ncoghlan, @abalkin, @pitrou, @vstinner, @giampaolo, @mark-summerfield, @ssbr, @ezio-melotti, @akitada, @stevendaprano, @alex, @bitdancer, @sandrotosi, @sorcio, @ericsnowcurrently, @Fak3, @serhiy-storchaka, @jayvdb
Files | <li>[regex_test-20100316](https://bugs.python.org/file16563/regex_test-20100316 "Uploaded as application/octet-stream at 2010-03-16.15:56:36 by moreati"): Python 2.6.5 re test run against regex-20100305</li><li>[issue2636-20101230.zip](https://bugs.python.org/file20192/issue2636-20101230.zip "Uploaded as application/x-zip-compressed at 2010-12-30.02:25:56 by mrabarnett")</li><li>[remove_guards.diff](https://bugs.python.org/file20203/remove_guards.diff "Uploaded as text/plain at 2010-12-31.09:23:52 by jacques")</li>

<sup>*Note: these values reflect the state of the issue at the time it was migrated and might not reflect the current state.*</sup>

<details><summary>Show more details</summary><p>

GitHub fields:
```python
assignee = None
closed_at = <Date 2021-01-25.22:30:27.300>
created_at = <Date 2008-04-15.11:57:51.375>
labels = ['expert-regex', 'type-feature', 'library']
title = 'Adding a new regex module (compatible with re)'
updated_at = <Date 2021-01-25.22:30:27.294>
user = 'https://bugs.python.org/timehorse'
```

bugs.python.org fields:
```python
activity = <Date 2021-01-25.22:30:27.294>
actor = 'vstinner'
assignee = 'none'
closed = True
closed_date = <Date 2021-01-25.22:30:27.300>
closer = 'vstinner'
components = ['Library (Lib)', 'Regular Expressions']
creation = <Date 2008-04-15.11:57:51.375>
creator = 'timehorse'
dependencies = []
files = ['16563', '20192', '20203']
hgrepos = ['108']
issue_num = 2636
keywords = ['patch']
message_count = 334.0
messages = ['65513', '65593', '65613', '65614', '65617', '65725', '65726', '65727', '65734', '65838', '65841', '66033', '67309', '67447', '67448', '68336', '68339', '68358', '68399', '68409', '73185', '73295', '73714', '73717', '73721', '73730', '73752', '73766', '73779', '73780', '73782', '73791', '73794', '73798', '73801', '73803', '73805', '73827', '73848', '73853', '73854', '73855', '73861', '73875', '73955', '74025', '74026', '74058', '74104', '74174', '74203', '74204', '74904', '80916', '81112', '81236', '81238', '81239', '81240', '81359', '81473', '81475', '82673', '82739', '82950', '83271', '83277', '83390', '83411', '83427', '83428', '83429', '83988', '83989', '83993', '84350', '86004', '86032', '89632', '89634', '89643', '90954', '90961', '90985', '90986', '90989', '91028', '91035', '91038', '91245', '91250', '91437', '91439', '91448', '91450', '91460', '91462', '91463', '91473', '91474', '91490', '91495', '91496', '91497', '91500', '91535', '91598', '91607', '91610', '91671', '91917', '97860', '98809', '99072', '99132', '99148', '99186', '99190', '99462', '99470', '99479', '99481', '99494', '99548', '99552', '99665', '99668', '99835', '99863', '99872', '99888', '99890', '99892', '100066', '100076', '100080', '100134', '100152', '100359', '100362', '100370', '100452', '101172', '101181', '101193', '101557', '102042', '103003', '103060', '103064', '103078', '103095', '103096', '103097', '109358', '109363', '109372', '109384', '109401', '109403', '109404', '109405', '109406', '109407', '109408', '109409', '109410', '109413', '109447', '109460', '109461', '109463', '109474', '109657', '110233', '110237', '110701', '110704', '110761', '111519', '111531', '111643', '111652', '111656', '111660', '111921', '113927', '113931', '114034', '114766', '116133', '116151', '116223', '116227', '116229', '116231', '116238', '116248', '116252', '116276', '116749', '117008', '117046', '117050', '118243', '118631', '118636', '118640', '118674', '118682', '119887', '119930', '119947', '119951', '119956', '119958', '120013', '120037', '120038', '120164', '120202', '120203', '120204', '120206', '120215', '120216', '120243', '120571', '120969', '120976', '120984', '120986', '121136', '121145', '121149', '121589', '121832', '122221', '122225', '122228', '122880', '123518', '123527', '123747', '124581', '124582', '124585', '124614', '124626', '124627', '124746', '124750', '124759', '124816', '124821', '124833', '124834', '124891', '124900', '124904', '124905', '124906', '124909', '124912', '124929', '124931', '124936', '124950', '124959', '124971', '124988', '124990', '125291', '126294', '126372', '127045', '130886', '130905', '130906', '130999', '135700', '135703', '135704', '140102', '140152', '140154', '143090', '143333', '143334', '143337', '143340', '143343', '143350', '143352', '143355', '143366', '143367', '143374', '143377', '143389', '143423', '143442', '143445', '143447', '143448', '143467', '143471', '143619', '144110', '152210', '152211', '152212', '152214', '152215', '152217', '152218', '152246', '157445', '174888', '221629', '221657', '230846', '230862', '230866', '230867', '230873', '230877', '230885', '230887', '231137', '231141', '231159', '231165', '385674']
nosy_count = 43.0
nosy_names = ['loewis', 'georg.brandl', 'gregory.p.smith', 'jimjjewett', 'sjmachin', 'amaury.forgeotdarc', 'ncoghlan', 'belopolsky', 'pitrou', 'vstinner', 'nneonneo', 'giampaolo.rodola', 'rsc', 'timehorse', 'mark', 'vbr', 'Devin Jeanpierre', 'ezio.melotti', 'mrabarnett', 'jaylogan', 'akitada', 'moreati', 'steven.daprano', 'alex', 'r.david.murray', 'jacques', 'zdwiel', 'THRlWiTi', 'sandro.tosi', 'abacabadabacaba', 'stiv', 'davide.rizzo', 'mattchaput', 'ronnix', 'tshepang', 'eric.snow', 'akoumjian', 'Roman.Evstifeev', 'serhiy.storchaka', 'Mateon1', 'jayvdb', 'Socob', 'petros']
pr_nums = []
priority = 'normal'
resolution = 'rejected'
stage = 'resolved'
status = 'closed'
superseder = None
type = 'enhancement'
url = 'https://bugs.python.org/issue2636'
versions = []
```

</p></details>



---
**@f0c60cc3-3318-4c1a-b471-b3af1d161d69** commented on 2008-04-15T11:57:48Z

I am working on adding features to the current Regexp implementation,
which is now set to 2.2.2.  These features are to bring the Regexp code
closer in line with Perl 5.10 as well as add a few python-specific
niceties and potential speed-ups and clean-ups.

I will be posting regular patch updates to this thread when major
milestones have been reach with a description of the feature(s) added. 
Currently, the list of proposed changes are (in no particular order):

1) Fix \<a href="http://bugs.python.org/issue433030"\>bpo-433030\</a\> by
adding support for Atomic Grouping and Possessive Qualifiers

2) Make named matches direct attributes of the match object; i.e.
instead of m.group('foo'), one will be able to write simply m.foo.

3) (maybe) make Match objects subscriptable, such that m[n] is
equivalent to m.group(n) and allow slicing.

4) Implement Perl-style back-references including relative back-references.

5) Add a well-formed, python-specific comment modifier, e.g. (?P#...);
the difference between (?P#...) and Perl/Python's (?#...) is that the
former will allow nested parentheses as well as parenthetical escaping,
so that patterns of the form '(?P# Evaluate (the following) expression,
3\\) using some other technique)'.  The (?P#...) will interpret this
entire expression as a comment, where as with (?#...) only, everything
following ' expression...' would be considered part of the match. 
(?P#...) will necessarily be slower than (?#...) and so only should be
used if richer commenting style is required but the verbose mode is not
desired.

6) Add official support for fast, non-repeating capture groups with the
Template option.  Template is unofficially supported and disables all
repeat operators (*, + and ?).  This would mainly consist of documenting
its behavior.

7) Modify the re compiled expression cache to better handle the
thrashing condition.  Currently, when regular expressions are compiled,
the result is cached so that if the same expression is compiled again,
it is retrieved from the cache and no extra work has to be done.  This
cache supports up to 100 entries.  Once the 100th entry is reached, the
cache is cleared and a new compile must occur.  The danger, all be it
rare, is that one may compile the 100th expression only to find that one
recompiles it and has to do the same work all over again when it may
have been done 3 expressions ago.  By modifying this logic slightly, it
is possible to establish an arbitrary counter that gives a time stamp to
each compiled entry and instead of clearing the entire cache when it
reaches capacity, only eliminate the oldest half of the cache, keeping
the half that is more recent.  This should limit the possibility of
thrashing to cases where a very large number of Regular Expressions are
continually recompiled.  In addition to this, I will update the limit to
256 entries, meaning that the 128 most recent are kept.

8) Emacs/Perl style character classes, e.g. [:alphanum:].  For instance,
:alphanum: would not include the '\_' in the character class.

9) C-Engine speed-ups.  I commenting and cleaning up the \_sre.c Regexp
engine to make it flow more linearly, rather than with all the current
gotos and replace the switch-case statements with lookup tables, which
in tests have shown to be faster.  This will also include adding many
more comments to the C code in order to make it easier for future
developers to follow.  These changes are subject to testing and some
modifications may not be included in the final release if they are shown
to be slower than the existing code.  Also, a number of Macros are being
eliminated where appropriate.

10) Export any (not already) shared value between the Python Code and
the C code, e.g. the default Maximum Repeat count (65536); this will
allow those constants to be changed in 1 central place.

11) Various other Perl 5.10 conformance modifications, TBD.


More items may come and suggestions are welcome.

\-----

Currently, I have code which implements 5) and 7), have done some work
on 10) and am almost 9).  When 9) is complete, I will work on 1), some
of which, such as parsing, is already done, then probably 8) and 4)
because they should not require too much work -- 4) is parser-only
AFAICT.  Then, I will attempt 2) and 3), though those will require
changes at the C-Code level.  Then I will investigate what additional
elements of 11) I can easily implement.  Finally, I will write
documentation for all of these features, including 6).

In a few days, I will provide a patch with my interim results and will
update the patches with regular updates when Milestones are reached.

---
**@f0c60cc3-3318-4c1a-b471-b3af1d161d69** commented on 2008-04-17T22:06:58Z

I am very sorry to report (at least for me) that as of this moment, item 
9), although not yet complete, is stable and able to pass all the 
existing python regexp tests.  Because these tests are timed, I am using 
the timings from the first suite of tests to perform a benchmark of 
performance between old and new code.  Based on discussion with Andrew 
Kuchling, I have decided for the sake of simplicity, the "timing" of 
each version is to be calculated by the absolute minimum time to execute 
observed because it is believed this execution would have had the most 
continuous CPU cycles and thus most closely represents the true 
execution time.

It is this current conclusion that greatly saddens me, not that the 
effort has not been valuable in understanding the current engine.  
Indeed, I understand the current engine now well enough that I could 
proceed with the other modifications as-is rather than implementing them 
with the new engine.  Mind you, I will likely not bring over the copious  
comments that the new engine received when I translated it to a form 
without C_Macros and gotos, as that would require too much effort IMHO.

Anyway, all that being said, and keeping in mind that I am not 100% 
satisfied with the new engine and may still be able to wring some timing 
out of it -- not that I will spend much more time on this -- here is 
where we currently stand:

Old Engine: 6.574s
New Engine: 7.239s

This makes the old Engine 665ms faster over the entire first test_re.py 
suite, or 9% faster than the New Engine.

---
**@f0c60cc3-3318-4c1a-b471-b3af1d161d69** commented on 2008-04-18T13:38:47Z

Here are the modification so far for item 9) in \_sre.c plus some small
modifications to sre_constants.h which are only to get \_sre.c to
compile; normally sre_constants.h is generated by sre_constants.py, so
this is not the final version of that file.  I also would have intended
to make SRE_CHARSET and SRE_COUNT use lookup tables, as well as maybe
others, but not likely any other lookup tables.  I also want to remove
alloc_pos out of the self object and make it a parameter to the ALLOC
parameter and probably get rid of the op_code attribute since it is only
used in 1 place to save one subtract in a very rare case.  But I want to
resolve the 10% problem first, so would appreciate it if people could
look at the REMOVE_SRE_MATCH_MACROS section of code and compare it to
the non-REMOVE_SRE_MATCH_MACROS version of SRE_MATCH and see if you can
suggest anything to make the former (new code) faster to get me that
elusive 10%.

---
**@f0c60cc3-3318-4c1a-b471-b3af1d161d69** commented on 2008-04-18T14:23:18Z

Here is a patch to implement item 7)

---
**@f0c60cc3-3318-4c1a-b471-b3af1d161d69** commented on 2008-04-18T14:50:44Z

This simple patch adds (?P#...)-style comment support.

---
**@74c4563b-ab1c-43d8-9219-30c4eca796bc** commented on 2008-04-24T14:23:34Z

> These features are to bring the Regexp code closer in line with Perl 5.10

Why 5.1 instead of 5.8 or at least 5.6?  Is it just a scope-creep issue?

> as well as add a few python-specific

because this also adds to the scope.


> 2) Make named matches direct attributes 
> of the match object; i.e. instead of m.group('foo'), 
> one will be able to write simply m.foo.

> 3) (maybe) make Match objects subscriptable, such 
> that m[n] is equivalent to m.group(n) and allow slicing.

(2) and (3) would both be nice, but I'm not sure it makes sense to do 
\*both* instead of picking one.

> 5) Add a well-formed, python-specific comment modifier, 
> e.g. (?P#...);  

[handles parens in comments without turning on verbose, but is slower]

Why?  It adds another incompatibility, so it has to be very useful or 
clear.  What exactly is the advantage over just turning on verbose?

> 9) C-Engine speed-ups. ...
> a number of Macros are being eliminated where appropriate.

Be careful on those, particular on str/unicode and different compile options.

---
**@amauryfa** commented on 2008-04-24T14:31:53Z

> \> These features are to bring the Regexp code closer in line 
> \> with Perl 5.10
> 
> Why 5.1 instead of 5.8 or at least 5.6?  Is it just a scope-creep issue?

5.10.0 comes after 5.8 and is the latest version (2007/12/18)! 
Yes it is confusing.

---
**@f0c60cc3-3318-4c1a-b471-b3af1d161d69** commented on 2008-04-24T16:06:23Z

Thanks Jim for your thoughts!

Armaury has already explained about Perl 5.10.0.  I suppose it's like
Macintosh version numbering, since Mac Tiger went from version 10.4.9 to
10.4.10 and 10.4.11 a few years ago.  Maybe we should call Python 2.6
Python 2.06 just in case.  But 2.6 is the known last in the 2 series so
it's not a problem for us!  :)

>\> as well as add a few python-specific
>
> because this also adds to the scope.

At this point the only python-specific changes I am proposing would be
items 2, 3 (discussed below), 5 (discussed below), 6 and 7.  6 is only a
documentation change, the code is already implemented.  7 is just a
better behavior.  I think it is RARE one compiles more than 100 unique
regular expressions, but you never know as projects tend to grow over
time, and in the old code the 101st would be recompiled even if it was
just compiled 2 minutes ago.  The patch is available so I leave it to
the community to judge for themselves whether it is worth it, but as you
can see, it's not a very large change.

>\> 2) Make named matches direct attributes 
>\> of the match object; i.e. instead of m.group('foo'), 
>\> one will be able to write simply m.foo.
>
>\> 3) (maybe) make Match objects subscriptable, such 
>\> that m[n] is equivalent to m.group(n) and allow slicing.
>
> (2) and (3) would both be nice, but I'm not sure it makes sense to do 
> \*both* instead of picking one.

Well, I think named matches are better than numbered ones, so I'd
definitely go with 2.  The problem with 2, though, is that it still
leaves the rather typographically intense m.group(n), since I cannot
write m.3.  However, since capture groups are always numbered
sequentially, it models a list very nicely.  So I think for indexing by
group number, the subscripting operator makes sense.  I was not
originally suggesting m['foo'] be supported, but I can see how that may
come out of 3.  But there is a restriction on python named matches that
they have to be valid python and that strikes me as 2 more than 3
because 3 would not require such a restriction but 2 would.  So at least
I want 2, but it seems IMHO m[1] is better than m.group(1) and not in
the least hard or a confusing way of retrieving the given group.  Mind
you, the Match object is a C-struct with python binding and I'm not
exactly sure how to add either feature to it, but I'm sure the C-API
manual will help with that.

>\> 5) Add a well-formed, python-specific comment modifier, 
>\> e.g. (?P#...);  
>
> [handles parens in comments without turning on verbose, but is slower]
>
> Why?  It adds another incompatibility, so it has to be very useful or 
> clear.  What exactly is the advantage over just turning on verbose?

Well, Larry Wall and Guido agreed long ago that we, the python
community, own all expressions of the form (?P...) and although I'd be
my preference to make (?#...) more in conformance with understanding
parenthesis nesting, changing the logic behind THAT would make python
non-standard.  So as far as any conflicting design, we needn't worry.

As for speed, the this all occurs in the parser and does not effect the
compiler or engine.  It occurs only after a (?P has been read and then
only as the last check before failure, so it should not be much slower
except when the expression is invalid.  The actual execution time to
find the closing brace of (?P#...) is a bit slower than that for (?#...)
but not by much.

Verbose is generally a good idea for anything more than a trivial
Regular Expression.  However, it can have overhead if not included as
the first flag: an expression is always checked for verbose
post-compilation and if it is encountered, the expression is compiled a
second time, which is somewhat wasteful.  But the reason I like the
(?P#...) over (?#...) is because I think people would more tend to assume:

r'He(?# 2 (TWO) ls)llo' should match "Hello" but it doesn't.

That expression only matches "He ls)llo", so I created the (?P#...) to
make the comment match type more intuitive:

r'He(?P# 2 (TWO) ls)llo' matches "Hello".

>\> 9) C-Engine speed-ups. ...
>\> a number of Macros are being eliminated where appropriate.
>
> Be careful on those, particular on str/unicode and different
> compile options.

Will do; thanks for the advice!  I have only observed the UNICODE flag
controlling whether certain code is used (besides the ones I've added)
and have tried to stay true to that when I encounter it.  Mind you,
unless I can get my extra 10% it's unlikely I'd actually go with item 9
here, even if it is easier to read IMHO.  However, I want to run the new
engine proposal through gprof to see if I can track down some bottlenecks.

At some point, I hope to get my current changes on Launchpad if I can
get that working.  If I do, I'll give a link to how people can check out
my working code here as well.
