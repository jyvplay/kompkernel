# RFC: Plan for custom element attributes/properties in React 19

**@robdodson** opened on 2017-10-24T05:28:49Z

This is meant to address #7249. The doc outlines the pros and cons of various approaches React could use to handle attributes and properties on custom elements.

# TOC/Summary

- Background
- Proposals
  * Option 1: Only set properties
    + Pros
      - Easy to understand/implement
      - Avoids conflict with future global attributes
      - Takes advantage of custom element "upgrade"
      - Custom elements treated like any other React component
    + Cons
      - Possibly a breaking change
      - Need ref to set attribute
      - Not clear how server-side rendering would work
  * Option 2: Properties-if-available
    + Pros
      - Non-breaking change
    + Cons
      - Developers need to understand the heuristic
      - Falling back to attributes may conflict with future globals
  * Option 3: Differentiate properties with a sigil
    + Pros
      - Non-breaking change that developers can opt-in to
      - Similar to how other libraries handle attributes/properties
      - The system is explicit
    + Cons
      - It’s new syntax
      - Not clear how server-side rendering would work
  * Option 4: Add an attributes object
    + Pros
      - The system is explicit
      - Extending syntax may also solve issues with event handling
    + Cons
      - It’s new syntax
      - It may be a breaking change
      - It may be a larger change than any of the previous proposals
  * Option 5: An API for consuming custom elements
    + Pros
      - The system is explicit
      - Non-breaking change
      - Idiomatic to React
    + Cons
      - Could be a lot of work for a complex component
      - May bloat bundle size
      - Config needs to keep pace with the component

# Background

When React tries to pass data to a custom element it always does so using HTML attributes.

```jsx
<x-foo bar={baz}> // same as setAttribute('bar', baz)
```

Because attributes must be serialized to strings, this approach creates problems when the data being passed is an object or array. In that scenario, we end up with something like:

```html
<x-foo bar="[object Object]">
```

The workaround for this is to use a `ref` to manually set the property.

```jsx
<x-foo ref={el => el.bar = baz}>
```

