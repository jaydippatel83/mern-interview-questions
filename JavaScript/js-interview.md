# ⚡ JavaScript Interview Questions

> Scope · Closures · `this` · Prototypes · Async · Event Loop · ES6+ · Memory · Patterns

---

## Table of Contents

1. [Fundamentals](#fundamentals)
2. [Scope, Hoisting & Closures](#scope-hoisting--closures)
3. [`this`, call/apply/bind](#this-callapplybind)
4. [Objects & Prototypes](#objects--prototypes)
5. [Arrays & Iteration](#arrays--iteration)
6. [Asynchronous JavaScript](#asynchronous-javascript)
7. [The Event Loop](#the-event-loop)
8. [ES6+ Features](#es6-features)
9. [Error Handling](#error-handling)
10. [Memory & Performance](#memory--performance)
11. [Modules](#modules)
12. [Browser & DOM](#browser--dom)
13. [Tricky Outputs](#tricky-outputs)
14. [Rapid Fire](#rapid-fire)

---

# Fundamentals

## What are the data types in JavaScript?

### Answer

**7 primitives** (immutable, compared by value):
`string`, `number`, `boolean`, `null`, `undefined`, `symbol`, `bigint`

**1 non-primitive** (compared by reference):
`object` — which includes arrays, functions, dates, maps, sets, regexes.

### Why do we use it?

Primitive vs reference semantics explain the two most common bugs in JS: unexpected mutation and failed equality checks.

### Example

```js
typeof "hi"        // "string"
typeof 42          // "number"
typeof 42n         // "bigint"
typeof true        // "boolean"
typeof undefined   // "undefined"
typeof Symbol()    // "symbol"
typeof null        // "object"   ← famous 25-year-old bug
typeof {}          // "object"
typeof []          // "object"   ← use Array.isArray()
typeof function(){}// "function" ← functions are callable objects

// Value vs reference
let a = 10, b = a; b = 20;  console.log(a); // 10

let o1 = { n: 10 }, o2 = o1; o2.n = 20; console.log(o1.n); // 20 (same object)

// Reliable type check
const typeOf = (v) => Object.prototype.toString.call(v).slice(8, -1).toLowerCase();
typeOf([]);        // "array"
typeOf(null);      // "null"
typeOf(new Date());// "date"
```

### When should we use it?

`typeof` for primitives, `Array.isArray()` for arrays, `instanceof` for class instances (with the caveat that it fails across iframes/realms), and the `Object.prototype.toString` trick when you need exactness.

**Interview Tip:** `typeof null === "object"` is a bug from the first JS engine (the type tag for objects was `000`, and `null` was the null pointer `0x00`). It can't be fixed without breaking the web.

**Common Mistakes:** Using `typeof x === "object"` to detect objects — it matches `null` and arrays too.

---

## What is the difference between `==` and `===`?

### Answer

`===` (strict) compares type **and** value with no coercion. `==` (loose) coerces operands to a common type first, using the abstract equality algorithm.

### Why do we use it?

`==` has non-obvious rules that produce real bugs. `===` is predictable.

### When should we use it?

Always `===`, with exactly one useful exception: `x == null` checks for `null` **or** `undefined` in one expression.

### Example

```js
1 == "1"          // true  (string → number)
1 === "1"         // false

0 == false        // true
0 === false       // false

null == undefined // true   ← by spec, they equal each other and nothing else
null === undefined// false
null == 0         // false  ← null is NOT coerced to a number here

NaN == NaN        // false  (NaN never equals anything)
Object.is(NaN, NaN)     // true
Number.isNaN(NaN)       // true

[] == false       // true   ([] → "" → 0, false → 0)
[] == ![]         // true   (!![] is true, ![] is false → [] == false)
"0" == false      // true
"" == 0           // true

// Useful exception
if (value == null) { /* null OR undefined */ }
```

### The `==` algorithm (abbreviated)

1. Same type → use `===`
2. `null` == `undefined` → true
3. number vs string → string → number
4. boolean → number, then retry
5. object vs primitive → `ToPrimitive(object)`, then retry

**Interview Tip:** `Object.is` differs from `===` in exactly two cases: `Object.is(NaN, NaN)` is `true`, and `Object.is(0, -0)` is `false`.

**Common Mistakes:** Using `==` to check for empty values — `"" == 0 == false == []` all pass, hiding real bugs.

---

## What are truthy and falsy values?

### Answer

**Falsy (exactly 8):** `false`, `0`, `-0`, `0n`, `""`, `null`, `undefined`, `NaN`.
Everything else is truthy — including `[]`, `{}`, `"0"`, `"false"`, and `function(){}`.

### Example

```js
if ([])   console.log("runs");   // ✅ empty array is TRUTHY
if ({})   console.log("runs");   // ✅
if ("0")  console.log("runs");   // ✅ non-empty string
if (0)    console.log("never");  // ❌

Boolean([]);   // true
[] == false;   // true  ← truthiness ≠ loose equality. Different algorithms!

// Correct emptiness checks
arr.length === 0
Object.keys(obj).length === 0
str.trim() === ""
```

**Interview Tip:** `[]` is truthy but `[] == false` is true. They use different algorithms — `if()` uses `ToBoolean`, `==` uses `ToPrimitive` then numeric comparison. This trips up almost everyone.

**Common Mistakes:** `if (count)` when `0` is a valid value — use `if (count !== undefined)` or `??`.

---

## What is the difference between `null` and `undefined`?

### Answer

- **`undefined`** — the *absence of assignment*. The engine's default: uninitialised variables, missing parameters, missing properties, functions with no return.
- **`null`** — an *intentional* empty value assigned by a developer.

### Example

```js
let a;                    // undefined
const obj = {};
obj.missing;              // undefined
function f(x) { return x; } f();  // undefined
function g() {} g();      // undefined

let b = null;             // deliberate "no value"

typeof undefined;         // "undefined"
typeof null;              // "object"
null == undefined;        // true
null === undefined;       // false

JSON.stringify({ a: undefined, b: null });  // '{"b":null}' — undefined is dropped!
```

### When should we use it?

Return `null` to say "explicitly nothing found". Let `undefined` mean "not provided". Note that default parameters trigger only on `undefined`, not `null`:

```js
function f(x = 5) { return x; }
f(undefined); // 5
f(null);      // null  ← default does NOT apply
```

**Interview Tip:** `JSON.stringify` drops `undefined` properties, array holes become `null`. That's a real API bug source.

**Common Mistakes:** Mixing both in a codebase with no convention; using `??` and `||` interchangeably.

---

## What is type coercion?

### Answer

Automatic conversion between types. **Implicit** (by an operator) or **explicit** (by you).

### Example

```js
// The + operator: string wins
1 + "2"       // "12"
"3" + 4 + 5   // "345"  (left to right)
3 + 4 + "5"   // "75"

// Every other arithmetic operator: number wins
"5" - 2       // 3
"5" * "2"     // 10
true + true   // 2
[] + {}       // "[object Object]"
{} + []       // 0  ← in a statement position, {} is a block, then +[] is 0

// Explicit conversion (preferred)
Number("42");     // 42
Number("");       // 0
Number("abc");    // NaN
parseInt("42px"); // 42     ← stops at first non-digit
parseFloat("3.14rem"); // 3.14
String(42);       // "42"
Boolean("");      // false
+"42";            // 42 (unary plus)
!!value;          // boolean coercion
```

### The `ToPrimitive` algorithm

For objects: try `Symbol.toPrimitive` → `valueOf` → `toString` (for the `number` hint), or `toString` → `valueOf` (for the `string` hint).

```js
const money = {
  amount: 100,
  valueOf() { return this.amount; },
  toString() { return `₹${this.amount}`; }
};
money + 50;        // 150   (number hint)
`${money}`;        // "₹100" (string hint)
```

**Interview Tip:** Always pass a radix to `parseInt(str, 10)`. Historically `parseInt("08")` returned 0 in older engines because of octal interpretation.

**Common Mistakes:** Using `+` to add numbers coming from form inputs — they're strings, so you get concatenation.

---

# Scope, Hoisting & Closures

## What is the difference between `var`, `let` and `const`?

### Answer

| | `var` | `let` | `const` |
|---|---|---|---|
| Scope | Function | Block | Block |
| Hoisted | Yes, initialised to `undefined` | Yes, but in the **TDZ** | Yes, but in the TDZ |
| Redeclare in same scope | Yes | No | No |
| Reassign | Yes | Yes | **No** |
| Creates `window` property (global) | Yes | No | No |

### Example

```js
console.log(a); // undefined  ← hoisted & initialised
var a = 1;

console.log(b); // ReferenceError: Cannot access 'b' before initialization
let b = 2;

if (true) { var x = 1; let y = 2; }
console.log(x); // 1
console.log(y); // ReferenceError

// const prevents REASSIGNMENT, not MUTATION
const arr = [1, 2];
arr.push(3);      // ✅ fine
arr = [4];        // ❌ TypeError

const obj = Object.freeze({ a: 1 });  // shallow freeze
obj.a = 2;        // silently fails (throws in strict mode)

// The classic loop question
for (var i = 0; i < 3; i++) setTimeout(() => console.log(i));  // 3 3 3
for (let j = 0; j < 3; j++) setTimeout(() => console.log(j));  // 0 1 2
```

`let` in a `for` loop creates a **new binding per iteration** — that's why the closure captures the right value.

### When should we use it?

`const` by default, `let` when you must reassign, `var` never in new code.

**Interview Tip:** The TDZ isn't "not hoisted" — the binding *is* hoisted, but accessing it before initialisation throws. That precision impresses.

**Common Mistakes:** Saying `const` makes objects immutable. Use `Object.freeze` (shallow) or structural sharing for real immutability.

---

## What is hoisting?

### Answer

During compilation, declarations are registered in their scope before any code runs. Function declarations are fully hoisted (body included); `var` is hoisted and set to `undefined`; `let`/`const`/`class` are hoisted into the Temporal Dead Zone.

### Example

```js
greet();                       // "Hello" ✅ fully hoisted
function greet() { console.log("Hello"); }

sayHi();                       // TypeError: sayHi is not a function
var sayHi = function () {};    // only the var is hoisted, not the assignment

arrow();                       // ReferenceError (TDZ)
const arrow = () => {};

new Foo();                     // ReferenceError (classes are in the TDZ)
class Foo {}

// What the engine effectively sees:
var sayHi;                     // undefined
function greet() { … }         // whole function
sayHi();                       // TypeError
sayHi = function () {};
```

### Function declaration vs expression

```js
// Declaration — hoisted
function a() {}
// Expression — not hoisted (the variable is)
const b = function () {};
// Named function expression — name only visible inside
const c = function inner() { return typeof inner; }; // "function"
```

**Interview Tip:** In a block, function declarations behave differently in sloppy vs strict mode — in strict mode they're block-scoped. Mentioning this shows depth.

**Common Mistakes:** Thinking "let and const are not hoisted." They are — they're just unreachable until initialised.

---

## What is a closure?

### Answer

A closure is a function bundled with a reference to its **lexical environment** — it keeps access to the variables of the scope where it was *defined*, even after that scope has returned.

### Why do we use it?

Data privacy, function factories, memoization, partial application, module pattern, and every React hook's captured state.

### When should we use it?

Whenever you need state that persists between calls but isn't global.

### Example

```js
// 1. Private state (module pattern)
function createCounter() {
  let count = 0;                 // private — no outside access
  return {
    increment: () => ++count,
    decrement: () => --count,
    get value() { return count; }
  };
}
const c = createCounter();
c.increment(); c.increment();
c.value;      // 2
c.count;      // undefined — truly private

// 2. Function factory
const multiply = (x) => (y) => x * y;
const double = multiply(2);
double(5);    // 10

// 3. Memoization
function memoize(fn) {
  const cache = new Map();
  return (...args) => {
    const key = JSON.stringify(args);
    if (cache.has(key)) return cache.get(key);
    const result = fn(...args);
    cache.set(key, result);
    return result;
  };
}

// 4. Once
function once(fn) {
  let called = false, result;
  return (...a) => { if (!called) { called = true; result = fn(...a); } return result; };
}

// 5. The classic interview trap
for (var i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 100);   // 3, 3, 3
}
// Fix A: let (new binding each iteration)
// Fix B: IIFE captures the value
for (var i = 0; i < 3; i++) {
  ((n) => setTimeout(() => console.log(n), 100))(i);  // 0, 1, 2
}
```

**Interview Tip:** Say "closures capture **variables**, not values" — that's exactly why the `var` loop logs `3,3,3`: all three closures share one binding.

**Common Mistakes:** Closures over large objects in long-lived callbacks → memory leaks. The closure keeps the whole scope alive.

---

## What is an IIFE?

### Answer

**Immediately Invoked Function Expression** — a function defined and called at once, creating a private scope.

### Example

```js
(function () { console.log("runs immediately"); })();
(() => { console.log("arrow IIFE"); })();
(async () => { await main(); })();          // top-level await workaround

// Module pattern (pre-ES6)
const Counter = (function () {
  let count = 0;
  return { inc: () => ++count, get: () => count };
})();
```

### Why do we use it?

Before ES modules and `let`, an IIFE was the only way to avoid polluting the global scope. Today it's mostly used for async entry points and one-off initialisation.

**Interview Tip:** The wrapping parentheses convert a function *declaration* into an *expression* so it can be invoked. `!function(){}()` and `void function(){}()` do the same.

---

## What is the difference between a normal function and an arrow function?

### Answer

| | Normal function | Arrow function |
|---|---|---|
| `this` | Dynamic (call-site) | **Lexical** (enclosing scope) |
| `arguments` object | Yes | No (use rest `...args`) |
| `new` (constructor) | Yes | **No** — TypeError |
| `prototype` property | Yes | No |
| Hoisted (declaration) | Yes | No |
| `yield` / generator | Yes | No |
| Implicit return | No | Yes (expression body) |

### Example

```js
const obj = {
  name: "Jaydip",
  regular() { return this.name; },            // "Jaydip"
  arrow: () => this?.name,                    // undefined — `this` is module/window
  delayed() {
    setTimeout(() => console.log(this.name), 100);      // ✅ "Jaydip" — lexical
    setTimeout(function () { console.log(this.name); }); // ❌ undefined
  }
};

// Arrows can't be constructors
const A = () => {};
new A();  // TypeError: A is not a constructor

// Implicit return of an object literal needs parens
const make = (id) => ({ id });   // without parens, {} is a block → undefined
```

### When should we use it?

- **Arrow** — callbacks, array methods, anything that should inherit `this` (React handlers, `setTimeout`).
- **Normal** — object methods, constructors, prototype methods, generators, and anything needing a dynamic `this`.

**Interview Tip:** Never use an arrow function as an object method if you need `this` to be the object — and never as a `prototype` method on a class.

**Common Mistakes:** Arrow functions in `Vue`/`Angular` option objects or in `addEventListener` where you actually want `this` to be the element.

---

# `this`, call/apply/bind

## How is `this` determined in JavaScript?

### Answer

`this` is set by **how a function is called**, not where it's defined. Resolution order:

1. **`new`** → the newly created object
2. **Explicit** `call` / `apply` / `bind` → the given object
3. **Implicit** (method call `obj.fn()`) → `obj`
4. **Default** → `globalThis` (sloppy mode) or `undefined` (strict mode / modules)
5. **Arrow function** → inherited lexically, ignoring all of the above

### Example

```js
function show() { return this; }

show();                       // window (sloppy) / undefined (strict)
const o = { show }; o.show(); // o
show.call({ a: 1 });          // { a: 1 }
new show();                   // the new instance

// Losing `this` — the #1 real-world bug
const user = {
  name: "Jaydip",
  greet() { return `Hi ${this.name}`; }
};
const fn = user.greet;
fn();                    // "Hi undefined" — the reference lost its receiver
const bound = user.greet.bind(user);
bound();                 // "Hi Jaydip" ✅

// In classes
class Button {
  label = "Save";
  handleA() { console.log(this.label); }         // needs binding
  handleB = () => console.log(this.label);       // class field arrow — auto-bound
}
const b = new Button();
const { handleA, handleB } = b;
handleB();  // "Save" ✅
handleA();  // TypeError — this is undefined (class bodies are strict mode)
```

**Interview Tip:** "`this` is about the call site, not the definition site" — say that first, then walk the four rules.

**Common Mistakes:** Passing a method as a callback (`arr.forEach(obj.method)`) and losing `this`. Fix with `.bind(obj)` or `arr.forEach(x => obj.method(x))`.

---

## What is the difference between `call`, `apply` and `bind`?

### Answer

All three set `this`. `call` and `apply` **invoke immediately**; `bind` returns a **new function**.

| | Invokes | Arguments |
|---|---|---|
| `call(thisArg, a, b)` | Now | Comma-separated |
| `apply(thisArg, [a, b])` | Now | Array |
| `bind(thisArg, a)` | Later | Comma-separated, partially applied |

### Example

```js
function intro(greeting, punctuation) {
  return `${greeting}, I'm ${this.name}${punctuation}`;
}
const person = { name: "Jaydip" };

intro.call(person, "Hello", "!");    // "Hello, I'm Jaydip!"
intro.apply(person, ["Hi", "."]);    // "Hi, I'm Jaydip."
const bound = intro.bind(person, "Hey");
bound("!!");                         // "Hey, I'm Jaydip!!"  (partial application)

// Borrowing array methods for array-likes
function f() { return Array.prototype.slice.call(arguments); }

// Max of an array (pre-spread)
Math.max.apply(null, [1, 5, 3]);     // 5
Math.max(...[1, 5, 3]);              // 5 (modern)
```

### Bind is permanent

```js
const once = intro.bind(a).bind(b);  // still bound to `a` — rebinding does nothing
new (intro.bind(a))();               // EXCEPT with `new`, which overrides bind
```

**Interview Tip:** Mnemonic — **a** for **a**rray (`apply`), **c** for **c**omma (`call`), **b** for **b**ound-later (`bind`).

**Common Mistakes:** Calling `.bind()` inside `render`/JSX — it creates a new function every render, breaking `React.memo`.

---

# Objects & Prototypes

## What is prototypal inheritance?

### Answer

Every object has an internal `[[Prototype]]` link (exposed as `__proto__`, accessed properly with `Object.getPrototypeOf`). When you read a property, the engine walks up this **prototype chain** until it finds the key or hits `null`.

### Example

```js
const animal = {
  eats: true,
  walk() { return `${this.name} walks`; }
};

const dog = Object.create(animal);
dog.name = "Rex";
dog.eats;      // true   ← found on the prototype
dog.walk();    // "Rex walks"  ← `this` is still dog

Object.getPrototypeOf(dog) === animal;   // true
dog.hasOwnProperty('eats');              // false
'eats' in dog;                           // true (checks the whole chain)

// Constructor functions
function Person(name) { this.name = name; }
Person.prototype.greet = function () { return `Hi ${this.name}`; };
const p = new Person("Jaydip");
p.greet();                       // "Hi Jaydip"
p.__proto__ === Person.prototype // true

// The chain
// p → Person.prototype → Object.prototype → null
```

### Why do we use it?

Methods live once on the prototype instead of being copied into every instance — huge memory saving.

**Interview Tip:** `prototype` is a property of **constructor functions**; `__proto__` is the link on **instances**. Mixing them up is the classic tell.

**Common Mistakes:** Extending built-in prototypes (`Array.prototype.myMethod = …`) — it breaks `for…in` and collides with future spec additions.

---

## What does the `new` keyword do?

### Answer

Four steps:

1. Create an empty object `{}`
2. Set its `[[Prototype]]` to `Constructor.prototype`
3. Call the constructor with `this` bound to that object
4. Return that object — **unless** the constructor explicitly returns another object

### Example

```js
function myNew(Ctor, ...args) {
  const obj = Object.create(Ctor.prototype);   // 1 & 2
  const result = Ctor.apply(obj, args);        // 3
  return result instanceof Object ? result : obj;  // 4
}

function Person(name) { this.name = name; }
const p = myNew(Person, "Jaydip");
p.name;                  // "Jaydip"
p instanceof Person;     // true

// Returning an object overrides `this`
function Weird() { this.a = 1; return { b: 2 }; }
new Weird();   // { b: 2 }
```

**Interview Tip:** Writing `myNew` from memory is a very common senior-level whiteboard task — it proves you understand `new`, `Object.create` and `apply` together.

---

## What is the difference between `class` and a constructor function?

### Answer

Classes are syntactic sugar over prototypes, but with real behavioural differences:

| | Constructor function | `class` |
|---|---|---|
| Hoisting | Fully hoisted | TDZ |
| Strict mode | Inherited | **Always strict** |
| Callable without `new` | Yes | **TypeError** |
| Methods enumerable | Yes | No |
| Private fields | Convention (`_x`) | Real (`#x`) |
| `super` | Manual | Built-in |

### Example

```js
class Animal {
  #secret = "private";          // truly private, not accessible outside
  static count = 0;             // static field
  constructor(name) { this.name = name; Animal.count++; }
  speak() { return `${this.name} makes a sound`; }
  get displayName() { return this.name.toUpperCase(); }
  set displayName(v) { this.name = v.toLowerCase(); }
  static create(n) { return new this(n); }
  #privateMethod() { return this.#secret; }
}

class Dog extends Animal {
  constructor(name, breed) {
    super(name);                // MUST come before using `this`
    this.breed = breed;
  }
  speak() { return `${super.speak()} — Woof!`; }
}

const d = new Dog("Rex", "Lab");
d.speak();             // "Rex makes a sound — Woof!"
d instanceof Animal;   // true
Animal("x");           // TypeError: cannot be invoked without 'new'
```

**Interview Tip:** `#private` fields are enforced by the engine — `obj.#x` from outside is a **syntax error**, not just undefined. That's stronger than TypeScript's `private`, which is compile-time only.

**Common Mistakes:** Using `this` before `super()` in a derived constructor — ReferenceError.

---

## How do you deep clone an object?

### Answer

Four options, best first:

```js
// 1. structuredClone — native, handles Date/Map/Set/RegExp/cycles/TypedArrays
const clone = structuredClone(obj);
// ❌ cannot clone: functions, DOM nodes, class prototypes (becomes plain object), symbols

// 2. JSON round-trip — quick but lossy
const clone2 = JSON.parse(JSON.stringify(obj));
// ❌ loses: undefined, functions, Symbol, Date→string, NaN/Infinity→null, Map/Set→{}
// ❌ throws on circular references

// 3. Manual recursion
function deepClone(value, seen = new WeakMap()) {
  if (value === null || typeof value !== "object") return value;
  if (seen.has(value)) return seen.get(value);            // handle cycles

  if (value instanceof Date) return new Date(value);
  if (value instanceof RegExp) return new RegExp(value.source, value.flags);
  if (value instanceof Map)
    return new Map([...value].map(([k, v]) => [deepClone(k, seen), deepClone(v, seen)]));
  if (value instanceof Set)
    return new Set([...value].map((v) => deepClone(v, seen)));

  const out = Array.isArray(value) ? [] : Object.create(Object.getPrototypeOf(value));
  seen.set(value, out);
  for (const key of Reflect.ownKeys(value)) out[key] = deepClone(value[key], seen);
  return out;
}

// 4. Library — lodash.cloneDeep
```

### Shallow vs deep

```js
const shallow  = { ...obj };            // one level only
const shallow2 = Object.assign({}, obj);
// nested objects are still shared references
```

**Interview Tip:** Lead with `structuredClone` — it's native since 2022 and most candidates still say `JSON.parse(JSON.stringify())`. Then list what each one loses.

**Common Mistakes:** Using the JSON trick on data containing `Date` objects, then wondering why `.getTime()` throws.

---

## What are `Object.freeze`, `seal` and `preventExtensions`?

### Answer

| | Add props | Delete props | Modify values | Reconfigure |
|---|---|---|---|---|
| `preventExtensions` | ❌ | ✅ | ✅ | ✅ |
| `seal` | ❌ | ❌ | ✅ | ❌ |
| `freeze` | ❌ | ❌ | ❌ | ❌ |

All three are **shallow**.

### Example

```js
const config = Object.freeze({ api: "https://x.com", nested: { a: 1 } });
config.api = "hack";       // silently ignored (throws in strict mode)
config.nested.a = 2;       // ✅ WORKS — freeze is shallow!

function deepFreeze(obj) {
  for (const key of Object.getOwnPropertyNames(obj)) {
    const v = obj[key];
    if (v && typeof v === "object") deepFreeze(v);
  }
  return Object.freeze(obj);
}

Object.isFrozen(config);   // true
```

**Interview Tip:** Always volunteer "freeze is shallow" — it's the follow-up question 90% of the time.

---

## What are getters, setters and property descriptors?

### Answer

Every property has a descriptor: `value`, `writable`, `enumerable`, `configurable` — or for accessors, `get`, `set`, `enumerable`, `configurable`.

### Example

```js
const user = {
  first: "Jaydip", last: "Patel",
  get fullName() { return `${this.first} ${this.last}`; },
  set fullName(v) { [this.first, this.last] = v.split(" "); }
};
user.fullName;               // "Jaydip Patel"
user.fullName = "A B";
user.first;                  // "A"

Object.defineProperty(user, "id", {
  value: 1,
  writable: false,
  enumerable: false,   // hidden from Object.keys / for…in / JSON.stringify
  configurable: false
});

Object.keys(user);                        // no "id"
Object.getOwnPropertyDescriptor(user, "id");
// { value: 1, writable: false, enumerable: false, configurable: false }
```

Note: `Object.defineProperty` defaults every flag to `false`, while object-literal properties default to `true`.

**Interview Tip:** Vue 2's reactivity was built on `Object.defineProperty` (hence its array-index limitations); Vue 3 and MobX use `Proxy`. Great context to add.

---

## What is a `Proxy` and `Reflect`?

### Answer

A `Proxy` wraps an object and intercepts fundamental operations via traps (`get`, `set`, `has`, `deleteProperty`, `apply`, `construct`, `ownKeys`). `Reflect` provides the default implementations of those operations as plain functions.

### Example

```js
const target = { name: "Jaydip", age: 25 };

const handler = {
  get(obj, prop, receiver) {
    if (!(prop in obj)) throw new ReferenceError(`No property "${String(prop)}"`);
    console.log(`GET ${String(prop)}`);
    return Reflect.get(obj, prop, receiver);
  },
  set(obj, prop, value, receiver) {
    if (prop === "age" && typeof value !== "number")
      throw new TypeError("age must be a number");
    return Reflect.set(obj, prop, value, receiver);
  },
  deleteProperty(obj, prop) {
    console.log(`DELETE ${String(prop)}`);
    return Reflect.deleteProperty(obj, prop);
  }
};

const p = new Proxy(target, handler);
p.name;          // logs GET name → "Jaydip"
p.age = "old";   // TypeError
p.missing;       // ReferenceError
```

### Why do we use it?

Validation, logging, reactivity systems (Vue 3, MobX, Valtio), negative array indices, default values, API mocking, immutability wrappers.

**Interview Tip:** `Reflect` methods return booleans instead of throwing (e.g. `Reflect.set`), which is why they pair so well with traps that must return a boolean.

**Common Mistakes:** Proxies have real overhead — don't wrap hot-path objects in tight loops.

---

# Arrays & Iteration

## What is the difference between `map`, `forEach`, `filter`, `reduce` and `find`?

### Answer

| Method | Returns | Mutates | Chainable | Can break early |
|---|---|---|---|---|
| `forEach` | `undefined` | No | No | No |
| `map` | New array, same length | No | Yes | No |
| `filter` | New array, ≤ length | No | Yes | No |
| `reduce` | Any single value | No | Depends | No |
| `find` / `findIndex` | First match / index | No | No | **Yes** |
| `some` / `every` | Boolean | No | No | **Yes** |
| `flatMap` | Flattened new array | No | Yes | No |

### Example

```js
const nums = [1, 2, 3, 4, 5];

nums.map(n => n * 2);                 // [2,4,6,8,10]
nums.filter(n => n % 2 === 0);        // [2,4]
nums.reduce((a, b) => a + b, 0);      // 15
nums.find(n => n > 3);                // 4
nums.findIndex(n => n > 3);           // 3
nums.some(n => n > 4);                // true
nums.every(n => n > 0);               // true
nums.flatMap(n => [n, n * 2]);        // [1,2,2,4,3,6,4,8,5,10]
nums.at(-1);                          // 5  (last element)

// reduce can do everything
const groupBy = (arr, fn) =>
  arr.reduce((acc, x) => { (acc[fn(x)] ||= []).push(x); return acc; }, {});

groupBy([1,2,3,4,5], n => n % 2 ? "odd" : "even");
// { odd: [1,3,5], even: [2,4] }

// Modern alternative
Object.groupBy([1,2,3,4,5], n => n % 2 ? "odd" : "even");
```

**Interview Tip:** `map` without using the return value is a code smell — use `forEach`. And note `map/filter/forEach` **skip holes** in sparse arrays.

**Common Mistakes:** `reduce` without an initial value on an empty array → TypeError. Always pass one.

---

## Which array methods mutate the original array?

### Answer

**Mutating:** `push`, `pop`, `shift`, `unshift`, `splice`, `sort`, `reverse`, `fill`, `copyWithin`.

**Non-mutating:** `map`, `filter`, `slice`, `concat`, `join`, `reduce`, `flat`, `flatMap`, `at`, and the newer copying versions: `toSorted`, `toReversed`, `toSpliced`, `with`.

### Example

```js
const arr = [3, 1, 2];

arr.sort();          // MUTATES → [1,2,3]
const s = arr.toSorted();     // ✅ copy, original untouched
const r = arr.toReversed();
const w = arr.with(0, 99);    // copy with index 0 replaced

// The default sort is LEXICOGRAPHIC
[10, 9, 1].sort();                 // [1, 10, 9] ❌
[10, 9, 1].sort((a, b) => a - b);  // [1, 9, 10] ✅

// splice vs slice
const a = [1,2,3,4,5];
a.slice(1, 3);       // [2,3]     — copy, no mutation
a.splice(1, 2);      // [2,3]     — REMOVES them from a → a is [1,4,5]
```

**Interview Tip:** In React, mutating state arrays is the top cause of "why isn't my component re-rendering?" — `toSorted`/`toReversed`/`with` exist precisely for that.

**Common Mistakes:** `sort()` without a comparator on numbers; forgetting `sort` mutates and returns the *same* array reference.

---

## How does `reduce` work in depth?

### Answer

```js
array.reduce((accumulator, currentValue, index, array) => newAccumulator, initialValue);
```

If `initialValue` is omitted, the first element becomes the accumulator and iteration starts at index 1.

### Example

```js
// Sum
[1,2,3].reduce((a, c) => a + c, 0);   // 6

// Max
[1,9,3].reduce((a, c) => (c > a ? c : a));

// Flatten
[[1,2],[3,4]].reduce((a, c) => a.concat(c), []);

// Count occurrences
["a","b","a"].reduce((acc, x) => { acc[x] = (acc[x] || 0) + 1; return acc; }, {});
// { a: 2, b: 1 }

// Pipe / compose
const pipe = (...fns) => (x) => fns.reduce((v, f) => f(v), x);
const add1 = n => n + 1, double = n => n * 2;
pipe(add1, double)(5);   // 12

// Promise sequencing (run in order, not parallel)
const sequential = (tasks) =>
  tasks.reduce((p, task) => p.then((acc) => task().then(r => [...acc, r])),
               Promise.resolve([]));

// Remove duplicates by key
const uniqueBy = (arr, key) =>
  [...arr.reduce((m, x) => m.set(x[key], x), new Map()).values()];
```

**Interview Tip:** "`reduce` can implement `map`, `filter` and `forEach`" — then write `map` with reduce in three lines. Strong signal.

---

## What is the difference between `for...in`, `for...of` and `forEach`?

### Answer

| | Iterates | Works on | Break/continue | Includes prototype |
|---|---|---|---|---|
| `for...in` | **Keys** (strings) | Any object | Yes | **Yes** (enumerable) |
| `for...of` | **Values** | Iterables (Array, String, Map, Set, NodeList, generators) | Yes | No |
| `forEach` | Values | Arrays | **No** | No |

### Example

```js
const arr = ["a", "b"];
arr.extra = "x";

for (const i in arr) console.log(i);      // "0", "1", "extra"   ← indices as STRINGS
for (const v of arr) console.log(v);      // "a", "b"

for (const [i, v] of arr.entries()) console.log(i, v);  // index + value

// Objects are not iterable by default
const obj = { a: 1, b: 2 };
for (const v of obj) {}                   // TypeError
for (const [k, v] of Object.entries(obj)) console.log(k, v);  // ✅

// for…of with async
for (const url of urls) {
  const res = await fetch(url);           // sequential ✅
}
// forEach with async does NOT wait
urls.forEach(async (url) => { await fetch(url); });  // ❌ fires all, no waiting
```

**Interview Tip:** Never use `for...in` on arrays — it yields string indices and walks the prototype chain.

**Common Mistakes:** `await` inside `forEach` — the callback is async but `forEach` ignores the returned promise. Use `for...of` or `Promise.all(map(...))`.

---

## What are iterators and generators?

### Answer

- **Iterable** — an object with a `[Symbol.iterator]()` method returning an iterator.
- **Iterator** — an object with `next()` returning `{ value, done }`.
- **Generator** — a function (`function*`) that produces an iterator; `yield` pauses execution and returns a value, resuming on the next `next()` call.

### Example

```js
// Custom iterable
const range = {
  from: 1, to: 5,
  [Symbol.iterator]() {
    let cur = this.from, last = this.to;
    return { next: () => (cur <= last ? { value: cur++, done: false } : { done: true }) };
  }
};
[...range];  // [1,2,3,4,5]

// Same thing with a generator — far shorter
function* rangeGen(from, to) { for (let i = from; i <= to; i++) yield i; }
[...rangeGen(1, 5)];  // [1,2,3,4,5]

// Infinite sequence — lazy evaluation
function* idGen() { let id = 1; while (true) yield id++; }
const ids = idGen();
ids.next().value;  // 1
ids.next().value;  // 2

// Two-way communication
function* dialog() {
  const name = yield "What's your name?";
  const age  = yield `Hi ${name}, age?`;
  return `${name} is ${age}`;
}
const d = dialog();
d.next().value;         // "What's your name?"
d.next("Jaydip").value; // "Hi Jaydip, age?"
d.next(25).value;       // "Jaydip is 25"

// Delegation
function* inner() { yield 1; yield 2; }
function* outer() { yield 0; yield* inner(); yield 3; }
[...outer()];  // [0,1,2,3]

// Async generator
async function* fetchPages(url) {
  let next = url;
  while (next) {
    const res = await fetch(next).then(r => r.json());
    yield* res.items;
    next = res.nextPage;
  }
}
for await (const item of fetchPages("/api/items")) console.log(item);
```

### Why do we use it?

Lazy evaluation, infinite sequences, pagination, and — historically — the foundation of `redux-saga` and how `async/await` is implemented under the hood.

**Interview Tip:** `async/await` is essentially a generator that yields promises, driven by a runner. Saying this shows real depth.

---

## What is the difference between `Map`/`Set` and `Object`/`Array`?

### Answer

| | Object | Map |
|---|---|---|
| Key types | String, Symbol only | **Any** (objects, functions, NaN) |
| Order | Integer keys sorted first, then insertion | Insertion order, always |
| Size | `Object.keys(o).length` | `map.size` |
| Iteration | Needs `Object.entries` | Directly iterable |
| Prototype keys | Inherits from `Object.prototype` | None |
| Frequent add/delete | Slower | **Optimised** |
| JSON | Native | Needs conversion |

### Example

```js
const map = new Map();
const keyObj = { id: 1 };
map.set(keyObj, "object key");
map.set(NaN, "NaN works too");
map.get(keyObj);       // "object key"
map.size;              // 2
[...map.keys()]; [...map.values()]; [...map.entries()];

const set = new Set([1, 2, 2, 3]);
set.size;              // 3 — automatic dedupe
set.has(2);            // true
[...new Set(array)];   // the idiomatic dedupe

// Set operations (2024+)
const a = new Set([1,2,3]), b = new Set([2,3,4]);
a.intersection(b);     // Set {2,3}
a.union(b);            // Set {1,2,3,4}
a.difference(b);       // Set {1}

// WeakMap / WeakSet — keys must be objects, held weakly (GC-able)
const cache = new WeakMap();
cache.set(domNode, expensiveData);   // no memory leak when the node is removed
```

### When should we use it?

- **Map** — dynamic keys, non-string keys, frequent insertion/deletion, need for ordering.
- **Object** — fixed shape, JSON serialisation, method containers.
- **Set** — uniqueness and membership checks.
- **WeakMap** — private data or caches keyed by objects you don't want to keep alive.

**Interview Tip:** Object keys are coerced to strings — `obj[1]` and `obj["1"]` are the same key. Map keys are not.

---

# Asynchronous JavaScript

## What is a Promise and what are its states?

### Answer

An object representing the eventual result of an async operation. Three states:

- **pending** → **fulfilled** (with a value) or **rejected** (with a reason)

Once settled it is immutable — the state can never change again.

### Example

```js
const p = new Promise((resolve, reject) => {
  setTimeout(() => (Math.random() > .5 ? resolve("ok") : reject(new Error("fail"))), 100);
});

p.then(v => console.log(v))
 .catch(e => console.error(e))
 .finally(() => console.log("always runs"));

// Chaining — each .then returns a NEW promise
fetch("/api/user")
  .then(r => {
    if (!r.ok) throw new Error(`HTTP ${r.status}`);   // fetch does NOT reject on 4xx/5xx
    return r.json();
  })
  .then(user => fetch(`/api/posts/${user.id}`))
  .then(r => r.json())
  .catch(err => console.error(err));    // catches errors from ANY previous step
```

### Static combinators

```js
Promise.all([p1, p2]);         // all fulfilled → array; ANY rejects → rejects immediately
Promise.allSettled([p1, p2]);  // never rejects → [{status,value}|{status,reason}]
Promise.race([p1, p2]);        // first to SETTLE (fulfil or reject) wins
Promise.any([p1, p2]);         // first to FULFIL; all reject → AggregateError

// Timeout pattern
const withTimeout = (promise, ms) =>
  Promise.race([
    promise,
    new Promise((_, rej) => setTimeout(() => rej(new Error("Timeout")), ms))
  ]);
```

**Interview Tip:** `Promise.all` **fails fast** but the other promises still run — they aren't cancelled. Use `allSettled` when you need every result regardless.

**Common Mistakes:** Forgetting `return` inside `.then()`, which breaks the chain and resolves with `undefined`; assuming `fetch` rejects on a 404 (it only rejects on network failure).

---

## What is `async/await` and how does it relate to Promises?

### Answer

Syntactic sugar over promises. An `async` function **always returns a promise**; `await` pauses the function until the awaited promise settles, without blocking the thread.

### Example

```js
async function getUser(id) {
  try {
    const res = await fetch(`/api/users/${id}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();          // returns a resolved promise
  } catch (err) {
    console.error("Failed:", err);
    throw err;                        // re-throw so callers can handle it
  } finally {
    console.log("done");
  }
}

// Sequential vs parallel — the most-asked async question
// ❌ 3 seconds (each waits for the previous)
const a = await fetchA();  // 1s
const b = await fetchB();  // 1s
const c = await fetchC();  // 1s

// ✅ 1 second — start all, then await
const [x, y, z] = await Promise.all([fetchA(), fetchB(), fetchC()]);

// ✅ or start them first, await later
const pa = fetchA(), pb = fetchB();
const ra = await pa, rb = await pb;

// Sequential is correct when there's a dependency
const user = await getUser(1);
const posts = await getPosts(user.id);   // needs user first

// Concurrency limit
async function pool(tasks, limit = 5) {
  const results = [];
  const running = new Set();
  for (const task of tasks) {
    const p = task().then(r => { running.delete(p); return r; });
    running.add(p);
    results.push(p);
    if (running.size >= limit) await Promise.race(running);
  }
  return Promise.all(results);
}
```

**Interview Tip:** The sequential-vs-parallel `await` trap is asked in almost every mid-level interview. Always show both versions.

**Common Mistakes:** `await` inside `forEach` (doesn't wait); no `try/catch`, causing an unhandled rejection; awaiting inside a loop when the iterations are independent.

---

## What is callback hell and how do you avoid it?

### Answer

Deeply nested callbacks producing a "pyramid of doom" that's hard to read and where error handling must be repeated at every level.

### Example

```js
// ❌ Callback hell
getUser(1, (err, user) => {
  if (err) return handle(err);
  getPosts(user.id, (err, posts) => {
    if (err) return handle(err);
    getComments(posts[0].id, (err, comments) => {
      if (err) return handle(err);
      console.log(comments);
    });
  });
});

// ✅ Promises
getUser(1)
  .then(u => getPosts(u.id))
  .then(p => getComments(p[0].id))
  .then(console.log)
  .catch(handle);

// ✅✅ async/await
try {
  const user = await getUser(1);
  const posts = await getPosts(user.id);
  console.log(await getComments(posts[0].id));
} catch (e) { handle(e); }
```

### Promisifying a callback API

```js
const promisify = (fn) => (...args) =>
  new Promise((resolve, reject) =>
    fn(...args, (err, result) => (err ? reject(err) : resolve(result))));

const readFileAsync = promisify(fs.readFile);
// or: const { promisify } = require('util');
```

**Interview Tip:** Note the Node.js error-first callback convention `(err, data)` — that's why `promisify` works generically.

---

## What is the difference between `setTimeout`, `setInterval` and `requestAnimationFrame`?

### Answer

| | Runs | Best for |
|---|---|---|
| `setTimeout(fn, ms)` | Once, after **at least** `ms` | Delays, debouncing |
| `setInterval(fn, ms)` | Repeatedly | Polling — but drifts and can stack |
| `requestAnimationFrame(fn)` | Before the next repaint (~60fps) | Animations |
| `queueMicrotask(fn)` | End of the current task | Microtask scheduling |
| `setImmediate(fn)` | Node only, check phase | Node I/O ordering |

### Example

```js
// setInterval can overlap if the callback is slow → use recursive setTimeout
function poll() {
  setTimeout(async () => {
    await doWork();     // guarantees the previous run finished
    poll();
  }, 1000);
}

// rAF pauses in background tabs and syncs with the display
function animate(timestamp) {
  el.style.transform = `translateX(${timestamp / 10}px)`;
  requestAnimationFrame(animate);
}
requestAnimationFrame(animate);

// setTimeout(fn, 0) is NOT immediate — minimum ~4ms after 5 nested calls
setTimeout(() => console.log("2"), 0);
queueMicrotask(() => console.log("1"));   // microtask runs first
```

**Interview Tip:** `setTimeout(fn, 0)` is clamped to ~4ms after nesting, and background tabs throttle timers to ≥1000ms. `requestAnimationFrame` stops entirely in hidden tabs — that's why animations shouldn't drive business logic.

---

## What is debouncing and throttling?

### Answer

- **Debounce** — run the function only after the events have *stopped* for `delay` ms. Collapses a burst into one call at the end.
- **Throttle** — run at most once per `limit` ms while events keep firing.

### Example

```js
function debounce(fn, delay = 300, immediate = false) {
  let timer;
  function debounced(...args) {
    const callNow = immediate && !timer;
    clearTimeout(timer);
    timer = setTimeout(() => { timer = null; if (!immediate) fn.apply(this, args); }, delay);
    if (callNow) fn.apply(this, args);
  }
  debounced.cancel = () => { clearTimeout(timer); timer = null; };
  return debounced;
}

function throttle(fn, limit = 300) {
  let lastRun = 0, timer;
  return function (...args) {
    const now = Date.now();
    const remaining = limit - (now - lastRun);
    if (remaining <= 0) { lastRun = now; fn.apply(this, args); }
    else if (!timer) {                     // trailing call
      timer = setTimeout(() => { lastRun = Date.now(); timer = null; fn.apply(this, args); }, remaining);
    }
  };
}

// Usage
searchInput.addEventListener("input", debounce(e => search(e.target.value), 400));
window.addEventListener("scroll", throttle(updateHeader, 200));
window.addEventListener("resize", debounce(recalcLayout, 250));
```

### When should we use it?

- **Debounce** — search-as-you-type, autosave, form validation, resize.
- **Throttle** — scroll position, mousemove, infinite scroll, rate-limited API calls, analytics.

**Interview Tip:** "Debounce = wait until they stop. Throttle = at most once every N ms." Then implement debounce from memory — it's one of the top three JS coding questions.

**Common Mistakes:** Creating the debounced function inside a React render (a new one every render, so it never actually debounces) — use `useMemo`/`useCallback` or `useRef`.

---

# The Event Loop

## Explain the JavaScript event loop.

### Answer

JS has one thread and one call stack. Async work is handed to Web APIs / libuv, and callbacks come back via queues. The event loop moves work from those queues onto the stack when it's empty.

```
        ┌────────────────────┐
        │    Call Stack      │  ← synchronous code
        └─────────┬──────────┘
                  │ empty?
        ┌─────────▼──────────┐
        │  Microtask Queue   │  ← Promises, queueMicrotask, MutationObserver
        │  (DRAINED FULLY)   │     ALL of them, including newly added ones
        └─────────┬──────────┘
                  │
        ┌─────────▼──────────┐
        │   Render (rAF,     │  ← browser paints (roughly every 16.6ms)
        │   style, layout)   │
        └─────────┬──────────┘
                  │
        ┌─────────▼──────────┐
        │   Macrotask Queue  │  ← setTimeout, setInterval, I/O, UI events
        │   (ONE per tick)   │
        └────────────────────┘
```

**The key rule:** after each macrotask, the **entire** microtask queue is drained before the next macrotask.

### Example — the classic output question

```js
console.log("1");

setTimeout(() => console.log("2"), 0);

Promise.resolve().then(() => console.log("3"));

queueMicrotask(() => console.log("4"));

(async () => {
  console.log("5");
  await null;
  console.log("6");
})();

console.log("7");

// Output: 1, 5, 7, 3, 4, 6, 2
```

**Walkthrough:**
1. `1` — sync
2. `setTimeout` → macrotask queue
3. `.then` → microtask queue
4. `queueMicrotask` → microtask queue
5. `5` — sync (async function body runs synchronously until the first `await`)
6. `await null` → the rest of the function becomes a microtask
7. `7` — sync
8. Stack empty → drain microtasks: `3`, `4`, `6`
9. Then one macrotask: `2`

### Node.js phases

```
timers → pending callbacks → idle/prepare → poll → check (setImmediate) → close
```
In Node, `process.nextTick` has priority over the promise microtask queue.

**Interview Tip:** The sentence that lands: *"An async function runs synchronously until the first `await`; everything after it becomes a microtask."*

**Common Mistakes:** Saying "setTimeout 0 runs immediately"; forgetting microtasks always beat macrotasks; not knowing that an infinite microtask loop starves rendering completely.

---

## What is the difference between microtasks and macrotasks?

### Answer

| | Microtask | Macrotask (task) |
|---|---|---|
| Sources | Promise callbacks, `queueMicrotask`, `MutationObserver`, `await` | `setTimeout`, `setInterval`, `setImmediate`, I/O, UI events, `MessageChannel` |
| Processed | **All**, until the queue is empty | **One** per loop iteration |
| Can starve rendering | Yes | No |
| Priority | Higher | Lower |

### Example

```js
// Microtasks can starve the browser completely
function starve() { Promise.resolve().then(starve); }
// starve();  ← page freezes forever, no paint, no clicks

// Macrotasks yield between iterations
function safe() { setTimeout(safe, 0); }   // page stays responsive

// Chunking heavy work so the UI can breathe
async function processLarge(items) {
  for (let i = 0; i < items.length; i++) {
    process(items[i]);
    if (i % 100 === 0) await new Promise(r => setTimeout(r, 0));  // yield to the browser
  }
}
```

**Interview Tip:** Mention `scheduler.yield()` / `isInputPending()` as the modern APIs for yielding to the browser during long tasks.

---

# ES6+ Features

## What are destructuring, spread and rest?

### Answer

- **Destructuring** — unpack values from arrays/objects into variables.
- **Spread (`...`)** — expand an iterable/object into individual elements.
- **Rest (`...`)** — collect remaining elements into an array/object.

### Example

```js
// Array destructuring
const [first, second = 10, ...rest] = [1, undefined, 3, 4];
// first=1, second=10 (default fires on undefined), rest=[3,4]

// Swap without a temp variable
let a = 1, b = 2;
[a, b] = [b, a];

// Object destructuring with rename, defaults and nesting
const user = { id: 1, profile: { name: "Jaydip", city: "Surat" }, tags: ["js"] };
const { id, profile: { name, country = "India" }, ...others } = user;

// Function parameters
function config({ url, method = "GET", headers = {} } = {}) { … }
config();                        // works — the `= {}` default prevents a TypeError

// Spread
const merged = { ...defaults, ...userOptions };   // later wins
const copy   = [...arr];                          // shallow copy
const combined = [...a, ...b];
Math.max(...nums);

// Rest in functions
const sum = (...nums) => nums.reduce((a, b) => a + b, 0);

// Destructuring in a loop
for (const { id, name } of users) console.log(id, name);

// From a regex / API response
const [, year, month] = "2026-07-25".match(/(\d+)-(\d+)/);
```

**Interview Tip:** Spread is a **shallow** copy — nested objects are still shared. That's the follow-up.

**Common Mistakes:** Destructuring from `undefined` (`const { a } = undefined` throws) — always default: `= {}`.

---

## What is optional chaining and nullish coalescing?

### Answer

- **`?.`** — short-circuits to `undefined` instead of throwing when the left side is `null`/`undefined`.
- **`??`** — returns the right side only when the left is `null` or `undefined` (unlike `||`, which also triggers on `0`, `""`, `false`).
- **`??=`, `||=`, `&&=`** — logical assignment operators.

### Example

```js
const user = { profile: null, settings: { theme: "dark" } };

user.profile.name;        // ❌ TypeError
user.profile?.name;       // ✅ undefined
user.getName?.();         // ✅ undefined if the method doesn't exist
user.list?.[0];           // ✅ safe index access
user?.a?.b?.c?.d;         // deep, safe

// || vs ??  — the crucial difference
const count = 0;
count || 10;              // 10  ❌ 0 is falsy
count ?? 10;              // 0   ✅ 0 is a valid value

const name = "" || "Guest";   // "Guest"
const name2 = "" ?? "Guest";  // ""

// Logical assignment
config.retries ??= 3;     // only if null/undefined
cache[key] ||= compute(); // if falsy
user.isAdmin &&= checkPermissions();
```

**Interview Tip:** The rule: use `??` for defaults where `0`, `""` or `false` are legitimate values (counts, flags, empty inputs). Use `||` only when any falsy value should be replaced.

**Common Mistakes:** Over-chaining `?.` to hide real bugs; you can't mix `??` with `||`/`&&` without parentheses (syntax error, deliberately).

---

## What are template literals and tagged templates?

### Answer

Backtick strings supporting interpolation, multi-line text, and a **tag function** that receives the literal parts and interpolated values separately.

### Example

```js
const name = "Jaydip", n = 3;
`Hello ${name}, you have ${n * 2} messages`;

`multi
line`;

// Tagged template
function highlight(strings, ...values) {
  return strings.reduce((out, str, i) =>
    out + str + (values[i] !== undefined ? `<mark>${values[i]}</mark>` : ""), "");
}
highlight`Hello ${name}, you have ${n} items`;
// "Hello <mark>Jaydip</mark>, you have <mark>3</mark> items"

// Real-world: SQL escaping, styled-components, i18n, GraphQL
const query = sql`SELECT * FROM users WHERE id = ${userId}`;  // auto-parameterised
const Button = styled.button`color: ${p => p.color};`;
```

**Interview Tip:** Tagged templates are how `styled-components`, `graphql-tag` and safe SQL builders work — mentioning that connects the syntax to real libraries.

---

## What are Symbols?

### Answer

A primitive type whose values are **always unique**, used as non-colliding property keys and to hook into language protocols.

### Example

```js
const id = Symbol("id");            // description is for debugging only
Symbol("x") === Symbol("x");        // false — always unique

const user = { name: "Jaydip", [id]: 123 };
Object.keys(user);                  // ["name"] — symbols are hidden
JSON.stringify(user);               // {"name":"Jaydip"}
Object.getOwnPropertySymbols(user); // [Symbol(id)]

// Global registry
Symbol.for("app.id") === Symbol.for("app.id");   // true

// Well-known symbols customise language behaviour
class Temp {
  constructor(c) { this.c = c; }
  [Symbol.toPrimitive](hint) { return hint === "string" ? `${this.c}°C` : this.c; }
  get [Symbol.toStringTag]() { return "Temperature"; }
  *[Symbol.iterator]() { yield this.c; }
}
const t = new Temp(25);
+t;                       // 25
`${t}`;                   // "25°C"
Object.prototype.toString.call(t);  // "[object Temperature]"
```

### When should we use it?

Library metadata on user objects, making a class iterable, and hiding internal properties from serialisation.

**Interview Tip:** `Symbol.iterator` is what makes spread and `for...of` work — that's the practical everyday use.

---

# Error Handling

## How do you handle errors properly in JavaScript?

### Answer

```js
// Custom error classes carry structured context
class ApiError extends Error {
  constructor(message, status, code) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    Error.captureStackTrace?.(this, ApiError);   // Node: cleaner stack
  }
}

try {
  throw new ApiError("Not found", 404, "USER_NOT_FOUND");
} catch (err) {
  if (err instanceof ApiError) console.log(err.status);
  else throw err;                   // re-throw unknown errors — don't swallow them
} finally {
  cleanup();                        // always runs
}

// Errors in async code
async function safe() {
  try { await risky(); }
  catch (e) { report(e); }
}

// ❌ try/catch does NOT catch async callbacks
try {
  setTimeout(() => { throw new Error("boom"); }, 0);   // uncaught!
} catch (e) { /* never reached */ }

// Error cause chaining (ES2022)
try { await db.query(); }
catch (e) { throw new Error("Failed to load user", { cause: e }); }

// Global handlers
window.addEventListener("error", (e) => report(e.error));
window.addEventListener("unhandledrejection", (e) => { report(e.reason); e.preventDefault(); });
// Node
process.on("uncaughtException", handler);
process.on("unhandledRejection", handler);
```

**Interview Tip:** Note that `finally` runs even after a `return` — and a `return` inside `finally` **overrides** the earlier return value, a classic trick question.

**Common Mistakes:** `catch (e) {}` swallowing errors silently; throwing strings instead of `Error` objects (no stack trace); forgetting that a rejected promise with no `.catch` crashes Node (since v15).

---

# Memory & Performance

## What causes memory leaks in JavaScript?

### Answer

1. **Accidental globals** — `x = 5` without a declaration in sloppy mode.
2. **Forgotten timers/intervals** — they hold every referenced variable alive.
3. **Detached DOM nodes** — removed from the DOM but still referenced in JS.
4. **Unremoved event listeners** — especially on `window`/`document`.
5. **Closures over large data** in long-lived callbacks.
6. **Unbounded caches** — a `Map` that grows forever.

### Example

```js
// ❌ Leak: interval keeps `hugeData` alive forever
function start() {
  const hugeData = new Array(1e6).fill("x");
  setInterval(() => console.log(hugeData.length), 1000);
}

// ✅ Clean up
function start() {
  const id = setInterval(tick, 1000);
  return () => clearInterval(id);      // caller can dispose
}

// ❌ Detached node leak
const cache = [];
function remove() {
  const el = document.getElementById("big");
  cache.push(el);                       // keeps the whole subtree in memory
  el.remove();
}

// ✅ WeakMap/WeakRef lets GC reclaim
const meta = new WeakMap();
meta.set(domNode, { clicks: 0 });       // entry disappears with the node

// ✅ AbortController removes many listeners at once
const ctrl = new AbortController();
window.addEventListener("scroll", onScroll, { signal: ctrl.signal });
window.addEventListener("resize", onResize, { signal: ctrl.signal });
ctrl.abort();     // removes BOTH — and cancels in-flight fetches too
```

### How to debug

Chrome DevTools → **Memory** → take heap snapshots before/after an action and compare retained size; use the **Performance** panel's memory timeline to spot a sawtooth that never returns to baseline.

**Interview Tip:** `AbortController` for bulk listener cleanup is a modern, practical answer most candidates miss.

---

## What is garbage collection in JavaScript?

### Answer

Automatic memory reclamation using **mark-and-sweep**: starting from roots (global object, current stack, closures), the collector marks everything reachable and frees the rest. V8 uses a generational approach — a fast "scavenger" for short-lived young objects and a mark-compact collector for the old generation.

### Why do we use it?

Reference counting alone can't handle cycles; reachability can.

### Example

```js
let a = { name: "x" };
a = null;              // the old object is now unreachable → collectible

// Circular references are fine with mark-and-sweep
function cycle() {
  const x = {}, y = {};
  x.ref = y; y.ref = x;
}
cycle();               // both collected — unreachable from any root

// WeakRef — hold a reference without preventing collection
const ref = new WeakRef(bigObject);
ref.deref()?.doSomething();     // may be undefined after GC
```

**Interview Tip:** You cannot force GC in JS. `delete` removes a property, it doesn't free memory directly. Setting to `null` only helps if it was the last reference.

---

# Modules

## What is the difference between CommonJS and ES Modules?

### Answer

| | CommonJS (`require`) | ES Modules (`import`) |
|---|---|---|
| Loading | Synchronous, runtime | Static, hoisted, async-capable |
| Bindings | Copy of the value | **Live binding** (reference) |
| Tree-shaking | No | **Yes** (static analysis) |
| Top-level `await` | No | Yes |
| `this` at top level | `module.exports` | `undefined` |
| Conditional import | `require()` anywhere | `import()` (dynamic) |
| Circular deps | Partial exports | Handled via hoisting/TDZ |
| File extension | `.js`, `.cjs` | `.mjs`, or `"type":"module"` |

### Example

```js
// CommonJS
const fs = require("fs");
module.exports = { a, b };
exports.c = c;                    // shorthand — never reassign `exports` itself

// ES Modules
import fs from "node:fs";
import { a, b as bee } from "./mod.js";
import * as everything from "./mod.js";
export const x = 1;
export default function () {}
export { a, b };
export * from "./other.js";

// Live bindings
// counter.js
export let count = 0;
export const inc = () => count++;
// main.js
import { count, inc } from "./counter.js";
inc();
console.log(count);   // 1 ✅ — with CommonJS this would still be 0

// Dynamic import — code splitting
const { heavy } = await import("./heavy.js");
if (user.isAdmin) { const m = await import("./admin.js"); }
```

**Interview Tip:** "Live bindings vs value copies" is the deepest correct answer, and it explains why ESM enables tree-shaking: the import graph is statically analysable before execution.

**Common Mistakes:** Mixing `require` and `import` in one file; forgetting file extensions in Node ESM (`./mod.js` is required, not `./mod`).

---

# Browser & DOM

## What is event bubbling, capturing and delegation?

### Answer

Events travel in three phases:

1. **Capturing** — window → target (top down)
2. **Target** — fires on the element itself
3. **Bubbling** — target → window (bottom up), the default

**Event delegation** attaches one listener on a common ancestor and uses bubbling to handle events from many children.

### Example

```js
// Third argument: true = capture phase, false/omitted = bubble
parent.addEventListener("click", handler, true);   // capturing
parent.addEventListener("click", handler);         // bubbling

// Delegation — one listener for a list of any size, works for future items
document.querySelector("#list").addEventListener("click", (e) => {
  const btn = e.target.closest(".delete-btn");
  if (!btn) return;
  deleteItem(btn.dataset.id);
});

e.stopPropagation();          // stop bubbling further up
e.stopImmediatePropagation(); // also stop other listeners on THIS element
e.preventDefault();           // cancel default browser behaviour
e.target;                     // the element that was actually clicked
e.currentTarget;              // the element the listener is attached to

// Once, passive, signal
el.addEventListener("click", fn, { once: true });
el.addEventListener("touchstart", fn, { passive: true }); // never calls preventDefault → smoother scroll
el.addEventListener("scroll", fn, { signal: controller.signal });
```

### Why do we use delegation?

- One listener instead of thousands → less memory
- Works for elements added **after** the listener was attached
- No cleanup needed per element

**Interview Tip:** `focus`/`blur` don't bubble — use `focusin`/`focusout` for delegation. Same for `mouseenter`/`mouseleave` vs `mouseover`/`mouseout`.

**Common Mistakes:** Using `e.target` when you need `e.currentTarget` — clicking a nested `<span>` inside a button makes `e.target` the span. `closest()` fixes it.

---

## What is the difference between `fetch` and `XMLHttpRequest`?

### Answer

`fetch` is promise-based, streaming-capable and cleaner. `XHR` is event-based, older, but supports upload progress and synchronous requests.

### Example

```js
// GET with error handling, timeout and cancellation
const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), 5000);

try {
  const res = await fetch("/api/users", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "Jaydip" }),
    credentials: "include",       // send cookies cross-origin
    signal: controller.signal,
    cache: "no-store"
  });

  if (!res.ok) throw new Error(`HTTP ${res.status}`);   // fetch does NOT throw on 4xx/5xx
  const data = await res.json();
} catch (err) {
  if (err.name === "AbortError") console.log("cancelled");
  else throw err;
} finally {
  clearTimeout(timeout);
}
```

**Interview Tip:** Two things `fetch` doesn't do: reject on HTTP error status, and report upload progress. That's when you still reach for XHR or `axios`.

---

# Tricky Outputs

```js
// 1
console.log([1, 2, 3] + [4, 5]);      // "1,2,34,5"  (both → strings, then concat)

// 2
console.log(0.1 + 0.2 === 0.3);       // false — IEEE-754 floats
console.log(0.1 + 0.2);               // 0.30000000000000004
console.log(Math.abs(0.1 + 0.2 - 0.3) < Number.EPSILON);  // true ✅

// 3
console.log(typeof NaN);              // "number"

// 4
console.log([] + {});                 // "[object Object]"
console.log([] == ![]);               // true

// 5
const obj = {};
obj[{}] = "a"; obj[[1]] = "b";
console.log(obj);   // { "[object Object]": "a", "1": "b" }  — keys stringified

// 6
console.log(1 < 2 < 3);               // true   (1<2 → true → 1 < 3)
console.log(3 > 2 > 1);               // false  (3>2 → true → 1 > 1 → false)

// 7
function f() { return
  { a: 1 };                           // ASI inserts a semicolon after return
}
console.log(f());                     // undefined

// 8
console.log("5" - - "2");             // 7

// 9
const arr = [1, 2, 3];
arr.length = 0;
console.log(arr);                     // [] — setting length truncates

// 10
console.log([..."hello"]);            // ["h","e","l","l","o"]

// 11
let x = 1;
{ let x = 2; console.log(x); }        // 2
console.log(x);                       // 1

// 12
console.log(Math.max());              // -Infinity
console.log(Math.min());              // Infinity

// 13
const a = { n: 1 };
const b = a;
a.n = 2;
console.log(b.n);                     // 2

// 14
console.log([1,2,3].map(parseInt));   // [1, NaN, NaN]
// map passes (value, index) → parseInt("2", 1) is invalid radix, parseInt("3", 2) → NaN

// 15
console.log(typeof typeof 1);         // "string"

// 16
(function () {
  console.log(this);                  // window (sloppy) / undefined (strict)
})();

// 17
console.log([10, 1, 3].sort());       // [1, 10, 3] — lexicographic

// 18
async function g() { return 1; }
console.log(g());                     // Promise { 1 } — always a promise

// 19
console.log("b" + "a" + +"a" + "a");  // "baNaNa"

// 20
const s = new Set([1, 1, 2]);
console.log(s.size);                  // 2

// 21
console.log(null + 1);                // 1     (null → 0)
console.log(undefined + 1);           // NaN

// 22
var a = 1;
function outer() { console.log(a); var a = 2; }
outer();                              // undefined — inner `a` is hoisted

// 23
console.log([,,].length);             // 2 — trailing comma doesn't count

// 24
try { return 1; } finally { return 2; }   // returns 2

// 25
console.log(+"" , +[] , +{} , +null , +undefined);  // 0, 0, NaN, 0, NaN
```

---

# Rapid Fire

**What is the difference between `slice` and `splice`?**
`slice(start, end)` copies without mutating; `splice(start, count, ...items)` mutates, removing/inserting in place.

**What is `Array.from` vs the spread operator?**
`Array.from` works on array-likes (`{length: 3}`, `arguments`) *and* iterables, and takes a map function: `Array.from({length: 5}, (_, i) => i)`. Spread only works on iterables.

**What is `Function.prototype.length`?**
The number of declared parameters before the first default or rest parameter.

**What is currying?**
Transforming `f(a, b, c)` into `f(a)(b)(c)`. Enables partial application and point-free composition.

**What is a pure function?**
Same input → same output, with no side effects. Easy to test, memoize and parallelise.

**What is immutability and why does it matter?**
Never modifying existing data; create new copies instead. It makes change detection a reference comparison — the basis of React's re-render logic and Redux.

**What is the difference between shallow and deep copy?**
Shallow copies the top level only (nested references shared). Deep copies recursively.

**What is `use strict`?**
Opt-in restricted mode: no implicit globals, `this` is `undefined` in plain functions, silent assignment failures become errors, duplicate parameters are banned. ES modules and class bodies are always strict.

**What is the Temporal Dead Zone?**
The span from a block's start until a `let`/`const`/`class` declaration is evaluated, during which access throws a ReferenceError.

**What is `globalThis`?**
The universal reference to the global object — `window` in browsers, `global` in Node, `self` in workers.

**What is `Number.MAX_SAFE_INTEGER`?**
2⁵³−1 (9007199254740991). Beyond it, integer precision breaks — use `BigInt`.

**Why is `0.1 + 0.2 !== 0.3`?**
IEEE-754 double precision cannot represent 0.1 or 0.2 exactly in binary. Compare with `Number.EPSILON` or work in integer cents.

**What is event.preventDefault vs return false?**
In plain JS handlers, `return false` does nothing; in jQuery it did both `preventDefault` and `stopPropagation`. Always call them explicitly.

**What is the difference between `innerHTML` and `createElement`?**
`innerHTML` parses a string (XSS risk, replaces children, destroys listeners); `createElement` + `append` is safe and preserves existing nodes.

**What is XSS and how do you prevent it in JS?**
Injecting executable script through untrusted input. Prevent with `textContent` instead of `innerHTML`, sanitisation (DOMPurify), a strict CSP and HttpOnly cookies.

**What is CORS?**
A browser policy requiring the server to opt in via `Access-Control-Allow-Origin` headers before JS can read a cross-origin response. It's enforced by the browser, not the server.

**What is the difference between `localStorage` and a cookie for auth?**
localStorage is readable by any XSS payload; an `HttpOnly` cookie is not. Cookies need CSRF protection (`SameSite`).

**What is a service worker?**
A background script that proxies network requests, enabling offline caching and push notifications.

**What is `Object.entries`/`keys`/`values`?**
Return own enumerable string-keyed properties as `[k,v]` pairs / keys / values. `Object.fromEntries` reverses `entries`.

**What is the difference between `Object.assign` and spread?**
Nearly identical for plain objects, but `Object.assign` triggers setters on the target and mutates it; spread always creates a new object using plain assignment.

**What is `structuredClone`?**
Native deep clone supporting cycles, `Date`, `Map`, `Set`, `RegExp` and typed arrays — but not functions or DOM nodes.

**What is tree shaking?**
Removing unused exports at build time, made possible by ESM's static import structure.

**What is the difference between `defer` and `type="module"`?**
Both defer execution until after parsing; modules are also strict-mode, scoped, and deduplicated by URL.

**What are Web Workers?**
Background threads without DOM access, communicating via `postMessage` with structured cloning.

**What is `Intl`?**
The built-in internationalisation API: `Intl.NumberFormat`, `DateTimeFormat`, `RelativeTimeFormat`, `Collator` — use it instead of hand-rolled formatting.

**What is `Array.prototype.at()`?**
Index access that supports negatives: `arr.at(-1)` is the last element.

**What is `Object.groupBy`?**
Groups an iterable into an object by a key function — the native version of lodash's `groupBy`.

**What is the difference between `throw` and `Promise.reject`?**
Inside an `async` function they're equivalent. In a plain function, `throw` is synchronous and won't be caught by `.catch()`.

---

## 📌 Interview Checklist

- [ ] Explain closures with a real use case, not just the definition
- [ ] Predict the output of the event loop puzzle above
- [ ] Sequential vs parallel `await` — which and why?
- [ ] Implement `debounce`, `throttle`, `curry` and `deepClone` from memory
- [ ] `==` vs `===` vs `Object.is`
- [ ] `var` / `let` / `const` and the TDZ
- [ ] Four ways `this` is bound
- [ ] Write `myNew`, `myBind`, `myPromiseAll`
- [ ] CommonJS vs ESM live bindings
- [ ] Name five sources of memory leaks
