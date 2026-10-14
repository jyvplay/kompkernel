# Suggestion: non-nullable type

**@fdecampredon** opened on 2014-07-22T06:01:58Z

Introduce two new syntax for type declaration based on JSDoc

``` typescript
var myString: !string = 'hello world'; //non-nullable
var myString1: ?string = 'hello world'; // nullable 
var myString2: string = 'hello world'; // nullable 
var myString3 = 'hello world'; // nullable
```

by default type are nullable.

Two new compiler flag : 
- `inferNonNullableType` make the compiler infer non-nullable type  : 

``` typescript
var myString3 = 'hello world' // typeof myString is '!string', non-nullable
```
- `nonNullableTypeByDefault` (I guess there might be a better name) : 

``` typescript
var myString: !string = 'hello world'; // non-nullable
var myString1: string = 'hello world'; // non-nullable 
var myString2: ?string = 'hello world'; // nullable 
var myString3 = 'hello world' // non-nullable
```



---
**@electricessence** commented on 2014-08-19T18:11:41Z

I suggest using a type other than string as an example since it by nature is nullable. :P
I can perceive non-nullable types being problematic since the user and compiler of "!" expects the type to always be non-null, which can never be truly asserted in JavaScript.  A user might define something like this:

```
function(myNonNull:!myClass):void {
  myNonNull.foo();
}
```

And because it's defined as non-null, everything might be happy for the compiler, but then someone else who uses it in javascript passes something null and kaboom.

Now that said, maybe the solution could be that for public facing methods, it could automatically assert not null.  But then the compiler could also assert that you cannot have public properties (or private for that matter really) that can have a !nonnull declaration since they could not be enforced.

This may go deeper into the discussion of code contracts for this to be properly enforced.


---
**@zpdDG4gta8XKpMCd** commented on 2014-08-19T18:47:21Z

Forgive my critics, I think there is very little need in non-nullable types if/as-soon-as algebraic data types are here. The reason people use `null` to represent a missing value is because there is no better way to do that in JavaScript and in most OOP languages alike. So imaging ADTs are already here. Then, as for the old libs written before non-nullables, having them won't make life any better. As for the new libs, with ADT's in place one can very accurately model what a value can take according to the business domain specification without using nulls at all. So I guess what I am saying is that ADT is way more powerful tool to address the same problem.


---
**@samwgoldman** commented on 2014-08-19T19:10:43Z

Personally, I just wrote a little `Maybe<T>` interface and use discipline to ensure that variables of that type are never null.


---
**@fdecampredon** commented on 2014-08-20T09:48:56Z

> I suggest using a type other than string as an example since it by nature is nullable. :P
> I can perceive non-nullable types being problematic since the user and compiler of "!" expects the type to always be non-null, which can never be truly asserted in JavaScript. A user might define something like this:
> 
> function(myNonNull:!myClass):void {
>   myNonNull.foo();
> }
> And because it's defined as non-null, everything might be happy for the compiler, but then someone else who uses it in javascript passes something null and kaboom.

I don't really understand you can also define : 

``` typescript
function myFunc(str: string): int {
 return str && str.length;
}
```

and if someone pass an `int` to that function it will ends up with an error also, an advantage of typescript is to delegate to the compiler pass things that you would check manually in javascript, having another check for nullable/non-nullable type seems reasonable for me.  By the way SaferTypeScript and ClosureCompiler already do that sort of check.


---
**@fdecampredon** commented on 2014-10-20T15:37:00Z

With union types, we could have a pretty simpler specification for that.
Let's say we have now a basic type 'null', we can have a 'stricter' mode where 'null' and 'undefined' is not compatible with any type, so if we want to express a nullable value we would do : 

``` typescript
var myNullableString: (null | string);
var myString = "hello";
myNullableString = myString //valid
myString = myNullableString // error null is not assignable to string;
```

With the 'strict mode' activated typescript should check that every variable non nullable is initialized, also by default optional parameter are nullable.

``` typescript
var myString: string; // error
var myNullableString: (null | string); // no error

function myString(param1: string, param2?: string) {
  // param1 is string
  // param2 is (null | string)
}
```


---
**@robertknight** commented on 2014-10-21T06:53:18Z

@fdecampredon +1

IIRC from what Facebook showed of Flow which is using TypeScript syntax but with non-nullable types by default they support a shorthand for `(null | T)` as in your original post - I think it was `?T` or `T?`.


---
**@robertknight** commented on 2014-10-21T06:57:45Z

```
var myString: string; // error
```

That could potentially be quite annoying in the case where you want to initialize a variable conditionally, eg.:

```
var myString: string;
if (x) {
myString = a;
} else if (y) {
myString = b;
} else {
myString = c;
}
```

In Rust for example, this is fine as long as the compiler can see that myString will get initialized before it is used but TypeScript's inference doesn't support this at the moment.


---
**@fdecampredon** commented on 2014-10-21T09:45:45Z

Honestly doing something like `var myString = ''` instead of `var myString: string` does not bother me so much, but sure that kind of rule is always possible.