This workaround feels a bit unnecessary as the majority of custom elements being shipped today are written with libraries which automatically generate JavaScript properties that back all of their exposed attributes. And anyone hand-authoring a vanilla custom element is [encouraged to follow this practice](https://developers.google.com/web/fundamentals/web-components/best-practices#attributes-properties) as well. We'd like to ideally see runtime communication with custom elements in React use JavaScript properties by default.

This doc outlines a few proposals for how React could be updated to make this happen.

# Proposals

## Option 1: Only set properties

Rather than try to decide if a property or attribute should be set, React could *always* set properties on custom elements. React would **NOT** check to see if the property exists on the element beforehand.

**Example:**

```jsx
<x-foo bar={baz}>
```

The above code would result in React setting the `.bar` property of the `x-foo` element equal to the value of `baz`.

For camelCased property names, React could use the same style it uses today for properties like `tabIndex`.

```jsx
<x-foo squidInk={pasta}> // sets .squidInk = pasta
```

### Pros

#### Easy to understand/implement

This model is simple, explicit, and dovetails with React’s ["JavaScript-centric API to the DOM"](https://reactjs.org/blog/2017/09/08/dom-attributes-in-react-16.html#why-are-we-changing-this).

Any element created with libraries like Polymer or Skate will automatically generate properties to back their exposed attributes. These elements should all "just work" with the above approach. Developers hand-authoring vanilla components are encouraged to [back attributes with properties](https://developers.google.com/web/fundamentals/web-components/best-practices#always-accept-primitive-data-strings-numbers-booleans-as-either-attributes--or-properties) as that mirrors how *modern* (i.e. not oddballs like `<input>`) HTML5 elements (`<video>`, `<audio>`, etc.) have been implemented.

#### Avoids conflict with future global attributes

When React sets an attribute on a custom element there’s always the risk that a future version of HTML will ship a similarly named attribute and break things. This concern was [discussed with spec authors](https://github.com/w3c/webcomponents/issues/654) but there is no clear solution to the problem. Avoiding attributes entirely (except when a developer explicitly sets one using `ref`) may sidestep this issue until the browsers come up with a better solution.

#### Takes advantage of custom element "upgrade"

Custom elements can be lazily [upgraded](https://developers.google.com/web/fundamentals/web-components/customelements#upgrades) on the page and some PRPL patterns rely on this technique. During the upgrade process, a custom element can access the properties passed to it by React—even if those properties were set before the definition loaded—and use them to render initial state.

#### Custom elements treated like any other React component

When React components pass data to one another they already use properties. This would just make custom elements behave the same way.

### Cons

#### Possibly a breaking change

If a developer has been hand-authoring vanilla custom elements which only have an attributes API, then they will need to update their code or their app will break. The fix would be to use a `ref` to set the attribute (explained below).

#### Need ref to set attribute

By changing the behavior so properties are preferred, it means developers will need to use a `ref` in order to explicitly set an attribute on a custom element.

```jsx
<custom-element ref={el => el.setAttribute('my-attr', val)} />
```

This is just a reversal of the current behavior where developers need a `ref` in order to set a property. Since developers should rarely need to set attributes on custom elements, this seems like a reasonable trade-off.

#### Not clear how server-side rendering would work

It's not clear how this model would map to server-side rendering custom elements. React could assume that the properties map to similarly named attributes and attempt to set those on the server, but this is far from bulletproof and would possibly require a heuristic for things like camelCased properties -> dash-cased attributes.

## Option 2: Properties-if-available

At runtime React could attempt to detect if a property is present on a custom element. If the property is present React will use it, otherwise it will fallback to setting an attribute. This is the model Preact uses to deal with custom elements.

**Pseudocode implementation:**

```js
if (propName in element) {
  element[propName] = value;
} else {
  element.setAttribute(propName.toLowerCase(), value);
}
```

**Possible steps:**

* If an element has a defined property, React will use it.

* If an element has an undefined property, and React is trying to pass it primitive data (string/number/boolean), it will use an attribute.

    * Alternative: Warn and don’t set.

* If an element has an undefined property, and React is trying to pass it an object/array it will set it as a property. This is because some-attr="[object Object]” is not useful.

    * Alternative: Warn and don’t set.

* If the element is being rendered on the server, and React is trying to pass it a string/number/boolean, it will use an attribute.

* If the element is being rendered on the server, and React is trying to pass it a object/array, it will not do anything.

### Pros

#### Non-breaking change

It is possible to create a custom element that only uses attributes as its interface. This authoring style is **NOT** encouraged, but it may happen regardless. If a custom element author is relying on this behavior then this change would be non-breaking for them.

### Cons

#### Developers need to understand the heuristic

Developers might be confused when React sets an attribute instead of a property depending on how they’ve chosen to load their element.

#### Falling back to attributes may conflict with future globals

Sebastian [raised a concern](https://github.com/facebook/react/issues/10399#issuecomment-320847065) that using `in` to check for the existence of a property on a custom element might accidentally detect a property on the superclass (HTMLElement).

There are also other potential conflicts with global attributes [discussed previously](#avoids-conflict-with-future-global-attributes) in this doc.

## Option 3: Differentiate properties with a sigil

React could continue setting attributes on custom elements, but provide a sigil that developers could use to explicitly set properties instead. This is similar to [the approach used by Glimmer.js](https://www.emberjs.com/blog/2017/10/10/glimmer-progress-report.html#toc_component-attributes).

**Glimmer example:**

```html
<custom-img @src="corgi.jpg" @hiResSrc="corgi@2x.jpg" width="100%">
```

In the above example, the @ sigil indicates that `src` and `hiResSrc` should pass data to the custom element using properties, and `width` should be serialized to an attribute string.

Because React components already pass data to one another using properties, there would be no need for them to use the sigil (although it would work if they did, it would just be redundant). Instead, it would primarily be used as an explicit instruction to pass data to a custom element using JavaScript properties.

*h/t to @developit of Preact for suggesting this approach :)*

### Pros

#### Non-breaking change that developers can opt-in to

All pre-existing React + custom element apps would continue to work exactly as they have. Developers could choose if they wanted to update their code to use the new sigil style.

#### Similar to how other libraries handle attributes/properties

Similar to Glimmer, both Angular and Vue use modifiers to differentiate between attributes and properties.

**Vue example:**

```html
<!-- Vue will serialize `foo` to an attribute string, and set `squid` using a JavaScript property -->
<custom-element :foo="bar” :squid.prop=”ink”>
```

**Angular example:**

```html
<!-- Angular will serialize `foo` to an attribute string, and set `squid` using a JavaScript property -->
<custom-element [attr.foo]="bar” [squid]=”ink”>
```

#### The system is explicit

Developers can tell React exactly what they want instead of relying on a heuristic like the [properties-if-available](#option-2--properties-if-available) approach.

### Cons

#### It’s new syntax

Developers need to be taught how to use it and it needs to be thoroughly tested to make sure it is backwards compatible.

#### Not clear how server-side rendering would work

Should the sigil switch to using a similarly named attribute?

## Option 4: Add an attributes object

React could add additional syntax which lets authors explicitly pass data as attributes. If developers do not use this attributes object, then their data will be passed using JavaScript properties.

**Example:**

```jsx
const bar = 'baz';
const hello = 'World';
const width = '100%';
const ReactElement = <Test
  foo={bar} // uses JavaScript property
  attrs={{ hello, width }} // serialized to attributes
/>;
```

This idea was [originally proposed](https://gist.github.com/treshugart/2fb509a8828adf7fee5245bfa2a54ba7) by @treshugart, author of Skate.js, and is implemented in the [val](https://github.com/skatejs/val) library.

### Pros

#### The system is explicit

Developers can tell React exactly what they want instead of relying on a heuristic like the [properties-if-available](#option-2--properties-if-available) approach.

#### Extending syntax may also solve issues with event handling

*Note: This is outside the scope of this document but maybe worth mentioning :)*

Issue [#7901](https://github.com/facebook/react/issues/7901) requests that React bypass its synthetic event system when declarative event handlers are added to custom elements. Because custom element event names are arbitrary strings, it means they can be capitalized in any fashion. To bypass the synthetic event system today will also mean needing to come up with a heuristic for mapping event names from JSX to `addEventListener`.

```js
// should this listen for: 'foobar', 'FooBar', or 'fooBar'?
onFooBar={handleFooBar}
```

However, if the syntax is extended to allow attributes it could also be extended to allow events as well:

```js
const bar = 'baz';
const hello = 'World';
const SquidChanged = e => console.log('yo');
const ReactElement = <Test
  foo={bar}
  attrs={{ hello }}
  events={{ SquidChanged}} // addEventListener('SquidChanged', …)
/>;
```

In this model the variable name is used as the event name. No heuristic is needed.

### Cons

#### It’s new syntax

Developers need to be taught how to use it and it needs to be thoroughly tested to make sure it is backwards compatible.

#### It may be a breaking change

If any components already rely on properties named `attrs` or `events`, it could break them.

#### It may be a larger change than any of the previous proposals

For React 17 it may be easier to make an incremental change (like one of the previous proposals) and position this proposal as something to take under consideration for a later, bigger refactor.

## Option 5: An API for consuming custom elements

*This proposal was offered by @sophiebits and @gaearon from the React team*

React could create a new API for consuming custom elements that maps the element’s behavior with a configuration object.

**Pseudocode example:**

```js
const XFoo = ReactDOM.createCustomElementType({
  element: ‘x-foo’,
  ‘my-attr’: // something that tells React what to do with it
  someRichDataProp: // something that tells React what to do with it
});
```

The above code returns a proxy component, `XFoo` that knows how to pass data to a custom element depending on the configuration you provide. You would use this proxy component in your app instead of using the custom element directly.

**Example usage:**

```jsx
<XFoo someRichDataProp={...} />
```

### Pros

#### The system is explicit

Developers can tell React the exact behavior they want.

#### Non-breaking change

Developers can opt-in to using the object or continue using the current system.

#### Idiomatic to React

This change doesn’t require new JSX syntax, and feels more like other APIs in React. For example, PropTypes (even though it’s being moved into its own package) has a somewhat similar approach.

### Cons

#### Could be a lot of work for a complex component

Polymer’s [paper-input](https://www.webcomponents.org/element/PolymerElements/paper-input/elements/paper-input) element has 37 properties, so it would produce a very large config. If developers are using a lot of custom elements in their app, that may equal a lot of configs they need to write.

#### May bloat bundle size

Related to the above point, each custom element class now incurs the cost of its definition + its config object size.

*Note: I'm not 100% sure if this is true. Someone more familiar with the React build process could verify.*

#### Config needs to keep pace with the component

Every time the component does a minor version revision that adds a new property, the config will need to be updated as well. That’s not difficult, but it does add maintenance. Maybe if configs are generated from source this is less of a burden, but that may mean needing to create a new tool to generate configs for each web component library.


cc @sebmarkbage @gaearon @developit @treshugart @justinfagnani


---
**@robdodson** commented on 2017-10-24T05:33:10Z

Apologies for the long read, but I wanted to make sure I was thoroughly exploring each option. I don't want to bias things too much with my own opinion, but if I were in a position to choose, I think I'd go with option 3.

Option 3 is backwards compatible, declarative, and explicit. There’s no need to maintain a fallback heuristic, and other libraries already provide similar sigils/modifiers.

---
**@worawit15379** commented on 2017-10-24T07:59:26Z

Apologies for the long read, but I wanted to make sure I was thoroughly exploring each option. I don't want to bias things too much with my own opinion, but if I were in a position to choose, I think I'd go with option 3.
Option 3 is backwards compatible, declarative, and explicit. There’s no need to maintain a fallback heuristic, and other libraries already provide similar sigils/modifiers.




---
**@jeremenichelli** commented on 2017-10-24T13:41:03Z

I'm between option 2 and option 3, I think that React has handled behavior and API changes very well in the past. Introducting warnings and links to docs might serve well to help developers understand what's happening under the hood.

Option 3 looks attractive because of its declarative nature, while reading JSX code new coming developers will know immediately what React will do when rendering the element.

---
**@cjorasch** commented on 2017-10-24T15:36:28Z

### Comments on option 2

> Developers might be confused when React sets an attribute instead of a property depending on how they’ve chosen to load their element.

Do consumers of a custom element need to understand this distinction?  Or is that only important to the author of the custom element?  It seems like the author of the element will need to handle attributes for anything used in HTML (since that is the only way data gets passed from HTML usage) and properties if they want to support complex values or property get/set from DOM.  It is even possible an author could have something initially implemented as an attribute and then later add a property with the same name to support more flexible data types and still back the property with a value stored in the attributes.

Naming collisions with future HTMLElement attributes and properties seems like a weakness in the Web Components standards in general since that can lead to errors regardless of the binding approach.

> If an element has an undefined property, and React is trying to pass it an object/array it will set it as a property. This is because some-attr="[object Object]” is not useful.

It seems confusing to bind differently based on the value.  If the author of the element has not specified a property getter/setter to handle the value then setting the property would cause the element to behave like the value was never specified which might be harder to debug.

### Comments on option 3

Another potential con with option 3 is that it requires the consumer of the custom element to know whether the element has implemented something as a property or as an attribute.  If you are using a mix of React components and custom elements it could be confusing to set React props using one syntax and custom element properties using a different syntax.

---
**@robdodson** commented on 2017-10-24T16:04:45Z

> Do consumers of a custom element need to understand this distinction? Or is that only important to the author of the custom element?

I doubt it's actually a huge issue because, as you pointed out, the element author should define an attribute and property for the underlying value and accept data from both. I would also add that they should keep the attribute and property in sync (so setting one sets the other).

> Naming collisions with future HTMLElement attributes and properties seems like a weakness in the Web Components standards in general since that can lead to errors regardless of the binding approach.

I agree but I'm not sure if this is something React needs to try to work around in their library. It feels like a problem that needs to be solved as part of the custom elements spec. I can see if we can discuss it as part of the upcoming TPAC standards meeting.

I should add, for properties this isn't _as_ bad because the element-defined property will shadow the future property added to HTMLElement. So if you were passing data to a custom element as a js property, it would continue to work. The main issue seems to be around attributes since they are global.

> It seems confusing to bind differently based on the value. If the author of the element has not specified a property getter/setter to handle the value then setting the property would cause the element to behave like the value was never specified which might be harder to debug.

In the case where a custom element is lazy loaded and "upgraded", it will initially have undefined properties. This addresses that use case by making sure those elements still receive their data and they can use it post-upgrade.

It's true that if the author doesn't define a getter/setter for a value this would not be very useful. But it's also not useful to have an `my-attr=[object Object]`. And since you don't know if the property is truly undefined or if they definition is just being lazy loaded, it seems safest to set the property.

> Another potential con with option 3 is that it requires the consumer of the custom element to know whether the element has implemented something as a property or as an attribute.

I think you're essentially in the same boat today because there's nothing that forces a custom element author to define an attribute instead of a property. So I could have an element with a properties only API that would not receive any data from React's current system and I would need to know to use `ref` to directly set the js properties.

Because custom elements are meant as a primitive, there's nothing that enforces creating corresponding attributes and properties. But we're trying very hard to encourage doing so as a best practice, and all of the libraries that I know of today create backing properties for their attributes.

**[edit]**

As you stated in your earlier point:

> It seems like the author of the element will need to handle attributes for anything used in HTML (since that is the only way data gets passed from HTML usage) and properties if they want to support complex values or property get/set from DOM.

Because you never know how a user will try to pass data to your element, you end up needing to have attribute-property correspondence anyway. I imagine if option 3 shipped that most folks would just bind everything using the `@` sigil because it'd be easiest. That's how I work with custom elements in Vue today since they expose a `.prop` modifier.

---
**@jeremenichelli** commented on 2017-10-24T17:15:15Z

>  it requires the consumer of the custom element to know whether the element has implemented something as a property or as an attribute

That's not something React should worry as Rob said in my opinion, it's the custom element author's responsability to inform the user how the element works.

And it's actually the way that we need to do it today, for example think about the `<video>` element, let's say you need to mute it or change the current time inside a component.

`muted` works as a boolean attribute

```jsx
render() {
  return (
    <div className="video--wrapper">
      <video muted={ this.state.muted } />
    </div>
  );
}
```

For the current time you need to create a `ref` pointing to the video element and change the property.

```jsx
render() {
  return (
    <div className="video--wrapper">
      <video ref={ el => this.video = el } muted={ this.state.muted } />
    </div>
  );
}
```

Then create an event handler, an instance method and manually set the property to the DOM element.

```js
onCurrenTimeChange(e) {
  this.video.currentTime = e.value;
}
```

If you think about it it kinda breaks the declarative model React itself imposes with its API and JSX abstract layer since the `currentTime` it's clearly a state in the wrapper component, with property binding we would still need the event handler but the JSX abstraction model would be more declarative and refs wouldn't be necessary just for this:

```jsx
render() {
  return (
    <div className="video--wrapper">
      <video muted={ this.state.muted } @currentTime={ this.state.currentTime } />
    </div>
  );
}
```

My point is that whether you are relying on native or custom elements, you still need to know your way around them based on documentation, the difference that in the second case it should come from the custom element's author.

@cjorasch my two cents :)

---
**@effulgentsia** commented on 2017-10-24T17:43:43Z

If we were designing this from scratch, without needing to consider backwards compatibility, I think option 1 would be the most idiomatic per React’s ["JavaScript-centric API to the DOM"](https://reactjs.org/blog/2017/09/08/dom-attributes-in-react-16.html#why-are-we-changing-this).

With regard to server-side rendering, could that problem be solved by providing an API for application code to inform React on how to map custom element properties to attributes? Similar to the maps that React already maintains for platform-defined attributes? This API would only need to be invoked once per custom element name (not for each instance of it), and only for properties that don't follow a straight 1:1 correspondence with their attribute, which should hopefully be relatively rare.

If we're concerned about this being too much of a breaking change though, then I think option 3 is pretty appealing as well. If the sigil signifies a property, I would suggest ".", since that's already JavaScript's property accessor. However, I think it's unfortunate to make every instance of where a custom element is used in an application be responsible for knowing when to use an attribute vs. when to use a property. What I prefer about option 1 is that even if a property to attribute map is needed, that mapping code can be isolated from all the JSX usages.


---
**@cjorasch** commented on 2017-10-24T17:53:13Z

> In the case where a custom element is lazy loaded and "upgraded", it will initially have undefined properties. This addresses that use case by making sure those elements still receive their data and they can use it post-upgrade.

Maybe I don't understand the upgrade process.  Elements would typically have properties defined as getters/setters in the class prototype.  Checking `propName in element` would return true because of the existence of the getter/setter even if the property value was still undefined.  During upgrade do property values get set on some temporary instance and then later get copied to the actual instance once the lazy load is complete?
