# Support some non-structural (nominal) type matching

**@iislucas** opened on 2014-07-22T23:52:21Z

Proposal: support non-structural typing (e.g. new user-defined base-types, or some form of basic nominal typing). This allows programmer to have more refined types supporting frequently used idioms such as: 

1) Indexes that come from different tables. Because all indexes are strings (or numbers), it's easy to use the an index variable (intended for one table) with another index variable intended for a different table. Because indexes are the same type, no error is given. If we have abstract index classes this would be fixed.

2) Certain classes of functions (e.g. callbacks) can be important to be distinguished even though they have the same type. e.g. "() => void" often captures a side-effect producing function. Sometimes you want to control which ones are put into an event handler. Currently there's no way to type-check them. 

3) Consider having 2 different interfaces that have different optional parameters but the same required one. In typescript you will not get a compiler error when you provide one but need the other. Sometimes this is ok, but very often this is very not ok and you would love to have a compiler error rather than be confused at run-time.

Proposal (with all type-Error-lines removed!): 

```
// Define FooTable and FooIndex
nominal FooIndex = string;  // Proposed new kind of nominal declaration.
interface FooTable {
  [i: FooIndex]: { foo: number };
}
let s1: FooIndex;
let t1: FooTable;

// Define BarTable and BarIndex
nominal BarIndex = string; // Proposed new kind of nominal declaration.
interface BarTable {
  [i: BarIndex]: { bar: string };
}
let s2: BarIndex;
let t2: BarTable;

// For assignment from base-types and basic structures: no type-overloading is needed.
s1 = 'foo1';
t1 = {};
t1[s1] = { foo: 1 };

s2 = 'bar1';
t2 = { 'bar1': { bar: 'barbar' }};

console.log(s2 = s1); // Proposed to be type error.
console.log(s2 == s1); // Proposed to be type error.
console.log(s2 === s1); // Proposed to be type error.

t1[s2].foo = 100; // Gives a runtime error. Proposed to be type error.
t1[s1].foo = 100;

function BadFooTest(t: FooTable) {
  if (s2 in t) {  // Proposed to be type error.
    console.log('cool');
    console.log(t[s2].foo); // Proposed to be type error.
  }
}

function GoodBarTest(t: BarTable) {
  if (s2 in t) {
    console.log('cool');
    console.log(t[s2].bar);
  }
}

BadFooTest(t1); // Gives runtime error;
BadFooTest(t2); // No runtime error, Proposed to be type error.
GoodBarTest(t1); // Gives runtime error; Proposed to be type error.
GoodBarTest(t2);
```



---
**@RyanCavanaugh** commented on 2014-07-23T00:58:33Z

Is there a better keyword here than "abstract" ? People are going to confuse it with "abstract class".

+Needs Proposal


---
**@iislucas** commented on 2014-07-23T01:41:20Z

w.r.t. Needs Proposal: do you mean how to implement it? For compilation to JS, nothing needs to be changed. But would need internal identifiers for new types being introduced and an extra check at assignment. 


---
**@samwgoldman** commented on 2014-07-23T03:29:05Z

Regarding a name, what about "nominal" types? Seems pretty common in literature.


---
**@RyanCavanaugh** commented on 2014-07-23T03:39:58Z

We're still writing up the exact guidelines on suggestions, but basically "Needs Proposal" means that we're looking for someone to write up a detailed formal explanation of what the suggestion means so that it can be more accurately evaluated.

In this case, that would mean a description of how these types would fit in to all the various type algorithms in the spec, defining in precise language any "special case" things, listing motivating examples, and writing out error and non-error cases for each new or modified rule.


---
**@iislucas** commented on 2014-07-23T04:00:24Z

@RyanCavanaugh Thanks! Not sure I have time for that this evening :)  but if the idea would be seriously considered I can either do it, to get someone on my team to do so. Would you want an implementation also? Or would a clear design proposal suffice? 


---
**@danquirk** commented on 2014-07-23T04:55:07Z

@iislucas no implementation is necessary for "Needs Proposal" issues, just something on the more formal side like Ryan described. No rush ;)


---
**@zpdDG4gta8XKpMCd** commented on 2014-07-25T20:23:35Z

There is a workaround that I use a lot in my code to get nominal typing, consider:

```
interface NominalA {
   'I am a nominal type A, nobody can match me to anything I am not': NominalA;
    value: number;
}

interface NominalB {
   'I am a nominal type B, mostly like A but yet quite different': NominalB;
   value: number;
}

// using <any> on constructing instances of such nominal types is the price you have to pay
// I use special constructor functions that do casting internally producing a nominal object to avoid doing it everywhere
var a : NominalA = <any>  { value: 1 };
var b : NominalB = <any>  { value: 2 };

a = b; // <-- problema
```


---
**@iislucas** commented on 2014-07-26T03:19:20Z

Neat trick! Slight optimization, you can use: 

```
var a = <NominalA>  { value: 1 };
var b = <NominalB>  { value: 2 };
```

(Slightly nicer/safer looking syntax)
[Shame it doesn't work for creating distinct types for string that you want to be indexable]

