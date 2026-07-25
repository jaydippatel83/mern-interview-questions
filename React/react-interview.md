# ⚛️ React Interview Questions

> Core concepts · JSX · State · Props · Lifecycle · Context · Forms · Routing · Testing

> Hooks are covered separately in [hooks.md](hooks.md) and optimisation in [performance.md](performance.md).

---

## Table of Contents

1. [Core Concepts](#core-concepts)
2. [JSX & Rendering](#jsx--rendering)
3. [State & Props](#state--props)
4. [Component Lifecycle](#component-lifecycle)
5. [Context & State Management](#context--state-management)
6. [Forms](#forms)
7. [Lists, Keys & Reconciliation](#lists-keys--reconciliation)
8. [Error Handling](#error-handling)
9. [Patterns](#patterns)
10. [Routing](#routing)
11. [Data Fetching](#data-fetching)
12. [Testing](#testing)
13. [React 18 / 19 Features](#react-18--19-features)
14. [Rapid Fire](#rapid-fire)

---

# Core Concepts

## What is React and what problem does it solve?

### Answer

A library for building user interfaces from **composable components**, where the UI is a **declarative function of state**. You describe what the UI should look like for a given state; React figures out the DOM operations.

### Why do we use it?

Before React, we manually synchronised the DOM with application state — the source of most UI bugs. React makes the flow one-directional:

```
state → render → UI
```

Change the state, and the UI follows automatically.

### When should we use it?

Interactive applications with substantial client-side state. For a mostly-static content site, a framework like Astro or plain HTML is a better fit.

### Example

```jsx
// Imperative (vanilla JS) — you manage every transition
const btn = document.querySelector('#btn');
let count = 0;
btn.addEventListener('click', () => {
  count++;
  document.querySelector('#display').textContent = count;   // manual sync
});

// Declarative (React) — describe the result, not the steps
function Counter() {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount(count + 1)}>{count}</button>;
}
```

**Interview Tip:** React is a **library**, not a framework — it handles the view layer only. Routing, data fetching and build tooling are your choice (or Next.js's). Interviewers ask this specifically.

**Common Mistakes:** Saying "React is fast because of the virtual DOM." It isn't inherently faster than optimised direct DOM manipulation — the VDOM buys you a good *programming model* at acceptable performance.

---

## What is the Virtual DOM and how does reconciliation work?

### Answer

The Virtual DOM is a lightweight JS object tree describing what the UI should look like. On a state change React builds a new tree, **diffs** it against the previous one, and applies the minimum set of real DOM mutations.

### The reconciliation algorithm

A general tree diff is O(n³). React uses two heuristics to get O(n):

1. **Different element types produce different trees.** `<div>` → `<span>` means unmount the whole subtree and remount. State is lost.
2. **Keys identify children across renders.** Stable keys let React match, move and reuse elements instead of recreating them.

### Example

```jsx
// Before
<div className="old">
  <Counter count={1} />
</div>

// After
<div className="new">
  <Counter count={2} />
</div>

// React: same type div → update className only
//        same type Counter → re-render with new props, STATE PRESERVED

// But this remounts everything and loses Counter's internal state:
{isEditing ? <div><Counter /></div> : <section><Counter /></section>}
```

### Fiber

React 16+ uses the **Fiber** architecture — an incremental reconciler that splits rendering into units of work that can be paused, resumed and prioritised. That's what makes concurrent features (`useTransition`, Suspense) possible.

**Interview Tip:** Two phases: **render** (build the tree and diff — interruptible, must be pure) and **commit** (apply DOM changes — synchronous, uninterruptible). That vocabulary demonstrates real understanding.

**Common Mistakes:** Thinking the VDOM diff *is* the whole optimisation. React still re-renders the entire subtree by default — `React.memo` and state placement are what actually reduce work.

---

## What is the difference between a library and a framework? Where does React fit?

### Answer

- **Library** — you call it. You control the flow. (React, lodash)
- **Framework** — it calls you. It controls the flow via inversion of control. (Angular, Next.js)

React is a library. Next.js/Remix wrap it into frameworks by adding routing, data loading, and a build/deploy model.

**Interview Tip:** This is why "React vs Angular" is the wrong comparison — the fair one is "React + React Router + TanStack Query + Vite vs Angular".

---

## What are the advantages and disadvantages of React?

### Answer

**Advantages**
- Component reusability and composition
- Declarative, predictable data flow
- Huge ecosystem and job market
- React Native for mobile with shared skills
- Backwards-compatible, well-managed upgrades

**Disadvantages**
- Only the view layer — you assemble the rest
- Fast-moving ecosystem, decision fatigue
- JSX + build tooling is a learning curve
- Easy to write badly-performing code (re-render cascades)
- SEO requires SSR/SSG (solved by Next.js)

**Interview Tip:** Giving an honest disadvantage list makes you sound like an engineer, not a fan. Mention re-render cascades specifically — it's the real-world pain point.

---

# JSX & Rendering

## What is JSX and how does it work?

### Answer

A syntax extension that compiles to function calls. It is not HTML and not part of React itself.

### Example

```jsx
// You write
const el = <h1 className="title" onClick={handle}>Hello {name}</h1>;

// Babel/SWC compiles it (modern JSX transform, React 17+)
import { jsx as _jsx } from 'react/jsx-runtime';
const el = _jsx('h1', { className: 'title', onClick: handle, children: ['Hello ', name] });

// Which produces a plain object — the React element
{
  type: 'h1',
  props: { className: 'title', onClick: handle, children: [...] },
  key: null,
  ref: null
}
```

### JSX rules

```jsx
// 1. One root element — or a Fragment
return <><A /><B /></>;
return <React.Fragment key={id}><A /></React.Fragment>;   // keyed fragment

// 2. Attributes use camelCase, and reserved words are renamed
<div className="x" htmlFor="id" tabIndex={0} onClick={fn} />

// 3. Expressions in braces — statements are not allowed
<p>{user ? user.name : 'Guest'}</p>          // ✅ ternary
<p>{items.map(i => <li key={i.id}>{i.n}</li>)}</p>

// 4. Components must be Capitalized
<Button />    // React component
<button />    // DOM element

// 5. Self-close void elements
<img src="x" alt="y" />
```

### Conditional rendering pitfalls

```jsx
{count && <Badge />}          // ❌ renders "0" when count is 0!
{count > 0 && <Badge />}      // ✅
{Boolean(count) && <Badge />} // ✅
{count ? <Badge /> : null}    // ✅
```

**Interview Tip:** The `0` rendering bug is asked constantly. `&&` returns the left operand when falsy, and React renders `0` (but not `false`, `null` or `undefined`).

**Common Mistakes:** Using `class` instead of `className`; forgetting that JSX values like objects can't be rendered directly (`Objects are not valid as a React child`).

---

## What is the difference between an element and a component?

### Answer

- **Element** — a plain immutable object describing what you want on screen. Cheap to create.
- **Component** — a function (or class) that *returns* elements. It can hold state and logic.

### Example

```jsx
// Component — a function
function Welcome({ name }) { return <h1>Hello {name}</h1>; }

// Element — the result of using it
const element = <Welcome name="Jaydip" />;
// → { type: Welcome, props: { name: 'Jaydip' }, ... }

// Elements are immutable — you can't change one, you render a new tree
```

**Interview Tip:** `<Welcome />` creates an element; `Welcome()` calls the function directly. The second one breaks hooks and state — it's a real bug people hit when trying to "optimise".

---

## What is the difference between functional and class components?

### Answer

| | Class | Function |
|---|---|---|
| Syntax | `class X extends React.Component` | `function X()` |
| State | `this.state` + `setState` | `useState` / `useReducer` |
| Lifecycle | `componentDidMount` etc. | `useEffect` |
| `this` binding | Required | N/A |
| Code reuse | HOC / render props | Custom hooks |
| Bundle size | Slightly larger | Smaller |
| Future features | Not supported | Hooks, Server Components, concurrent features |

### Example

```jsx
// Class
class Counter extends React.Component {
  state = { count: 0 };
  increment = () => this.setState((s) => ({ count: s.count + 1 }));
  componentDidMount() { document.title = this.state.count; }
  componentDidUpdate() { document.title = this.state.count; }
  render() { return <button onClick={this.increment}>{this.state.count}</button>; }
}

// Function — same thing, far less code
function Counter() {
  const [count, setCount] = useState(0);
  useEffect(() => { document.title = count; }, [count]);
  return <button onClick={() => setCount((c) => c + 1)}>{count}</button>;
}
```

**Interview Tip:** Class components are **not deprecated** and still work, but all new React features (Server Components, `use`, concurrent APIs) are function-only. Write function components; be able to read classes in legacy code.

**Common Mistakes:** Saying hooks "replaced" lifecycle methods 1:1. `useEffect` is a different mental model — it's about *synchronisation*, not lifecycle timing.

---

# State & Props

## What is the difference between state and props?

### Answer

| | Props | State |
|---|---|---|
| Owner | Parent | The component itself |
| Mutable | **No** (read-only) | Yes, via setter |
| Triggers re-render | When parent re-renders | On update |
| Purpose | Configuration passed in | Data that changes over time |

### Example

```jsx
function Parent() {
  const [theme, setTheme] = useState('dark');   // state, owned here
  return <Child theme={theme} onToggle={() => setTheme(t => t === 'dark' ? 'light' : 'dark')} />;
}

function Child({ theme, onToggle }) {
  // theme is a prop — read-only here
  // theme = 'light';   ❌ never mutate props
  return <button onClick={onToggle}>{theme}</button>;
}
```

**Interview Tip:** "Props down, events up" describes React's one-way data flow. A child changes parent state only by calling a function the parent passed down.

**Common Mistakes:** Copying props into state (`useState(props.value)`) — the state then ignores later prop changes. Only do it deliberately for uncontrolled/initial values, and name it `initialValue` or `defaultValue` to signal intent.

---

## Why is `setState` asynchronous, and what is batching?

### Answer

State updates are **queued** and applied before the next render, not immediately. React 18 batches updates from *all* sources (events, promises, timeouts, native handlers) — "automatic batching".

### Example

```jsx
function Counter() {
  const [count, setCount] = useState(0);

  const wrong = () => {
    setCount(count + 1);   // count is 0 → schedules 1
    setCount(count + 1);   // count is STILL 0 → schedules 1
    console.log(count);    // 0 — not updated yet
  };                       // final: 1 ❌

  const right = () => {
    setCount(c => c + 1);  // functional update — uses latest queued value
    setCount(c => c + 1);
  };                       // final: 2 ✅

  // React 18: these are batched into ONE re-render
  const batched = async () => {
    await fetch('/api');
    setCount(c => c + 1);
    setLoading(false);     // pre-18 this would be 2 renders; now 1
  };

  // Opt out when you need a synchronous DOM update
  flushSync(() => setCount(c => c + 1));
}
```

### Why do we use it?

Batching prevents wasted renders. If three state variables change in one handler, you want one render, not three.

**Interview Tip:** The rule: *use the functional updater whenever the new state depends on the old one.* That single rule prevents a whole class of stale-state bugs.

**Common Mistakes:** Reading state right after setting it and expecting the new value; using `useEffect` to "wait" for state when a functional update would do.

---

## What is lifting state up?

### Answer

Moving shared state to the closest common ancestor of the components that need it, then passing it down as props.

### Example

```jsx
// ❌ Two siblings can't share state
function Parent() {
  return <><Input /><Preview /></>;   // Input's state is invisible to Preview
}

// ✅ Lift it
function Parent() {
  const [text, setText] = useState('');
  return (
    <>
      <Input value={text} onChange={setText} />
      <Preview text={text} />
    </>
  );
}
```

### When should we use it?

When two or more components need the same state. If it gets more than 2–3 levels deep, switch to Context or a state library instead of prop drilling.

**Interview Tip:** The counterpart is equally important — **push state down**. Keeping state as local as possible minimises re-renders. Lift only when you must.

---

## What is prop drilling and how do you avoid it?

### Answer

Passing props through intermediate components that don't use them, purely to reach a deep child.

### Example

```jsx
// ❌ Prop drilling — Layout and Sidebar don't care about `user`
<App user={user}>
  <Layout user={user}>
    <Sidebar user={user}>
      <Profile user={user} />

// ✅ Solution 1: Context
const UserContext = createContext(null);
<UserContext.Provider value={user}>
  <Layout />   {/* Profile calls useContext(UserContext) */}
</UserContext.Provider>

// ✅ Solution 2: Composition (often better — no context needed)
<Layout sidebar={<Sidebar><Profile user={user} /></Sidebar>} />

// ✅ Solution 3: State library (Zustand, Redux, Jotai) for global state
```

**Interview Tip:** **Composition** is the underrated answer. Passing elements as props/children removes drilling without the re-render cost of Context. Interviewers notice when you offer it.

**Common Mistakes:** Reaching for Redux to solve prop drilling that composition would fix in five lines.

---

# Component Lifecycle

## Map class lifecycle methods to hooks.

### Answer

| Class method | Hook equivalent |
|---|---|
| `constructor` | `useState(initial)` / lazy init `useState(() => …)` |
| `componentDidMount` | `useEffect(fn, [])` |
| `componentDidUpdate` | `useEffect(fn, [deps])` |
| `componentWillUnmount` | `useEffect(() => () => cleanup, [])` |
| `shouldComponentUpdate` | `React.memo` + `useMemo`/`useCallback` |
| `getDerivedStateFromProps` | Derive during render, or `key` prop to reset |
| `getSnapshotBeforeUpdate` | `useLayoutEffect` |
| `componentDidCatch` | Error boundary (still class-only) |

### Example

```jsx
function Timer({ id }) {
  const [data, setData] = useState(null);

  // componentDidMount + componentDidUpdate(id) + componentWillUnmount
  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    fetch(`/api/${id}`, { signal: controller.signal })
      .then(r => r.json())
      .then(d => { if (!cancelled) setData(d); })
      .catch(e => { if (e.name !== 'AbortError') console.error(e); });

    return () => {                 // cleanup — runs before next effect AND on unmount
      cancelled = true;
      controller.abort();
    };
  }, [id]);

  return <div>{data?.name}</div>;
}
```

**Interview Tip:** The key mental shift: `useEffect` doesn't map to "mount/update/unmount", it maps to **"synchronise this external system with these values"**. If you think in lifecycle terms you'll write buggy dependency arrays.

---

## What is the React 18 StrictMode double-render/double-effect behaviour?

### Answer

In development only, `<StrictMode>` deliberately:
- Renders components twice
- Runs effects twice (mount → unmount → mount)
- Double-invokes state updaters

### Why do we use it?

To surface bugs that will break under concurrent rendering and future features (Offscreen, resumable state): impure render logic and missing effect cleanup.

### Example

```jsx
// ❌ Bug surfaced by StrictMode — subscription leaks
useEffect(() => {
  socket.connect();          // connects twice, disconnects zero times
}, []);

// ✅ Correct — cleanup makes it idempotent
useEffect(() => {
  socket.connect();
  return () => socket.disconnect();
}, []);
```

**Interview Tip:** If someone says "StrictMode causes my API to be called twice, so I disabled it" — that's a code smell, not a React bug. The correct fix is cleanup/abort or a data library that dedupes.

**Common Mistakes:** Using a `useRef` "hasRun" flag to defeat double-invocation. It hides the bug instead of fixing it.

---

# Context & State Management

## What is the Context API and when should you use it?

### Answer

A way to pass values through the tree without prop drilling.

### Example

```jsx
const ThemeContext = createContext('light');

function App() {
  const [theme, setTheme] = useState('light');

  // ⚠️ MUST memoize — a new object every render re-renders every consumer
  const value = useMemo(() => ({ theme, setTheme }), [theme]);

  return (
    <ThemeContext.Provider value={value}>
      <Layout />
    </ThemeContext.Provider>
  );
}

function Button() {
  const { theme } = useContext(ThemeContext);
  return <button className={theme}>Click</button>;
}

// Best practice: a custom hook that enforces the provider
function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider');
  return ctx;
}
```

### When should we use it?

Low-frequency, broadly-needed values: theme, locale, authenticated user, feature flags.

**Not** for high-frequency updates (form input, cursor position, animation state) — every consumer re-renders on every change, with no way to subscribe to a slice.

### Splitting contexts

```jsx
// ✅ Separate stable and changing values
<AuthDispatchContext.Provider value={dispatch}>   {/* never changes */}
  <AuthStateContext.Provider value={state}>       {/* changes often */}
```

**Interview Tip:** "Context is a dependency injection mechanism, not a state manager." It has no selectors, so any change re-renders all consumers. That's why Zustand/Redux exist.

**Common Mistakes:** `value={{ user, setUser }}` inline — a fresh object identity on every render, so memoization downstream is useless.

---

## Context vs Redux vs Zustand vs Jotai — when do you use each?

### Answer

| | Context | Redux Toolkit | Zustand | Jotai / Recoil | TanStack Query |
|---|---|---|---|---|---|
| Type | DI mechanism | Flux store | Minimal store | Atomic state | **Server** state |
| Selectors | No | Yes | Yes | Atom-level | Query keys |
| Boilerplate | Low | Medium | Very low | Low | Low |
| DevTools | No | Excellent | Yes | Yes | Yes |
| Middleware | No | Yes | Yes | Limited | Built-in |
| Bundle | 0 | ~12kB | ~1kB | ~3kB | ~13kB |
| Best for | Theme, auth, locale | Large apps, complex flows, time travel | Most client state | Fine-grained derived state | **All server data** |

### Example — Zustand

```jsx
import { create } from 'zustand';

const useCartStore = create((set, get) => ({
  items: [],
  addItem: (item) => set((s) => ({ items: [...s.items, item] })),
  removeItem: (id) => set((s) => ({ items: s.items.filter(i => i.id !== id) })),
  get total() { return get().items.reduce((sum, i) => sum + i.price, 0); },
}));

// Selector → this component re-renders ONLY when items.length changes
function CartBadge() {
  const count = useCartStore((s) => s.items.length);
  return <span>{count}</span>;
}
```

**Interview Tip:** The most important modern distinction is **server state vs client state**. Most "we need Redux" situations are actually caching remote data — which TanStack Query solves better, with staleness, refetching, dedupe and cache invalidation built in. Saying this is a strong senior signal.

**Common Mistakes:** Storing API responses in Redux and hand-writing loading/error/refetch logic that a query library gives you free.

---

# Forms

## What is the difference between controlled and uncontrolled components?

### Answer

- **Controlled** — React state is the single source of truth; the input's `value` comes from state.
- **Uncontrolled** — the DOM holds the value; you read it with a ref on submit.

### Example

```jsx
// Controlled — re-renders on every keystroke, full control
function Controlled() {
  const [value, setValue] = useState('');
  return (
    <input
      value={value}
      onChange={(e) => setValue(e.target.value.toUpperCase())}   // transform live
    />
  );
}

// Uncontrolled — no re-render while typing
function Uncontrolled() {
  const inputRef = useRef(null);
  const onSubmit = (e) => {
    e.preventDefault();
    console.log(inputRef.current.value);
  };
  return (
    <form onSubmit={onSubmit}>
      <input ref={inputRef} defaultValue="initial" />
    </form>
  );
}

// Native FormData — no state, no refs (React 19 friendly)
function WithFormData() {
  const onSubmit = (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.currentTarget));
    console.log(data);
  };
  return <form onSubmit={onSubmit}><input name="email" /></form>;
}
```

### When should we use it?

- **Controlled** — live validation, conditional fields, formatting as you type, disabling submit.
- **Uncontrolled** — simple forms, file inputs (always uncontrolled), integrating non-React widgets, or when performance matters on huge forms.

**Interview Tip:** `<input type="file">` **must** be uncontrolled — its value is read-only for security reasons. That detail comes up.

**Common Mistakes:** `value={undefined}` then setting a value later — React warns about switching an input from uncontrolled to controlled. Always initialise with `''`.

---

## How do you handle form validation in React?

### Answer

```jsx
// 1. Manual — fine for 1–2 fields
function LoginForm() {
  const [values, setValues] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  const validate = (vals) => {
    const e = {};
    if (!vals.email) e.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(vals.email)) e.email = 'Invalid email';
    if (vals.password.length < 8) e.password = 'Minimum 8 characters';
    return e;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const errs = validate(values);
    setErrors(errs);
    setTouched({ email: true, password: true });
    if (Object.keys(errs).length === 0) submit(values);
  };

  return (
    <form onSubmit={handleSubmit} noValidate>
      <input
        value={values.email}
        onChange={(e) => setValues({ ...values, email: e.target.value })}
        onBlur={() => setTouched({ ...touched, email: true })}
        aria-invalid={!!errors.email}
        aria-describedby="email-error"
      />
      {touched.email && errors.email && (
        <span id="email-error" role="alert">{errors.email}</span>
      )}
    </form>
  );
}

// 2. react-hook-form + Zod — the production standard
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const schema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'Minimum 8 characters'),
});

function Login() {
  const { register, handleSubmit, formState: { errors, isSubmitting } } =
    useForm({ resolver: zodResolver(schema) });

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input {...register('email')} />
      {errors.email && <span role="alert">{errors.email.message}</span>}
      <button disabled={isSubmitting}>Login</button>
    </form>
  );
}
```

**Interview Tip:** react-hook-form keeps inputs **uncontrolled** and subscribes per-field, so typing in a 50-field form doesn't re-render the whole thing. That's the performance argument for it.

**Common Mistakes:** Client-only validation. Always re-validate on the server — ideally with the same Zod schema shared between both.

---

# Lists, Keys & Reconciliation

## Why do lists need keys and why is the index a bad key?

### Answer

Keys let React match elements between renders. With a stable key, React moves the existing DOM node and preserves component state. With an index, the key changes meaning when the list reorders.

### Example

```jsx
// ❌ Index as key — breaks on reorder/insert/delete
{todos.map((todo, i) => <TodoItem key={i} todo={todo} />)}

// Delete the first item:
//   Before: key0=Buy milk,  key1=Walk dog
//   After:  key0=Walk dog
//   React thinks item 0 just changed text → reuses its DOM & state
//   Any typed input / checkbox state stays on the WRONG row

// ✅ Stable unique id
{todos.map((todo) => <TodoItem key={todo.id} todo={todo} />)}

// If items truly have no id, generate one when creating them
const addTodo = (text) => setTodos(t => [...t, { id: crypto.randomUUID(), text }]);
```

### When is an index acceptable?

Only when **all three** are true: the list never reorders, items are never inserted or removed from the middle, and items have no local state.

### Using `key` to force a remount

```jsx
// Reset a form's internal state when the selected user changes
<ProfileForm key={userId} user={user} />
```

**Interview Tip:** The clearest demo: a list of inputs where you delete the first row and the typed text jumps to the wrong row. Describe that scenario and the interviewer knows you've hit it in production.

**Common Mistakes:** `key={Math.random()}` — a new key every render means React destroys and recreates every node, every time. Catastrophic for performance and state.

---

# Error Handling

## What are error boundaries?

### Answer

Components that catch JavaScript errors in their child tree during rendering, in lifecycle methods and in constructors — then render a fallback UI instead of crashing the whole app.

### Example

```jsx
class ErrorBoundary extends React.Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };        // update state → render fallback
  }

  componentDidCatch(error, errorInfo) {
    logToSentry(error, errorInfo.componentStack);   // side effects go here
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div role="alert">
          <h2>Something went wrong</h2>
          <button onClick={() => this.setState({ hasError: false })}>Try again</button>
        </div>
      );
    }
    return this.props.children;
  }
}

// Usage — granular boundaries keep the rest of the app alive
<ErrorBoundary fallback={<ChartError />}>
  <RevenueChart />
</ErrorBoundary>
```

### What they do NOT catch

- Event handlers (use `try/catch`)
- Async code (`setTimeout`, promises)
- Server-side rendering
- Errors thrown inside the boundary itself

### Example — handling those

```jsx
// Async errors: capture into state, then throw during render
function Component() {
  const [error, setError] = useState(null);
  if (error) throw error;                     // now the boundary catches it

  const onClick = async () => {
    try { await risky(); } catch (e) { setError(e); }
  };
}
```

**Interview Tip:** Error boundaries are still **class-only** — there's no hook equivalent. Use `react-error-boundary` for a modern API with `useErrorBoundary`, `onReset` and `resetKeys`.

**Common Mistakes:** One boundary at the app root. Then any error blanks the entire page. Place boundaries around independent regions.

---

# Patterns

## What are Higher-Order Components, render props and custom hooks?

### Answer

Three generations of the same problem: sharing non-visual logic between components.

### Example

```jsx
// 1. HOC — a function that takes a component and returns a new one
function withAuth(Component) {
  return function Wrapped(props) {
    const { user, loading } = useAuth();
    if (loading) return <Spinner />;
    if (!user) return <Navigate to="/login" />;
    return <Component {...props} user={user} />;
  };
}
const ProtectedDashboard = withAuth(Dashboard);

// 2. Render props — pass a function as children
function MousePosition({ children }) {
  const [pos, setPos] = useState({ x: 0, y: 0 });
  useEffect(() => {
    const onMove = (e) => setPos({ x: e.clientX, y: e.clientY });
    window.addEventListener('mousemove', onMove);
    return () => window.removeEventListener('mousemove', onMove);
  }, []);
  return children(pos);
}
<MousePosition>{({ x, y }) => <p>{x}, {y}</p>}</MousePosition>

// 3. Custom hook — the modern answer
function useMousePosition() {
  const [pos, setPos] = useState({ x: 0, y: 0 });
  useEffect(() => {
    const onMove = (e) => setPos({ x: e.clientX, y: e.clientY });
    window.addEventListener('mousemove', onMove);
    return () => window.removeEventListener('mousemove', onMove);
  }, []);
  return pos;
}
function Component() {
  const { x, y } = useMousePosition();   // no wrapper, no nesting
}
```

### Why hooks won

- No wrapper hell in the component tree
- No prop-name collisions
- Composable — a hook can call other hooks
- Types flow naturally

**Interview Tip:** HOCs are still used where you need to *wrap* rather than *share logic* — `React.memo`, `forwardRef`, `connect`, and error/analytics wrappers. Don't say they're obsolete.

---

## What is the compound component pattern?

### Answer

A parent component that shares implicit state with its children through Context, letting consumers compose flexible markup.

### Example

```jsx
const TabsContext = createContext(null);

function Tabs({ children, defaultTab }) {
  const [active, setActive] = useState(defaultTab);
  const value = useMemo(() => ({ active, setActive }), [active]);
  return <TabsContext.Provider value={value}>{children}</TabsContext.Provider>;
}

Tabs.List = function List({ children }) {
  return <div role="tablist">{children}</div>;
};

Tabs.Tab = function Tab({ id, children }) {
  const { active, setActive } = useContext(TabsContext);
  return (
    <button role="tab" aria-selected={active === id} onClick={() => setActive(id)}>
      {children}
    </button>
  );
};

Tabs.Panel = function Panel({ id, children }) {
  const { active } = useContext(TabsContext);
  return active === id ? <div role="tabpanel">{children}</div> : null;
};

// Consumer controls layout completely
<Tabs defaultTab="a">
  <Tabs.List>
    <Tabs.Tab id="a">Profile</Tabs.Tab>
    <Tabs.Tab id="b">Settings</Tabs.Tab>
  </Tabs.List>
  <Tabs.Panel id="a">Profile content</Tabs.Panel>
  <Tabs.Panel id="b">Settings content</Tabs.Panel>
</Tabs>
```

**Interview Tip:** This is how Radix UI, Headless UI and shadcn/ui are built. Contrast it with a `<Tabs items={[...]} />` config-prop API: compound components trade a little verbosity for total layout flexibility.

---

## What are portals?

### Answer

Render children into a DOM node outside the parent hierarchy, while keeping them in the React tree (context and event bubbling still work through React).

### Example

```jsx
import { createPortal } from 'react-dom';

function Modal({ children, onClose }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';        // lock scroll
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  return createPortal(
    <div className="overlay" onClick={onClose}>
      <div role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>,
    document.getElementById('modal-root')
  );
}
```

### Why do we use it?

Escapes `overflow: hidden`, `z-index` stacking contexts and `transform` on ancestors — the reasons modals and tooltips break when rendered in place.

**Interview Tip:** Events still bubble through the **React tree**, not the DOM tree. A click inside a portal fires handlers on the React parent even though the DOM nodes are siblings. That surprises people.

---

# Routing

## How does client-side routing work in React Router?

### Answer

```jsx
import {
  createBrowserRouter, RouterProvider, Outlet, Link, NavLink,
  useParams, useNavigate, useSearchParams, useLoaderData,
} from 'react-router-dom';

const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    errorElement: <ErrorPage />,
    children: [
      { index: true, element: <Home /> },
      {
        path: 'users/:id',
        element: <User />,
        loader: async ({ params }) => fetch(`/api/users/${params.id}`),
      },
      { path: 'settings', element: <Protected><Settings /></Protected> },
      { path: '*', element: <NotFound /> },
    ],
  },
]);

function Layout() {
  return (
    <>
      <nav>
        <NavLink to="/" className={({ isActive }) => isActive ? 'active' : ''}>Home</NavLink>
      </nav>
      <Outlet />          {/* child routes render here */}
    </>
  );
}

function User() {
  const { id } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const data = useLoaderData();

  return <button onClick={() => navigate('/', { replace: true })}>Home</button>;
}

// Protected route
function Protected({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <Spinner />;
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  return children;
}
```

### Lazy loading routes

```jsx
const Dashboard = lazy(() => import('./Dashboard'));

<Suspense fallback={<Spinner />}>
  <Dashboard />
</Suspense>
```

**Interview Tip:** Client-side routing uses the **History API** (`pushState`) — no full page reload. Mention that the server must return `index.html` for all paths (SPA fallback), or deep links 404 on refresh. That deployment detail is asked often.

---

# Data Fetching

## How do you fetch data in React, and what's wrong with a naive `useEffect`?

### Answer

```jsx
// ❌ The naive version has FIVE bugs
function Naive({ id }) {
  const [data, setData] = useState(null);
  useEffect(() => {
    fetch(`/api/${id}`).then(r => r.json()).then(setData);
  }, [id]);
  // 1. No loading state    2. No error handling
  // 3. No cleanup → race condition: slow response for id=1 overwrites id=2
  // 4. No caching → refetches on every mount
  // 5. Doesn't check response.ok

// ✅ Correct manual version
function Better({ id }) {
  const [state, setState] = useState({ status: 'loading', data: null, error: null });

  useEffect(() => {
    const controller = new AbortController();
    setState({ status: 'loading', data: null, error: null });

    (async () => {
      try {
        const res = await fetch(`/api/${id}`, { signal: controller.signal });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setState({ status: 'success', data, error: null });
      } catch (err) {
        if (err.name !== 'AbortError') {
          setState({ status: 'error', data: null, error: err });
        }
      }
    })();

    return () => controller.abort();          // fixes the race condition
  }, [id]);

  if (state.status === 'loading') return <Spinner />;
  if (state.status === 'error') return <Error error={state.error} />;
  return <View data={state.data} />;
}

// ✅✅ TanStack Query — all of the above, plus cache, dedupe, retry, refetch
function Best({ id }) {
  const { data, isPending, error } = useQuery({
    queryKey: ['user', id],
    queryFn: ({ signal }) => fetch(`/api/${id}`, { signal }).then(r => r.json()),
    staleTime: 60_000,
  });

  if (isPending) return <Spinner />;
  if (error) return <Error error={error} />;
  return <View data={data} />;
}
```

**Interview Tip:** Walk through the race condition explicitly: user types fast, request for `id=1` resolves *after* `id=2`, and stale data wins. `AbortController` or a `cancelled` flag in cleanup is the fix. That's the answer interviewers wait for.

**Common Mistakes:** Fetching in `useEffect` in every component instead of caching; not handling `!res.ok` because `fetch` doesn't reject on 404/500.

---

# Testing

## How do you test React components?

### Answer

React Testing Library — test what the **user** sees and does, not implementation details.

### Example

```jsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';

const server = setupServer(
  http.post('/api/login', () => HttpResponse.json({ token: 'abc' }))
);
beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

test('submits the login form and shows a welcome message', async () => {
  const user = userEvent.setup();
  render(<LoginForm />);

  // Query by ACCESSIBLE ROLE — same way a screen reader finds it
  await user.type(screen.getByLabelText(/email/i), 'a@b.com');
  await user.type(screen.getByLabelText(/password/i), 'password123');
  await user.click(screen.getByRole('button', { name: /log in/i }));

  expect(await screen.findByText(/welcome/i)).toBeInTheDocument();
});

test('shows a validation error for an invalid email', async () => {
  const user = userEvent.setup();
  render(<LoginForm />);

  await user.type(screen.getByLabelText(/email/i), 'invalid');
  await user.click(screen.getByRole('button', { name: /log in/i }));

  expect(screen.getByRole('alert')).toHaveTextContent(/invalid email/i);
});

// Testing a custom hook
import { renderHook, act } from '@testing-library/react';

test('useCounter increments', () => {
  const { result } = renderHook(() => useCounter(0));
  act(() => result.current.increment());
  expect(result.current.count).toBe(1);
});
```

### Query priority (RTL's guidance)

1. `getByRole` (with `name`) — best, mirrors accessibility
2. `getByLabelText` — form fields
3. `getByPlaceholderText`, `getByText`
4. `getByTestId` — last resort

**Interview Tip:** "Test behaviour, not implementation." If a test breaks when you rename a state variable but the UI works identically, the test was wrong. Also know the trio: `getBy` (throws if missing), `queryBy` (returns null — for asserting absence), `findBy` (async, returns a promise).

**Common Mistakes:** `fireEvent` instead of `userEvent` (the latter simulates real interaction sequences — focus, keydown, keyup); testing internal state directly.

---

# React 18 / 19 Features

## What are concurrent features in React 18?

### Answer

Rendering that can be **interrupted**, so urgent updates (typing) aren't blocked by expensive ones (filtering 10,000 rows).

### Example

```jsx
import { useTransition, useDeferredValue, startTransition } from 'react';

// useTransition — mark an update as non-urgent
function SearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isPending, startTransition] = useTransition();

  const onChange = (e) => {
    setQuery(e.target.value);              // urgent — input stays responsive
    startTransition(() => {
      setResults(expensiveFilter(e.target.value));   // interruptible
    });
  };

  return (
    <>
      <input value={query} onChange={onChange} />
      <div style={{ opacity: isPending ? 0.5 : 1 }}>
        <ResultList results={results} />
      </div>
    </>
  );
}

// useDeferredValue — the same idea, without owning the setter
function List({ query }) {
  const deferredQuery = useDeferredValue(query);
  const items = useMemo(() => filter(deferredQuery), [deferredQuery]);
  const isStale = query !== deferredQuery;
  return <div style={{ opacity: isStale ? 0.6 : 1 }}>{items.map(…)}</div>;
}
```

### Other React 18 features

- **Automatic batching** everywhere (not just React events)
- **Suspense for SSR** with streaming and selective hydration
- `useId` for SSR-safe unique ids
- `useSyncExternalStore` for external store subscriptions
- `createRoot` replacing `ReactDOM.render`

**Interview Tip:** `useTransition` when you control the state setter; `useDeferredValue` when the value arrives as a prop. That's the practical distinction.

---

## What's new in React 19?

### Answer

**Actions & form integration**

```jsx
// Server Action / async transition with built-in pending & error state
function UpdateName() {
  const [error, submitAction, isPending] = useActionState(
    async (previousState, formData) => {
      const error = await updateName(formData.get('name'));
      if (error) return error;
      redirect('/profile');
      return null;
    },
    null
  );

  return (
    <form action={submitAction}>
      <input name="name" />
      <button disabled={isPending}>Save</button>
      {error && <p role="alert">{error}</p>}
    </form>
  );
}

// useFormStatus — read the parent form's state without prop drilling
function SubmitButton() {
  const { pending } = useFormStatus();
  return <button disabled={pending}>{pending ? 'Saving…' : 'Submit'}</button>;
}

// useOptimistic — instant UI, reverts if the action fails
function Thread({ messages, sendMessage }) {
  const [optimisticMessages, addOptimistic] = useOptimistic(
    messages,
    (state, newMessage) => [...state, { text: newMessage, sending: true }]
  );

  const action = async (formData) => {
    addOptimistic(formData.get('message'));      // appears immediately
    await sendMessage(formData);
  };
}

// use() — read a promise or context conditionally (unlike other hooks)
function Comments({ commentsPromise }) {
  const comments = use(commentsPromise);   // suspends until resolved
  return comments.map(c => <p key={c.id}>{c.text}</p>);
}
```

**Other React 19 changes**
- `ref` as a regular prop — `forwardRef` no longer needed for function components
- `<Context>` renders directly as a provider (no `.Provider`)
- Document metadata (`<title>`, `<meta>`, `<link>`) hoisted automatically from anywhere in the tree
- Improved hydration error messages with a diff
- Ref cleanup functions

**Interview Tip:** Frame React 19 as "React absorbing what libraries were doing" — form state, optimistic updates and async transitions used to require react-hook-form, SWR mutations or hand-rolled code.

---

## What are React Server Components (RSC)?

### Answer

Components that render **only on the server**. Their JavaScript never ships to the browser; the client receives a serialised description of the output.

### Example

```jsx
// app/page.jsx — Server Component by default (Next.js App Router)
import { db } from '@/lib/db';
import LikeButton from './LikeButton';

export default async function Page() {
  const posts = await db.post.findMany();     // direct DB access, no API route

  return (
    <ul>
      {posts.map((p) => (
        <li key={p.id}>
          {p.title}
          <LikeButton postId={p.id} />        {/* interactive island */}
        </li>
      ))}
    </ul>
  );
}

// LikeButton.jsx
'use client';                                  // opt into the client bundle
import { useState } from 'react';

export default function LikeButton({ postId }) {
  const [liked, setLiked] = useState(false);
  return <button onClick={() => setLiked(!liked)}>{liked ? '❤️' : '🤍'}</button>;
}
```

| | Server Component | Client Component |
|---|---|---|
| Hooks (`useState`, `useEffect`) | ❌ | ✅ |
| Event handlers | ❌ | ✅ |
| Browser APIs | ❌ | ✅ |
| `async`/`await` in the component | ✅ | ❌ (use `use()`) |
| Direct DB / secrets access | ✅ | ❌ |
| Ships JS to the client | **No** | Yes |

**Interview Tip:** RSC is not SSR. SSR renders your *client* components to HTML on the server and then hydrates them (JS still ships). RSC components never hydrate because they have no client JS at all. That distinction is the most-asked RSC question.

**Common Mistakes:** Putting `'use client'` at the top of the layout — it makes the entire subtree client-side and defeats the purpose. Push the boundary as deep as possible.

---

# Rapid Fire

**What is `React.Fragment`?**
Groups children without adding a DOM node. Shorthand `<></>`, but use `<React.Fragment key={x}>` when you need a key.

**What are refs and when do you use them?**
Escape hatches to access DOM nodes or hold mutable values that don't trigger re-renders — focus management, measurements, scroll position, timer ids, third-party libraries.

**What is `forwardRef`?**
Passes a ref through a component to a child DOM node. In React 19, `ref` is a normal prop and `forwardRef` is no longer required.

**What is `useImperativeHandle`?**
Customises what a parent gets from a ref — exposing `{ focus, reset }` instead of the raw DOM node. Use sparingly; it's imperative by nature.

**What is `React.memo`?**
Skips re-rendering when props are shallowly equal. Not a hook — a HOC. See [performance.md](performance.md).

**What is `PureComponent`?**
The class equivalent of `React.memo` — shallow prop and state comparison in `shouldComponentUpdate`.

**What is `children`?**
A special prop holding whatever is between the component's tags. Enables composition and slot-like APIs.

**What is `dangerouslySetInnerHTML`?**
React's `innerHTML`. Named to make you pause — always sanitise (DOMPurify) or you're shipping XSS.

**What is the difference between `useEffect` and `useLayoutEffect`?**
`useEffect` runs after paint (async, non-blocking). `useLayoutEffect` runs synchronously after DOM mutations but before paint — use it only to prevent visual flicker when measuring.

**What is hydration?**
Attaching React event listeners and state to server-rendered HTML. A mismatch between server and client markup causes a hydration error.

**What is a hydration mismatch and how do you fix it?**
Server HTML differs from the first client render — usually from `Date.now()`, `Math.random()`, `window`, or locale formatting. Fix by rendering the value in `useEffect`, or `suppressHydrationWarning` for genuinely dynamic leaves.

**What is `key` on a component used for besides lists?**
Forcing a remount to reset internal state — `<Form key={userId} />`.

**What is prop types vs TypeScript?**
`prop-types` validates at runtime (dev only) and is deprecated in React 19. TypeScript checks at compile time. Use TypeScript.

**What is `StrictMode`?**
A dev-only wrapper that double-invokes renders and effects to surface impurity and missing cleanup. No effect in production.

**What is `Suspense`?**
Declaratively shows a fallback while children are "not ready" — lazy components, and data with RSC/`use()`.

**What is `lazy`?**
Code-splits a component: `const X = lazy(() => import('./X'))`, wrapped in `<Suspense>`.

**Why must hooks be called unconditionally at the top level?**
React tracks hooks by call order per component. A conditional hook shifts the order and state gets assigned to the wrong hook.

**What is a controlled vs uncontrolled component warning?**
Switching an input's `value` between `undefined` and a defined value. Initialise state to `''`, never `undefined`.

**What is reconciliation vs rendering vs committing?**
Rendering = calling components to produce elements. Reconciliation = diffing the new tree with the old. Committing = applying DOM changes.

**Can you use `async` directly on a `useEffect` callback?**
No — it would return a promise where React expects a cleanup function. Define an inner async function and call it.

**What is `useSyncExternalStore`?**
Subscribes to an external store (Redux, Zustand, browser APIs) in a way that's safe under concurrent rendering and SSR.

**What is `useId`?**
Generates stable unique ids that match between server and client — for `htmlFor`/`aria-describedby`. Never use it for list keys.

**What is React Native and does React knowledge transfer?**
A framework rendering React components to native iOS/Android views. Component model, hooks and state management transfer; DOM and CSS do not.

---

## 📌 Interview Checklist

- [ ] Explain reconciliation and why keys matter (with the delete-a-row example)
- [ ] Controlled vs uncontrolled — and when file inputs force your hand
- [ ] Why is `setState` async? Show the functional-updater fix
- [ ] Fix a `useEffect` data-fetching race condition live
- [ ] Context vs Zustand vs TanStack Query — server state vs client state
- [ ] Why is index-as-key a bug? Demo it
- [ ] What does StrictMode double-invocation reveal?
- [ ] RSC vs SSR — the one-sentence difference
- [ ] Build a compound component (Tabs) from scratch
