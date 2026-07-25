# 🔷 TypeScript Interview Questions

> Types · Interfaces · Generics · Utility Types · Narrowing · Config · Patterns

---

## Table of Contents

1. [Fundamentals](#fundamentals)
2. [Types vs Interfaces](#types-vs-interfaces)
3. [Union, Intersection & Narrowing](#union-intersection--narrowing)
4. [Generics](#generics)
5. [Utility Types](#utility-types)
6. [Advanced Types](#advanced-types)
7. [Classes & OOP](#classes--oop)
8. [Modules & Declarations](#modules--declarations)
9. [tsconfig & Compiler](#tsconfig--compiler)
10. [React + TypeScript](#react--typescript)
11. [Rapid Fire](#rapid-fire)

---

# Fundamentals

## What is TypeScript and why use it?

### Answer

A statically-typed superset of JavaScript that compiles to plain JS. Types exist only at **compile time** — they are completely erased from the output.

### Why do we use it?

1. **Catch bugs before runtime** — typos, wrong argument order, null access.
2. **Self-documenting code** — the signature is the documentation.
3. **Refactoring confidence** — rename a field and the compiler finds all 40 usages.
4. **IDE experience** — real autocomplete, go-to-definition, inline errors.
5. **Safer API contracts** between frontend and backend.

### When should we use it?

Any project with more than one developer or expected to live more than a few months. The cost is build setup and some type-wrangling; the payoff scales with codebase size and team size.

### Example

```ts
// JavaScript — fails silently at runtime
function getTotal(items) {
  return items.reduce((sum, i) => sum + i.price, 0);
}
getTotal(null);         // 💥 TypeError at runtime, in production

// TypeScript — fails at compile time, on your machine
interface Item { price: number; qty: number }

function getTotal(items: Item[]): number {
  return items.reduce((sum, i) => sum + i.price * i.qty, 0);
}
getTotal(null);         // ❌ Argument of type 'null' is not assignable
```

**Interview Tip:** Say clearly: *"TypeScript gives zero runtime guarantees."* Data from an API is still `any` in reality — you need runtime validation (Zod, Valibot) at the boundary. That's the answer that separates real experience from tutorial knowledge.

**Common Mistakes:** Believing types protect you from bad API responses; using `any` to silence errors instead of fixing the model.

---

## What are the basic types in TypeScript?

### Answer

```ts
// Primitives
let name: string = 'Jaydip';
let age: number = 25;
let active: boolean = true;
let big: bigint = 100n;
let sym: symbol = Symbol('id');
let nothing: null = null;
let notSet: undefined = undefined;

// Arrays & tuples
let nums: number[] = [1, 2, 3];
let strs: Array<string> = ['a'];
let pair: [string, number] = ['age', 25];              // fixed length & order
let named: [x: number, y: number] = [1, 2];            // labelled tuple
let rest: [string, ...number[]] = ['a', 1, 2, 3];      // variadic tuple

// Objects
let user: { id: number; name?: string; readonly role: string } = { id: 1, role: 'admin' };

// Functions
let fn: (a: number, b: number) => number = (a, b) => a + b;
function log(msg: string, level: 'info' | 'error' = 'info'): void {}

// Special types
let anything: any;          // ❌ disables all checking — avoid
let unknownVal: unknown;    // ✅ safe any — must narrow before use
let never_: never;          // a value that can never occur
let voidFn: () => void;     // returns nothing meaningful

// Literal types
let dir: 'up' | 'down' = 'up';
const config = { mode: 'dark' } as const;   // all props readonly + literal types
```

**Interview Tip:** `void` vs `never`: a `void` function returns (with no useful value); a `never` function *never returns* — it throws or loops forever.

**Common Mistakes:** Annotating everything. TypeScript's inference is excellent — `const x = 5` is already `5`. Annotate function parameters and public APIs; let inference do the rest.

---

## What is the difference between `any`, `unknown`, `never` and `void`?

### Answer

| Type | Meaning | Assignable **to** it | Assignable **from** it |
|---|---|---|---|
| `any` | Opt out of checking | Everything | Everything (unsafe) |
| `unknown` | Top type — "something, unspecified" | Everything | **Nothing** until narrowed |
| `never` | Bottom type — impossible value | Nothing | Everything |
| `void` | No meaningful return | `undefined` (and `null` in non-strict) | Nothing useful |

### Example

```ts
// any — no protection at all
let a: any = 'hello';
a.foo.bar.baz();          // ✅ compiles, 💥 crashes at runtime

// unknown — forces you to prove the type first
let u: unknown = 'hello';
u.toUpperCase();          // ❌ 'u' is of type 'unknown'
if (typeof u === 'string') u.toUpperCase();   // ✅ narrowed

// never — exhaustiveness checking, the killer use case
type Shape = { kind: 'circle'; r: number } | { kind: 'square'; s: number };

function area(shape: Shape): number {
  switch (shape.kind) {
    case 'circle': return Math.PI * shape.r ** 2;
    case 'square': return shape.s ** 2;
    default:
      const _exhaustive: never = shape;   // ❌ compile error if you add a new shape
      throw new Error(`Unhandled: ${_exhaustive}`);
  }
}

// never as a return type
function fail(msg: string): never { throw new Error(msg); }
```

### When should we use it?

Use `unknown` for anything crossing a trust boundary — `JSON.parse`, API responses, `catch (e: unknown)`. Use `never` for exhaustiveness. Use `any` essentially never; if you must, add a `// TODO` and a reason.

**Interview Tip:** The exhaustiveness trick with `never` is the single most impressive TS pattern to show. It turns "I added a new enum case and forgot to handle it" from a production bug into a compile error.

**Common Mistakes:** `catch (e)` — in modern TS `e` is `unknown`, so you must narrow: `if (e instanceof Error) e.message`.

---

# Types vs Interfaces

## What is the difference between `type` and `interface`?

### Answer

| | `interface` | `type` |
|---|---|---|
| Declaration merging | **Yes** (reopens) | No |
| Extends | `extends` | `&` intersection |
| Unions | **No** | **Yes** |
| Primitives / tuples | No | **Yes** |
| Mapped & conditional types | No | **Yes** |
| Implements (classes) | Yes | Yes (if object shape) |
| Error messages | Often cleaner | Can be verbose |
| Performance on large unions | Slightly better | Slightly worse |

### Example

```ts
// Interface — extendable and mergeable
interface User { id: number; name: string }
interface User { email: string }        // ✅ declaration merging — now has 3 props
interface Admin extends User { role: string }

// Type — can express everything else
type ID = string | number;                          // union
type Point = [number, number];                      // tuple
type Handler = (e: Event) => void;                  // function
type Keys = keyof User;                             // 'id'|'name'|'email'
type Partial2<T> = { [K in keyof T]?: T[K] };       // mapped
type IsString<T> = T extends string ? true : false; // conditional

// Intersection instead of extends
type AdminType = User & { role: string };
```

### When should we use it?

Common team convention: **`interface` for object shapes and public APIs** (mergeable, better errors, familiar to OO devs), **`type` for everything else** (unions, tuples, function types, mapped/conditional types). Consistency matters more than the choice.

**Interview Tip:** Declaration merging is the one genuinely unique interface feature — it's how you augment third-party types:

```ts
declare global {
  interface Window { dataLayer: unknown[] }
}
```

**Common Mistakes:** Trying `type A = { x: 1 }; type A = { y: 2 }` — duplicate identifier error. Only interfaces merge.

---

## What is structural typing (duck typing)?

### Answer

TypeScript compares types by **shape**, not by name. If two types have compatible members, they're compatible — no explicit `implements` needed.

### Example

```ts
interface Point { x: number; y: number }

class Vector {
  constructor(public x: number, public y: number) {}
}

const p: Point = new Vector(1, 2);   // ✅ compatible — same shape, no `implements`

function log(point: Point) {}
log({ x: 1, y: 2 });                 // ✅

// Excess property check on object LITERALS only
log({ x: 1, y: 2, z: 3 });           // ❌ 'z' does not exist in type 'Point'

const obj = { x: 1, y: 2, z: 3 };
log(obj);                            // ✅ allowed! variables skip the excess check
```

### Why do we use it?

It makes TS ergonomic with plain JS objects and third-party code — you don't need to own the class to satisfy a type.

**Interview Tip:** The "object literal vs variable" excess-property difference surprises people. Literals are checked strictly because a literal with extra props is almost always a typo; a pre-existing variable might legitimately have more.

**Common Mistakes:** Assuming nominal typing. Two distinct concepts with the same shape (`UserId` and `PostId`, both `string`) are interchangeable — use **branded types** if you need them separated:

```ts
type UserId = string & { readonly __brand: 'UserId' };
type PostId = string & { readonly __brand: 'PostId' };
```

---

# Union, Intersection & Narrowing

## What are union and intersection types?

### Answer

- **Union `A | B`** — the value is *either* A or B. You can only access members common to both.
- **Intersection `A & B`** — the value is *both*. You get all members of both.

### Example

```ts
type Status = 'idle' | 'loading' | 'success' | 'error';   // string literal union

type Result =
  | { status: 'success'; data: User }
  | { status: 'error'; error: string };                    // discriminated union

type Timestamps = { createdAt: Date; updatedAt: Date };
type Entity = { id: string } & Timestamps;                 // intersection

// Union of objects — only shared members are accessible
type A = { a: string; shared: number };
type B = { b: string; shared: number };
declare const ab: A | B;
ab.shared;   // ✅
ab.a;        // ❌ might be B

// Conflicting intersections collapse to never
type Bad = { x: string } & { x: number };   // x: never
```

**Interview Tip:** Counter-intuitively, a union of *object types* has fewer accessible properties, while an intersection has more. People expect the opposite from set theory — explain that a union widens the set of *values*, which narrows the guaranteed *members*.

---

## What is type narrowing and what are the narrowing techniques?

### Answer

Refining a broad type to a specific one within a code branch. TypeScript's control-flow analysis tracks this automatically.

### Example

```ts
// 1. typeof guard
function pad(value: string | number) {
  if (typeof value === 'number') return ' '.repeat(value);
  return value.trim();                 // value is string here
}

// 2. instanceof
function handle(e: unknown) {
  if (e instanceof Error) console.log(e.message);
}

// 3. in operator
type Dog = { bark(): void };
type Cat = { meow(): void };
function speak(pet: Dog | Cat) {
  if ('bark' in pet) pet.bark();
  else pet.meow();
}

// 4. Discriminated union (the best pattern)
type Action =
  | { type: 'add'; payload: number }
  | { type: 'remove'; id: string }
  | { type: 'reset' };

function reducer(action: Action) {
  switch (action.type) {
    case 'add': return action.payload;   // payload exists only here
    case 'remove': return action.id;
    case 'reset': return 0;
  }
}

// 5. Truthiness / equality
function f(x?: string | null) {
  if (!x) return;
  x.toUpperCase();                       // string
}

// 6. Custom type predicate (user-defined type guard)
function isUser(value: unknown): value is User {
  return (
    typeof value === 'object' && value !== null &&
    'id' in value && 'name' in value
  );
}

// 7. Assertion function
function assertIsString(v: unknown): asserts v is string {
  if (typeof v !== 'string') throw new Error('Not a string');
}
function g(v: unknown) {
  assertIsString(v);
  v.toUpperCase();                       // narrowed for the rest of the scope
}

// 8. Array.filter with a predicate — removes null/undefined from the type
const values: (string | null)[] = ['a', null, 'b'];
const clean: string[] = values.filter((v): v is string => v !== null);
```

**Interview Tip:** Discriminated unions with a literal `type`/`kind` field are the idiomatic way to model state in TS — API results, Redux actions, form states. Combine with the `never` exhaustiveness check.

**Common Mistakes:** Narrowing is lost after an `await` or a callback boundary, because the value could have changed. Copy to a `const` first.

---

## What is a type predicate / user-defined type guard?

### Answer

A function whose return type is `arg is Type`. When it returns `true`, TypeScript narrows the argument in the calling scope.

### Example

```ts
interface ApiSuccess { ok: true; data: unknown }
interface ApiError { ok: false; message: string }
type ApiResponse = ApiSuccess | ApiError;

function isSuccess(res: ApiResponse): res is ApiSuccess {
  return res.ok;
}

const res: ApiResponse = await getData();
if (isSuccess(res)) {
  console.log(res.data);      // ✅ narrowed to ApiSuccess
} else {
  console.log(res.message);   // ✅ narrowed to ApiError
}

// Generic non-nullable guard
const isDefined = <T,>(v: T | null | undefined): v is T => v != null;
const items = [1, null, 2, undefined].filter(isDefined);  // number[]
```

**Interview Tip:** Type predicates are **unchecked assertions** — TypeScript trusts you. If your predicate logic is wrong, you get an unsound type with no error. That's why runtime validators (Zod) are safer at API boundaries.

---

# Generics

## What are generics and why do we use them?

### Answer

Type parameters that let a function, class or type work over many types while preserving the relationship between input and output.

### Why do we use it?

Without generics you either duplicate code per type or lose all type information with `any`.

### Example

```ts
// ❌ loses type info
function firstAny(arr: any[]): any { return arr[0]; }
const x = firstAny(['a']);        // any — no autocomplete

// ✅ generic preserves it
function first<T>(arr: T[]): T | undefined { return arr[0]; }
const y = first(['a']);           // string ✅ (inferred, no annotation needed)

// Constraints
function longest<T extends { length: number }>(a: T, b: T): T {
  return a.length >= b.length ? a : b;
}
longest('abc', 'ab');             // ✅ strings have length
longest(3, 4);                    // ❌ number has no length

// keyof constraint — type-safe property access
function getProp<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key];
}
const user = { id: 1, name: 'Jaydip' };
getProp(user, 'name');            // string ✅
getProp(user, 'email');           // ❌ not a key of user

// Default type parameter
interface ApiResponse<T = unknown> { data: T; status: number }

// Generic class
class Store<T extends { id: string }> {
  #items = new Map<string, T>();
  add(item: T): this { this.#items.set(item.id, item); return this; }
  get(id: string): T | undefined { return this.#items.get(id); }
  all(): T[] { return [...this.#items.values()]; }
}

// Multiple params with a relationship
function zip<A, B>(a: A[], b: B[]): [A, B][] {
  return a.map((item, i) => [item, b[i]]);
}
```

**Interview Tip:** The rule of thumb: *a type parameter must appear at least twice* (or in the return type) to earn its place. `function f<T>(x: T): void` is a code smell — `T` is doing nothing.

**Common Mistakes:** Over-generalising simple functions; using `<T>` in a `.tsx` file without a trailing comma (`<T,>`), where it's parsed as JSX.

---

## What are conditional types and `infer`?

### Answer

`T extends U ? X : Y` — a type-level ternary. `infer` captures a type variable inside the `extends` clause.

### Example

```ts
type IsArray<T> = T extends any[] ? true : false;
type A = IsArray<string[]>;   // true
type B = IsArray<string>;     // false

// infer — extract inner types
type ElementOf<T> = T extends (infer U)[] ? U : never;
type C = ElementOf<string[]>;                  // string

type MyReturnType<T> = T extends (...args: any[]) => infer R ? R : never;
type D = MyReturnType<() => Promise<User>>;    // Promise<User>

type Awaited2<T> = T extends Promise<infer U> ? Awaited2<U> : T;  // recursive
type E = Awaited2<Promise<Promise<string>>>;   // string

type MyParameters<T> = T extends (...args: infer P) => any ? P : never;
type F = MyParameters<(a: string, b: number) => void>;  // [string, number]

// Distributive conditional types — applies to each union member
type ToArray<T> = T extends any ? T[] : never;
type G = ToArray<string | number>;    // string[] | number[]

// Disable distribution by wrapping in a tuple
type ToArrayNonDist<T> = [T] extends [any] ? T[] : never;
type H = ToArrayNonDist<string | number>;   // (string | number)[]

// Practical: exclude keys by value type
type NonFunctionKeys<T> = {
  [K in keyof T]: T[K] extends Function ? never : K
}[keyof T];

type Data = NonFunctionKeys<{ id: number; save(): void }>;  // 'id'
```

**Interview Tip:** Distributivity over naked type parameters is the subtlest rule in the type system. `Exclude<T, U>` works precisely because of it: `T extends U ? never : T`.

---

# Utility Types

## What are the built-in utility types?

### Answer

```ts
interface User {
  id: number;
  name: string;
  email: string;
  address?: { city: string };
}

// --- Object transformations ---
type PartialUser  = Partial<User>;              // all optional
type RequiredUser = Required<User>;             // all required
type ReadonlyUser = Readonly<User>;             // all readonly (shallow)
type UserPreview  = Pick<User, 'id' | 'name'>;  // keep listed keys
type NoEmail      = Omit<User, 'email'>;        // drop listed keys

// --- Union transformations ---
type Status = 'a' | 'b' | 'c';
type NoA = Exclude<Status, 'a'>;                // 'b' | 'c'
type OnlyA = Extract<Status, 'a' | 'z'>;        // 'a'
type Defined = NonNullable<string | null>;      // string

// --- Records & maps ---
type Roles = Record<'admin' | 'user', string[]>;   // { admin: string[]; user: string[] }
type Dict = Record<string, number>;

// --- Function types ---
type Fn = (a: string, b: number) => Promise<User>;
type P = Parameters<Fn>;          // [string, number]
type R = ReturnType<Fn>;          // Promise<User>
type AR = Awaited<ReturnType<Fn>>;// User
type CP = ConstructorParameters<typeof Date>;
type IT = InstanceType<typeof Date>;
type TP = ThisParameterType<Fn>;

// --- String manipulation ---
type Upper = Uppercase<'hello'>;      // 'HELLO'
type Lower = Lowercase<'HELLO'>;      // 'hello'
type Cap   = Capitalize<'hello'>;     // 'Hello'
type Uncap = Uncapitalize<'Hello'>;   // 'hello'
```

### Composing them — the real skill

```ts
// Update payload: id required, everything else optional
type UpdateUser = Pick<User, 'id'> & Partial<Omit<User, 'id'>>;

// Form values: everything a string
type FormValues<T> = { [K in keyof T]: string };

// Make specific keys optional
type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
type Draft = PartialBy<User, 'email' | 'id'>;

// Make specific keys required
type RequiredBy<T, K extends keyof T> = Omit<T, K> & Required<Pick<T, K>>;

// Deep partial (recursive)
type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K];
};

// Deep readonly
type DeepReadonly<T> = {
  readonly [K in keyof T]: T[K] extends object ? DeepReadonly<T[K]> : T[K];
};
```

**Interview Tip:** Be ready to **implement** `Partial`, `Pick`, `Omit`, `Exclude` and `ReturnType` from scratch — it's a very common follow-up:

```ts
type MyPartial<T>          = { [K in keyof T]?: T[K] };
type MyRequired<T>         = { [K in keyof T]-?: T[K] };
type MyReadonly<T>         = { readonly [K in keyof T]: T[K] };
type MyPick<T, K extends keyof T> = { [P in K]: T[P] };
type MyExclude<T, U>       = T extends U ? never : T;
type MyOmit<T, K extends keyof any> = MyPick<T, MyExclude<keyof T, K>>;
type MyReturnType<T>       = T extends (...a: any[]) => infer R ? R : never;
type MyRecord<K extends keyof any, T> = { [P in K]: T };
```

**Common Mistakes:** `Omit` doesn't validate that the key exists (its constraint is `keyof any`), so a typo silently does nothing. `Pick` does validate.

---

## What are mapped types and key remapping?

### Answer

Types that iterate over the keys of another type to build a new one, optionally transforming keys with `as`.

### Example

```ts
// Basic mapped type
type Optional<T> = { [K in keyof T]?: T[K] };

// Modifiers: + adds, - removes
type Mutable<T> = { -readonly [K in keyof T]: T[K] };
type Concrete<T> = { [K in keyof T]-?: T[K] };

// Key remapping with `as` + template literal types
type Getters<T> = {
  [K in keyof T as `get${Capitalize<string & K>}`]: () => T[K];
};

interface Person { name: string; age: number }
type PersonGetters = Getters<Person>;
// { getName: () => string; getAge: () => number }

// Filter keys out by returning never
type RemoveKind<T> = {
  [K in keyof T as K extends 'kind' ? never : K]: T[K];
};

// Events from a state shape
type Events<T> = {
  [K in keyof T as `on${Capitalize<string & K>}Change`]: (value: T[K]) => void;
};

// Value-based filtering
type PickByType<T, V> = {
  [K in keyof T as T[K] extends V ? K : never]: T[K];
};
type StringProps = PickByType<{ a: string; b: number; c: string }, string>;
// { a: string; c: string }
```

**Interview Tip:** Template literal types + key remapping is how libraries generate typed APIs (styled-system props, tRPC routes, Prisma clients). Mention that concrete use case.

---

## What are template literal types?

### Answer

String literal types built from other types using template syntax.

### Example

```ts
type Color = 'red' | 'blue';
type Shade = 'light' | 'dark';
type Palette = `${Shade}-${Color}`;
// 'light-red' | 'light-blue' | 'dark-red' | 'dark-blue'

type EventName<T extends string> = `on${Capitalize<T>}`;
type Click = EventName<'click'>;   // 'onClick'

// Typed CSS units
type Px = `${number}px`;
const width: Px = '10px';          // ✅
const bad: Px = '10';              // ❌

// Typed route params
type ExtractParams<T extends string> =
  T extends `${string}:${infer Param}/${infer Rest}`
    ? Param | ExtractParams<`/${Rest}`>
    : T extends `${string}:${infer Param}`
      ? Param
      : never;

type Params = ExtractParams<'/users/:userId/posts/:postId'>;
// 'userId' | 'postId'

// Typed object paths
type Paths<T> = T extends object
  ? { [K in keyof T]: K extends string
      ? T[K] extends object ? K | `${K}.${Paths<T[K]>}` : K
      : never }[keyof T]
  : never;

type P = Paths<{ user: { address: { city: string } } }>;
// 'user' | 'user.address' | 'user.address.city'
```

**Interview Tip:** This is how `react-hook-form` types deeply-nested field names and how tRPC types route paths — real, shipping usage.

---

# Advanced Types

## What is `satisfies` and how does it differ from `as`?

### Answer

- **`as`** — a type assertion. You tell the compiler "trust me". It can be wrong and can widen or lose information.
- **`satisfies`** — validates that an expression matches a type **while preserving the narrower inferred type**.

### Example

```ts
type Config = Record<string, string | number>;

// ❌ `as` widens — you lose the specific keys
const a = { host: 'localhost', port: 3000 } as Config;
a.host;      // string | number — lost the specific type
a.typo;      // ✅ no error! Record<string, ...> allows anything

// ✅ `satisfies` validates but keeps the literal type
const b = { host: 'localhost', port: 3000 } satisfies Config;
b.host;      // string ✅
b.port;      // number ✅
b.typo;      // ❌ error — property doesn't exist

// Real-world: route config
const routes = {
  home: '/',
  user: '/users/:id',
} satisfies Record<string, `/${string}`>;

type RouteKey = keyof typeof routes;   // 'home' | 'user' — preserved!

// Colours
const theme = {
  primary: '#2563eb',
  danger: '#dc2626',
} satisfies Record<string, `#${string}`>;
```

### When should we use it?

Use `satisfies` for config objects, constant maps and theme definitions — anywhere you want validation *and* precise inference. Use `as` only for genuinely unsafe casts you've reasoned about (e.g. `as unknown as T` at a boundary).

**Interview Tip:** `satisfies` (TS 4.9) is the modern answer to "how do I validate an object without widening it?" Knowing it signals you're current.

**Common Mistakes:** Using `as` to fix an error you don't understand — you've silenced the compiler, not the bug.

---

## What is declaration merging and module augmentation?

### Answer

Interfaces (and namespaces) with the same name in the same scope merge. **Module augmentation** uses this to extend third-party types.

### Example

```ts
// Extend the global Window
declare global {
  interface Window {
    dataLayer: Record<string, unknown>[];
    gtag: (...args: unknown[]) => void;
  }
}

// Extend Express Request with the authenticated user
declare module 'express-serve-static-core' {
  interface Request {
    user?: { id: string; role: 'admin' | 'user' };
  }
}
// Now req.user is typed everywhere in your middleware

// Extend NodeJS env vars
declare global {
  namespace NodeJS {
    interface ProcessEnv {
      DATABASE_URL: string;
      JWT_SECRET: string;
      NODE_ENV: 'development' | 'production' | 'test';
    }
  }
}

// Type an untyped JS module
declare module 'legacy-lib' {
  export function doThing(input: string): number;
}

// Non-code imports
declare module '*.svg' {
  const content: string;
  export default content;
}
```

**Interview Tip:** The Express `Request.user` augmentation is the single most commonly needed one in a Node/TS codebase — a great concrete example to volunteer.

**Common Mistakes:** Putting `declare global` in a file with no imports/exports — it must be a module (add `export {}`) for augmentation to work correctly.

---

## What are decorators?

### Answer

Functions that annotate and modify classes, methods, properties and parameters. TypeScript 5.0+ implements the **Stage 3 standard** decorators; the older `experimentalDecorators` flag enables the legacy version used by Angular and NestJS.

### Example

```ts
// Stage 3 method decorator (TS 5.0+)
function logged<This, Args extends any[], Return>(
  target: (this: This, ...args: Args) => Return,
  context: ClassMethodDecoratorContext
) {
  return function (this: This, ...args: Args): Return {
    console.log(`Calling ${String(context.name)}(${args})`);
    const result = target.call(this, ...args);
    console.log(`Returned ${result}`);
    return result;
  };
}

class Calculator {
  @logged
  add(a: number, b: number) { return a + b; }
}

// Legacy decorators (NestJS / Angular style)
@Controller('users')
class UserController {
  @Get(':id')
  findOne(@Param('id') id: string) { … }
}
```

```jsonc
// tsconfig for legacy decorators
{ "compilerOptions": { "experimentalDecorators": true, "emitDecoratorMetadata": true } }
```

**Interview Tip:** If you use NestJS or TypeORM, know that they rely on **legacy** decorators plus `reflect-metadata` for dependency injection — they aren't yet on the Stage 3 standard.

---

# Classes & OOP

## Explain access modifiers and class features in TypeScript.

### Answer

```ts
class Account {
  // Access modifiers (compile-time only)
  public id: string;
  private balance: number;         // TS-only — visible at runtime
  protected owner: string;         // accessible in subclasses
  readonly createdAt = new Date();

  // True runtime privacy (ES2022)
  #pin: string;

  static instances = 0;
  static readonly BANK = 'HDFC';

  // Parameter properties — shorthand for declare + assign
  constructor(id: string, private secret: string, protected role = 'user') {
    this.id = id;
    this.balance = 0;
    this.#pin = '0000';
    Account.instances++;
  }

  // Getter / setter
  get formattedBalance(): string { return `₹${this.balance}`; }
  set deposit(amount: number) {
    if (amount <= 0) throw new RangeError('Must be positive');
    this.balance += amount;
  }

  // Method overloads
  transfer(to: string, amount: number): boolean;
  transfer(to: Account, amount: number): boolean;
  transfer(to: string | Account, amount: number): boolean {
    const id = typeof to === 'string' ? to : to.id;
    return true;
  }

  static create(id: string): Account { return new Account(id, 'x'); }
}

// Abstract classes
abstract class Shape {
  abstract area(): number;                 // must be implemented
  describe(): string { return `Area: ${this.area()}`; }  // shared
}

class Circle extends Shape {
  constructor(private r: number) { super(); }
  area(): number { return Math.PI * this.r ** 2; }
}

// Implements — a contract check
interface Serializable { toJSON(): string }
class User implements Serializable {
  toJSON() { return '{}'; }
}
```

**Interview Tip:** `private` is erased at compile time — `(account as any).balance` works at runtime. `#pin` is enforced by the JS engine. If you need real privacy, use `#`.

**Common Mistakes:** Using `implements` and expecting the compiler to add the members. It only *checks* — you still write them.

---

# Modules & Declarations

## What is the difference between `import type` and a regular import?

### Answer

`import type` imports only type information, which is guaranteed to be erased at compile time. A regular import may keep a runtime require/import for side effects.

### Example

```ts
import type { User } from './models';        // erased completely
import { formatUser } from './utils';        // runtime import
import { type User, formatUser } from './x'; // inline type modifier

export type { User };
```

```jsonc
{ "compilerOptions": { "verbatimModuleSyntax": true } }
// Forces explicit `type` modifiers — the modern recommended setting
```

### Why do we use it?

1. Avoids accidental runtime imports of type-only modules (which can break tree-shaking or cause circular imports).
2. Makes the emit predictable — critical for bundlers and `isolatedModules`.

**Interview Tip:** `verbatimModuleSyntax` replaced the older `importsNotUsedAsValues` and `preserveValueImports` flags. It's the current best practice.

---

# tsconfig & Compiler

## What are the most important tsconfig options?

### Answer

```jsonc
{
  "compilerOptions": {
    /* Type checking — the important half */
    "strict": true,                       // enables all the flags below
    "noImplicitAny": true,
    "strictNullChecks": true,             // the single most valuable flag
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "strictPropertyInitialization": true,
    "noImplicitThis": true,
    "useUnknownInCatchVariables": true,

    /* Extra safety, not in `strict` */
    "noUncheckedIndexedAccess": true,     // arr[0] is T | undefined
    "exactOptionalPropertyTypes": true,   // ?: x can't be set to undefined
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,

    /* Modules */
    "module": "ESNext",
    "moduleResolution": "bundler",        // or "node16" for Node
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "verbatimModuleSyntax": true,
    "isolatedModules": true,              // required by esbuild/SWC/Babel

    /* Emit */
    "noEmit": true,                       // bundler handles output
    "declaration": true,                  // .d.ts for libraries
    "sourceMap": true,
    "skipLibCheck": true,                 // skip type-checking node_modules

    /* Paths */
    "baseUrl": ".",
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist"]
}
```

### The highest-value flags

1. **`strict: true`** — non-negotiable for new projects.
2. **`noUncheckedIndexedAccess`** — catches the entire class of "array access returned undefined" bugs.
3. **`skipLibCheck: true`** — big build-speed win, low risk.

**Interview Tip:** `strictNullChecks` is the flag that eliminates the "billion dollar mistake". Without it, `null` and `undefined` are assignable to every type and TypeScript gives you almost none of its safety value.

**Common Mistakes:** Migrating a JS codebase with `strict: true` from day one and drowning in errors. Enable flags incrementally, and use `allowJs` + `checkJs` during transition.

---

## How does TypeScript handle `null` and `undefined`?

### Answer

With `strictNullChecks` on, `null` and `undefined` have their own types and are not assignable to others. You must narrow or use `?.` / `??`.

### Example

```ts
let name: string = null;              // ❌ with strictNullChecks
let maybe: string | null = null;      // ✅

function find(id: string): User | undefined { … }

const user = find('1');
user.name;                            // ❌ possibly undefined
user?.name;                           // ✅ optional chaining
user!.name;                           // ⚠️ non-null assertion — you take responsibility

// Better: narrow explicitly
if (!user) throw new NotFoundError();
user.name;                            // ✅ narrowed

// Nullish coalescing for defaults
const displayName = user?.name ?? 'Guest';

// Definite assignment assertion
class Service {
  private client!: Client;            // "I'll assign this before use"
  async init() { this.client = await connect(); }
}
```

**Interview Tip:** Treat `!` (non-null assertion) as a code smell in reviews. It's an unchecked promise to the compiler — each one is a potential runtime crash. Prefer narrowing or an assertion function that actually throws.

---

# React + TypeScript

## How do you type React components, props, hooks and events?

### Answer

```tsx
import { useState, useReducer, useRef, useCallback, type ReactNode, type ChangeEvent } from 'react';

/* --- Props --- */
interface ButtonProps {
  label: string;
  variant?: 'primary' | 'secondary';
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
  children?: ReactNode;
}

// Prefer a plain function over React.FC (FC implicitly adds children in older versions)
function Button({ label, variant = 'primary', onClick, children }: ButtonProps) {
  return <button className={variant} onClick={onClick}>{label}{children}</button>;
}

/* --- Extending native element props --- */
interface InputProps extends React.ComponentPropsWithoutRef<'input'> {
  label: string;
  error?: string;
}

function Input({ label, error, ...rest }: InputProps) {
  return (
    <label>
      {label}
      <input {...rest} aria-invalid={!!error} />
      {error && <span role="alert">{error}</span>}
    </label>
  );
}

/* --- Hooks --- */
const [count, setCount] = useState(0);                    // inferred: number
const [user, setUser] = useState<User | null>(null);      // explicit union
const [items, setItems] = useState<string[]>([]);         // empty array needs help

const inputRef = useRef<HTMLInputElement>(null);          // DOM ref → readonly
const timerRef = useRef<number | undefined>(undefined);   // mutable value ref

/* --- Events --- */
const onChange = (e: ChangeEvent<HTMLInputElement>) => setValue(e.target.value);
const onSubmit = (e: React.FormEvent<HTMLFormElement>) => { e.preventDefault(); };
const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => { … };

/* --- useReducer with a discriminated union --- */
type State = { count: number; status: 'idle' | 'loading' };
type Action =
  | { type: 'increment'; by: number }
  | { type: 'reset' }
  | { type: 'setStatus'; status: State['status'] };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'increment': return { ...state, count: state.count + action.by };
    case 'reset':     return { ...state, count: 0 };
    case 'setStatus': return { ...state, status: action.status };
  }
}

/* --- Generic component --- */
interface ListProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => ReactNode;
  keyExtractor: (item: T) => string;
}

function List<T>({ items, renderItem, keyExtractor }: ListProps<T>) {
  return <ul>{items.map((item, i) => <li key={keyExtractor(item)}>{renderItem(item, i)}</li>)}</ul>;
}

/* --- Custom hook --- */
function useToggle(initial = false) {
  const [value, setValue] = useState(initial);
  const toggle = useCallback(() => setValue((v) => !v), []);
  return [value, toggle] as const;   // `as const` → readonly [boolean, () => void]
}

/* --- Context --- */
const ThemeContext = React.createContext<{ theme: string; setTheme: (t: string) => void } | null>(null);

function useTheme() {
  const ctx = React.useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;   // narrowed to non-null for every consumer
}
```

**Interview Tip:** Two details that show real experience: `as const` on custom-hook tuple returns (otherwise you get `(boolean | (() => void))[]`), and the null-check wrapper hook for Context (so consumers never handle `null`).

**Common Mistakes:** `React.FC` — avoid it in new code; it complicates generics and historically implied `children`. `useState([])` — infers `never[]`, so always annotate empty arrays.

---

# Rapid Fire

**What is `keyof`?**
Produces a union of an object type's keys: `keyof User` → `'id' | 'name'`.

**What is `typeof` in a type position?**
Captures the type of a value: `const config = {...}; type Config = typeof config;`.

**What is an indexed access type?**
`User['name']` → the type of that property. Works with unions: `User['id' | 'name']`.

**What is `as const`?**
A const assertion — makes everything `readonly` and infers literal types instead of widened ones. Essential for tuples and constant maps.

**What is the difference between `interface extends` and `&`?**
`extends` errors on conflicting members; `&` silently produces `never` for the conflicting key. `extends` is generally faster for the compiler.

**What is a discriminated union?**
A union of object types sharing a literal-typed field (`kind`, `type`, `status`) that TypeScript uses to narrow automatically.

**What is a branded / nominal type?**
`type UserId = string & { __brand: 'UserId' }` — makes two structurally identical types incompatible.

**What is `readonly` vs `Readonly<T>` vs `const`?**
`readonly` on a property, `Readonly<T>` on a whole type (shallow), `const` on a binding. None freeze at runtime.

**What is `ReadonlyArray<T>` / `readonly T[]`?**
An array type without mutating methods. Great for function parameters you promise not to modify.

**What is `unique symbol`?**
A symbol type usable as a nominal type-level key: `declare const brand: unique symbol`.

**What is an overload signature?**
Multiple call signatures over one implementation, letting return types vary by argument type.

**What is `abstract`?**
A class that can't be instantiated, with members subclasses must implement.

**What is the difference between `enum` and a union of literals?**
`enum` emits runtime code (a reverse-mapped object); a union of string literals is erased and usually preferred. `const enum` is inlined but breaks with `isolatedModules`.

**What is `namespace`?**
Legacy pre-ESM module system. Avoid in new code — use ES modules.

**What is `declare`?**
Ambient declaration — tells TS a value exists without emitting code (for globals or JS libs).

**What is a `.d.ts` file?**
Type-only declarations that describe the shape of JS code, with no implementation.

**What is `skipLibCheck`?**
Skips type-checking `.d.ts` files in dependencies. Big speed win; safe in practice.

**What is `isolatedModules`?**
Guarantees each file can be transpiled independently — required by esbuild, SWC and Babel. Bans `const enum` re-exports and ambiguous type re-exports.

**What is the `Awaited<T>` utility?**
Recursively unwraps promise types: `Awaited<Promise<Promise<string>>>` → `string`.

**What is variance (covariance/contravariance)?**
Return types are covariant (a subtype return is fine); parameter types should be contravariant. TS uses bivariant method parameters for convenience, which is unsound — `strictFunctionTypes` fixes it for function-type properties but not methods.

**How do you type an API response safely?**
Validate at runtime with Zod (or similar) and infer the type: `const schema = z.object({...}); type User = z.infer<typeof schema>;`. This is the only way to get real safety at the boundary.

**How do you migrate a JS project to TS?**
Add `allowJs` + `checkJs`, rename files incrementally, start non-strict, then enable strict flags one at a time. Use `// @ts-expect-error` (not `@ts-ignore`) so stale suppressions error out.

**What is the difference between `@ts-ignore` and `@ts-expect-error`?**
`@ts-ignore` silences any error forever. `@ts-expect-error` errors if the line *stops* having an error — so it self-cleans.

---

## 📌 Interview Checklist

- [ ] `type` vs `interface` — when do you use each?
- [ ] `any` vs `unknown` vs `never` with a real example of each
- [ ] Implement `Partial`, `Pick`, `Omit`, `ReturnType` from scratch
- [ ] Explain a discriminated union + `never` exhaustiveness check
- [ ] What does `satisfies` solve that `as` doesn't?
- [ ] Write a generic constrained with `keyof`
- [ ] How do you extend the Express `Request` type?
- [ ] What does TypeScript *not* protect you from?
