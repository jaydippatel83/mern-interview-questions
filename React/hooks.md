# 🪝 React Hooks — Interview Questions

> Every built-in hook, the rules, dependency arrays, and 15 custom hooks you should be able to write on a whiteboard.

---

## Table of Contents

1. [Rules of Hooks](#rules-of-hooks)
2. [useState](#usestate)
3. [useEffect](#useeffect)
4. [useContext](#usecontext)
5. [useReducer](#usereducer)
6. [useRef](#useref)
7. [useMemo & useCallback](#usememo--usecallback)
8. [useLayoutEffect](#uselayouteffect)
9. [Concurrent Hooks](#concurrent-hooks)
10. [Other Built-in Hooks](#other-built-in-hooks)
11. [React 19 Hooks](#react-19-hooks)
12. [Custom Hooks Library](#custom-hooks-library)
13. [Rapid Fire](#rapid-fire)

---

# Rules of Hooks

## What are the rules of hooks and why do they exist?

### Answer

1. **Only call hooks at the top level** — never inside conditions, loops, nested functions or after an early return.
2. **Only call hooks from React functions** — components or other custom hooks.

### Why do we use it?

React stores hook state in an **ordered list per component**, not by name. It matches state to hooks purely by call order.

### Example

```jsx
// Internally, roughly:
// component.hooks = [
//   { state: 0 },        ← useState #1
//   { deps: [x] },       ← useEffect #2
//   { state: '' },       ← useState #3
// ]

// ❌ Breaks the order
function Bad({ isLoggedIn }) {
  if (isLoggedIn) {
    const [name, setName] = useState('');   // hook #1 only sometimes exists
  }
  const [count, setCount] = useState(0);    // sometimes #1, sometimes #2 💥
}

// ✅ Condition inside the hook, not around it
function Good({ isLoggedIn }) {
  const [name, setName] = useState('');
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!isLoggedIn) return;
    doSomething();
  }, [isLoggedIn]);
}
```

**Interview Tip:** The linter (`eslint-plugin-react-hooks`) enforces both rules. `exhaustive-deps` is a *warning* you should treat as an error — most stale-closure bugs are a silenced dependency.

**Common Mistakes:** Early `return` before a hook — that's a conditional hook too.

---

# useState

## How does `useState` work in depth?

### Answer

```jsx
const [state, setState] = useState(initialValue);
```

Returns the current state and a setter. The setter queues an update and schedules a re-render.

### Example

```jsx
// 1. Lazy initialisation — the function runs ONCE, not on every render
const [state, setState] = useState(() => expensiveComputation());
const [state2, setState2] = useState(expensiveComputation());   // ❌ runs every render

// 2. Functional updates — required when the new value depends on the old
setCount(c => c + 1);

// 3. Objects and arrays must be replaced, not mutated
setUser({ ...user, name: 'New' });               // ✅
setItems([...items, newItem]);                   // ✅
setItems(items => items.filter(i => i.id !== id));// ✅
user.name = 'New'; setUser(user);                // ❌ same reference → no re-render

// 4. Bailout — setting the same value (Object.is) skips the re-render
setCount(5); setCount(5);   // second one is a no-op

// 5. Derive, don't duplicate
const [items, setItems] = useState([]);
const total = items.reduce((s, i) => s + i.price, 0);   // ✅ derived during render
// ❌ const [total, setTotal] = useState(0) — now you must keep them in sync

// 6. Reset state when a prop changes
function Profile({ userId }) {
  const [draft, setDraft] = useState('');
  // ❌ useEffect(() => setDraft(''), [userId]) — extra render
  // ✅ use a key on the parent instead:  <Profile key={userId} userId={userId} />
}
```

**Interview Tip:** "Derived state is not state." If a value can be computed from existing state or props during render, compute it. Storing it creates two sources of truth that drift.

**Common Mistakes:** Mutating state objects; `useState(props.value)` and expecting it to track prop updates.

---

# useEffect

## How does `useEffect` work and what does the dependency array do?

### Answer

Runs a side effect after render. The dependency array controls **when** it re-runs.

### Example

```jsx
useEffect(() => {           // after EVERY render — rarely what you want
  doThing();
});

useEffect(() => {           // once, after mount
  doThing();
}, []);

useEffect(() => {           // when id or filter changes
  doThing(id, filter);
}, [id, filter]);

useEffect(() => {
  const sub = api.subscribe(id, setData);
  return () => sub.unsubscribe();     // cleanup: before the NEXT effect and on unmount
}, [id]);
```

### The execution order

```
render → paint → cleanup(previous) → effect(current)
```

### Common effect patterns

```jsx
// 1. Data fetching with cancellation (fixes race conditions)
useEffect(() => {
  const controller = new AbortController();
  fetch(url, { signal: controller.signal })
    .then(r => r.json())
    .then(setData)
    .catch(e => { if (e.name !== 'AbortError') setError(e); });
  return () => controller.abort();
}, [url]);

// 2. Event listeners
useEffect(() => {
  const onResize = () => setWidth(window.innerWidth);
  window.addEventListener('resize', onResize);
  return () => window.removeEventListener('resize', onResize);
}, []);

// 3. Timers
useEffect(() => {
  const id = setInterval(tick, 1000);
  return () => clearInterval(id);
}, []);

// 4. Subscriptions
useEffect(() => {
  const unsub = store.subscribe(setState);
  return unsub;
}, [store]);
```

### When you should NOT use an effect

```jsx
// ❌ Transforming data for rendering
useEffect(() => { setFiltered(items.filter(fn)); }, [items]);
// ✅ Just compute it
const filtered = items.filter(fn);         // or useMemo if expensive

// ❌ Handling a user event
useEffect(() => { if (submitted) postData(); }, [submitted]);
// ✅ Do it in the handler
const onSubmit = () => postData();

// ❌ Resetting state on prop change
useEffect(() => { setSelection(null); }, [items]);
// ✅ Use a key, or compute during render
```

**Interview Tip:** Quote the modern framing: *"Effects are for synchronising with external systems."* If there's no external system (DOM, network, subscription, timer, browser API), you probably don't need an effect. The React docs page "You Might Not Need an Effect" is the reference.

**Common Mistakes:** Missing dependencies causing stale closures; an object/array literal in deps (`{}` is a new reference each render → infinite loop); using effects for derived state.

---

## What is a stale closure and how do you fix it?

### Answer

An effect or callback captures the values from the render in which it was created. If deps are missing, it keeps using the old values forever.

### Example

```jsx
// ❌ Stale closure — count is always 0
function Counter() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      console.log(count);        // ALWAYS 0 — captured from the first render
      setCount(count + 1);       // always 0 + 1
    }, 1000);
    return () => clearInterval(id);
  }, []);                        // empty deps → closure never updates
}

// ✅ Fix 1: functional updater — no dependency on count at all
useEffect(() => {
  const id = setInterval(() => setCount(c => c + 1), 1000);
  return () => clearInterval(id);
}, []);

// ✅ Fix 2: include the dependency (re-creates the interval each tick — usually worse)
useEffect(() => {
  const id = setInterval(() => setCount(count + 1), 1000);
  return () => clearInterval(id);
}, [count]);

// ✅ Fix 3: a ref for values you want to read but not react to
function useLatest(value) {
  const ref = useRef(value);
  useEffect(() => { ref.current = value; });
  return ref;
}

function Component({ onTick }) {
  const onTickRef = useLatest(onTick);
  useEffect(() => {
    const id = setInterval(() => onTickRef.current(), 1000);   // always latest
    return () => clearInterval(id);
  }, []);                     // interval created ONCE
}
```

**Interview Tip:** Fix 3 is the "latest ref" pattern — it's how libraries handle callback props that change every render without restarting subscriptions. React's upcoming `useEffectEvent` formalises it.

---

# useContext

## How do you use Context efficiently?

### Answer

```jsx
const ThemeContext = createContext(null);

function ThemeProvider({ children }) {
  const [theme, setTheme] = useState('light');

  // ⚠️ Memoize — otherwise every consumer re-renders on every provider render
  const value = useMemo(() => ({ theme, setTheme }), [theme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

// Custom hook enforces correct usage and removes the null check downstream
function useTheme() {
  const ctx = useContext(ThemeContext);
  if (ctx === null) throw new Error('useTheme must be used within a ThemeProvider');
  return ctx;
}
```

### Splitting to avoid re-renders

```jsx
// State changes often; dispatch never changes.
// Split them so dispatch-only consumers don't re-render.
const StateContext = createContext(null);
const DispatchContext = createContext(null);

function Provider({ children }) {
  const [state, dispatch] = useReducer(reducer, initial);
  return (
    <DispatchContext.Provider value={dispatch}>
      <StateContext.Provider value={state}>{children}</StateContext.Provider>
    </DispatchContext.Provider>
  );
}
```

**Interview Tip:** Context has **no selector support** — every consumer re-renders when the value's identity changes, even if it only reads one field. That's the single reason people move to Zustand/Redux for frequently-changing state.

---

# useReducer

## When should you use `useReducer` instead of `useState`?

### Answer

When state transitions are complex, involve multiple sub-values, or the next state depends on the previous in non-trivial ways.

### Example

```jsx
const initialState = { status: 'idle', data: null, error: null, page: 1 };

function reducer(state, action) {
  switch (action.type) {
    case 'FETCH_START':
      return { ...state, status: 'loading', error: null };
    case 'FETCH_SUCCESS':
      return { ...state, status: 'success', data: action.payload };
    case 'FETCH_ERROR':
      return { ...state, status: 'error', error: action.error };
    case 'NEXT_PAGE':
      return { ...state, page: state.page + 1 };
    case 'RESET':
      return initialState;
    default:
      throw new Error(`Unknown action: ${action.type}`);
  }
}

function DataList() {
  const [state, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    dispatch({ type: 'FETCH_START' });
    fetchData(state.page)
      .then(d => dispatch({ type: 'FETCH_SUCCESS', payload: d }))
      .catch(e => dispatch({ type: 'FETCH_ERROR', error: e }));
  }, [state.page]);
}

// Lazy init — third argument
const [state, dispatch] = useReducer(reducer, initialCount, (n) => ({ count: n * 2 }));
```

### useState vs useReducer

| Use `useState` | Use `useReducer` |
|---|---|
| Independent primitives | Related values that change together |
| Simple set operations | Multi-step transitions |
| 1–3 state variables | Many, with invariants between them |
| Logic lives in handlers | Logic centralised and testable |

**Interview Tip:** The reducer is a pure function — you can unit test every transition without rendering anything. That testability is a strong argument in a code review.

**Common Mistakes:** Impure reducers (mutating state, doing async work inside). Side effects belong in the effect or the handler that dispatches.

---

# useRef

## What is `useRef` used for?

### Answer

Two distinct jobs:
1. **DOM access** — focus, scroll, measure, integrate a non-React library.
2. **Mutable instance variable** — a value that persists across renders **without** triggering one.

### Example

```jsx
// 1. DOM ref
function SearchInput() {
  const inputRef = useRef(null);
  useEffect(() => { inputRef.current?.focus(); }, []);
  return <input ref={inputRef} />;
}

// 2. Mutable value — timer id
function Timer() {
  const intervalRef = useRef(null);
  const start = () => {
    if (intervalRef.current) return;
    intervalRef.current = setInterval(tick, 1000);
  };
  const stop = () => {
    clearInterval(intervalRef.current);
    intervalRef.current = null;
  };
  useEffect(() => stop, []);   // cleanup on unmount
}

// 3. Previous value
function usePrevious(value) {
  const ref = useRef();
  useEffect(() => { ref.current = value; }, [value]);
  return ref.current;
}

// 4. Skip the first render
function useUpdateEffect(effect, deps) {
  const isFirst = useRef(true);
  useEffect(() => {
    if (isFirst.current) { isFirst.current = false; return; }
    return effect();
  }, deps);
}

// 5. Callback ref — runs when the node attaches/detaches
function Measured() {
  const [height, setHeight] = useState(0);
  const measuredRef = useCallback((node) => {
    if (node !== null) setHeight(node.getBoundingClientRect().height);
  }, []);
  return <div ref={measuredRef}>…</div>;
}
```

### ref vs state

| | `useRef` | `useState` |
|---|---|---|
| Triggers re-render | **No** | Yes |
| Value available | Immediately (`.current`) | Next render |
| Use for | Values the UI doesn't display | Values the UI displays |

**Interview Tip:** Never read or write `ref.current` **during render** — it makes the render impure and breaks under concurrent rendering. Do it in effects or handlers.

**Common Mistakes:** Using a ref to store something the UI must display, then wondering why the screen doesn't update.

---

# useMemo & useCallback

## What is the difference between `useMemo` and `useCallback`?

### Answer

- **`useMemo(fn, deps)`** — caches the **result** of calling `fn`.
- **`useCallback(fn, deps)`** — caches the **function itself**. Exactly equivalent to `useMemo(() => fn, deps)`.

### Why do we use it?

Two reasons, and only two:
1. The computation is genuinely expensive.
2. The value feeds a **referential equality** check — a `React.memo` child's props, or another hook's dependency array.

### When should we use it?

Not by default. Both have a cost (memory + comparison + more complex code). Measure first with the React Profiler.

### Example

```jsx
// ✅ Expensive computation
const sortedFiltered = useMemo(
  () => items.filter(i => i.active).sort((a, b) => b.score - a.score),
  [items]
);

// ✅ Stable reference for a memoized child
const handleSelect = useCallback((id) => {
  setSelected(id);
}, []);
return <MemoizedList onSelect={handleSelect} />;   // memo actually works now

// ✅ Stable object for context
const value = useMemo(() => ({ user, login, logout }), [user, login, logout]);

// ✅ Stable dependency for another hook
const options = useMemo(() => ({ threshold: 0.5 }), []);
useEffect(() => { observe(options); }, [options]);   // without useMemo → infinite loop

// ❌ Pointless — cheaper to just compute it
const doubled = useMemo(() => count * 2, [count]);

// ❌ Pointless — the child isn't memoized, so a stable ref changes nothing
const onClick = useCallback(() => {}, []);
return <button onClick={onClick} />;
```

**Interview Tip:** Say this: *"`useCallback` on a prop is useless unless the child is wrapped in `React.memo`."* Most candidates memoize callbacks reflexively without knowing that.

**Also mention:** the **React Compiler** (React 19) auto-memoizes, which will make most manual `useMemo`/`useCallback` unnecessary.

**Common Mistakes:** Memoizing everything "for performance" — it adds allocation and comparison overhead and often makes things slower.

---

# useLayoutEffect

## When do you need `useLayoutEffect`?

### Answer

It fires **synchronously after DOM mutations but before the browser paints**. Use it only when you must read layout and mutate the DOM before the user sees anything.

### Example

```jsx
// ❌ useEffect → user sees the tooltip at 0,0 for one frame, then it jumps
useEffect(() => {
  const rect = ref.current.getBoundingClientRect();
  setPosition({ top: rect.bottom, left: rect.left });
}, []);

// ✅ useLayoutEffect → positioned before paint, no flicker
useLayoutEffect(() => {
  const rect = ref.current.getBoundingClientRect();
  setPosition({ top: rect.bottom, left: rect.left });
}, []);
```

### Order

```
render → DOM mutations → useLayoutEffect (blocking) → paint → useEffect
```

**Interview Tip:** It blocks paint, so it hurts performance if overused — and it warns during SSR because there's no layout on the server. Use `useEffect` unless you observe a flicker.

**Common Mistakes:** Reaching for it habitually. 95% of effects should be `useEffect`.

---

# Concurrent Hooks

## `useTransition` and `useDeferredValue`

### Answer

Both mark work as non-urgent so React can interrupt it to keep the UI responsive.

```jsx
// useTransition — when YOU own the state setter
const [isPending, startTransition] = useTransition();

const onChange = (e) => {
  setQuery(e.target.value);                      // urgent
  startTransition(() => setResults(filter(e.target.value)));  // interruptible
};

// useDeferredValue — when the value arrives as a prop
function Results({ query }) {
  const deferred = useDeferredValue(query);
  const isStale = query !== deferred;
  const list = useMemo(() => filter(deferred), [deferred]);
  return <div style={{ opacity: isStale ? 0.5 : 1 }}>{list}</div>;
}
```

**Interview Tip:** Neither makes the work *faster* — they make it **interruptible**, so typing stays smooth while an expensive render is discarded and restarted.

---

# Other Built-in Hooks

```jsx
// useId — SSR-safe unique ids for accessibility attributes
function Field({ label }) {
  const id = useId();
  return (
    <>
      <label htmlFor={id}>{label}</label>
      <input id={id} aria-describedby={`${id}-hint`} />
      <p id={`${id}-hint`}>Hint text</p>
    </>
  );
}
// ❌ Never use useId for list keys

// useSyncExternalStore — subscribe to an external store safely
function useOnlineStatus() {
  return useSyncExternalStore(
    (callback) => {                        // subscribe
      window.addEventListener('online', callback);
      window.addEventListener('offline', callback);
      return () => {
        window.removeEventListener('online', callback);
        window.removeEventListener('offline', callback);
      };
    },
    () => navigator.onLine,                // client snapshot
    () => true                             // server snapshot (SSR)
  );
}

// useDebugValue — label a custom hook in React DevTools
function useOnlineStatus() {
  const isOnline = /* … */;
  useDebugValue(isOnline ? 'Online' : 'Offline');
  return isOnline;
}

// useImperativeHandle — expose a custom API through a ref
const Input = forwardRef((props, ref) => {
  const inputRef = useRef(null);
  useImperativeHandle(ref, () => ({
    focus: () => inputRef.current.focus(),
    clear: () => { inputRef.current.value = ''; },
  }), []);
  return <input ref={inputRef} {...props} />;
});
```

---

# React 19 Hooks

```jsx
// useActionState — form action + pending + error, in one hook
const [state, formAction, isPending] = useActionState(
  async (prevState, formData) => {
    const result = await submitForm(formData);
    return result.error ?? null;
  },
  null
);
<form action={formAction}>…</form>

// useFormStatus — read the enclosing form's state, no props needed
function SubmitButton() {
  const { pending, data, method } = useFormStatus();
  return <button disabled={pending}>{pending ? 'Saving…' : 'Save'}</button>;
}

// useOptimistic — show the result immediately, revert on failure
const [optimisticTodos, addOptimisticTodo] = useOptimistic(
  todos,
  (current, newTodo) => [...current, { ...newTodo, pending: true }]
);

// use() — read a promise or context; CAN be called conditionally
function Comments({ promise }) {
  const comments = use(promise);      // suspends
  return comments.map(…);
}
```

---

# Custom Hooks Library

Fifteen hooks worth memorising — these come up as "write a custom hook that…" questions.

```jsx
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';

/* 1. useToggle */
export function useToggle(initial = false) {
  const [value, setValue] = useState(initial);
  const toggle = useCallback(() => setValue(v => !v), []);
  const setTrue = useCallback(() => setValue(true), []);
  const setFalse = useCallback(() => setValue(false), []);
  return { value, toggle, setTrue, setFalse };
}

/* 2. useLocalStorage — synced across tabs */
export function useLocalStorage(key, initialValue) {
  const [stored, setStored] = useState(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch {
      return initialValue;
    }
  });

  const setValue = useCallback((value) => {
    setStored((prev) => {
      const next = value instanceof Function ? value(prev) : value;
      try { window.localStorage.setItem(key, JSON.stringify(next)); } catch {}
      return next;
    });
  }, [key]);

  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === key && e.newValue) setStored(JSON.parse(e.newValue));
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [key]);

  return [stored, setValue];
}

/* 3. useDebounce — debounce a VALUE */
export function useDebounce(value, delay = 500) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

/* 4. useDebouncedCallback — debounce a FUNCTION */
export function useDebouncedCallback(callback, delay = 500) {
  const timerRef = useRef();
  const callbackRef = useRef(callback);
  useEffect(() => { callbackRef.current = callback; });

  useEffect(() => () => clearTimeout(timerRef.current), []);

  return useCallback((...args) => {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => callbackRef.current(...args), delay);
  }, [delay]);
}

/* 5. usePrevious */
export function usePrevious(value) {
  const ref = useRef();
  useEffect(() => { ref.current = value; }, [value]);
  return ref.current;
}

/* 6. useFetch — with abort, loading and error */
export function useFetch(url, options) {
  const [state, setState] = useState({ data: null, loading: true, error: null });

  useEffect(() => {
    if (!url) return;
    const controller = new AbortController();
    setState({ data: null, loading: true, error: null });

    (async () => {
      try {
        const res = await fetch(url, { ...options, signal: controller.signal });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        setState({ data: await res.json(), loading: false, error: null });
      } catch (error) {
        if (error.name !== 'AbortError') setState({ data: null, loading: false, error });
      }
    })();

    return () => controller.abort();
  }, [url]);   // note: `options` intentionally excluded — memoize it upstream

  return state;
}

/* 7. useOnClickOutside — dropdowns, modals */
export function useOnClickOutside(ref, handler) {
  const handlerRef = useRef(handler);
  useEffect(() => { handlerRef.current = handler; });

  useEffect(() => {
    const listener = (event) => {
      if (!ref.current || ref.current.contains(event.target)) return;
      handlerRef.current(event);
    };
    document.addEventListener('mousedown', listener);
    document.addEventListener('touchstart', listener);
    return () => {
      document.removeEventListener('mousedown', listener);
      document.removeEventListener('touchstart', listener);
    };
  }, [ref]);
}

/* 8. useMediaQuery — responsive logic in JS */
export function useMediaQuery(query) {
  const [matches, setMatches] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(query).matches
  );
  useEffect(() => {
    const mql = window.matchMedia(query);
    const onChange = (e) => setMatches(e.matches);
    mql.addEventListener('change', onChange);
    setMatches(mql.matches);
    return () => mql.removeEventListener('change', onChange);
  }, [query]);
  return matches;
}

/* 9. useIntersectionObserver — lazy loading, infinite scroll */
export function useIntersectionObserver(options = {}) {
  const [entry, setEntry] = useState(null);
  const [node, setNode] = useState(null);

  useEffect(() => {
    if (!node) return;
    const observer = new IntersectionObserver(([e]) => setEntry(e), options);
    observer.observe(node);
    return () => observer.disconnect();
  }, [node, options.threshold, options.root, options.rootMargin]);

  return [setNode, entry, entry?.isIntersecting ?? false];
}

/* 10. useWindowSize */
export function useWindowSize() {
  const [size, setSize] = useState({ width: 0, height: 0 });
  useEffect(() => {
    const onResize = () => setSize({ width: window.innerWidth, height: window.innerHeight });
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return size;
}

/* 11. useCopyToClipboard */
export function useCopyToClipboard(resetAfter = 2000) {
  const [copied, setCopied] = useState(false);
  const copy = useCallback(async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), resetAfter);
      return true;
    } catch {
      setCopied(false);
      return false;
    }
  }, [resetAfter]);
  return [copied, copy];
}

/* 12. useInterval — declarative, no stale closures */
export function useInterval(callback, delay) {
  const savedCallback = useRef(callback);
  useEffect(() => { savedCallback.current = callback; }, [callback]);

  useEffect(() => {
    if (delay === null) return;               // pass null to pause
    const id = setInterval(() => savedCallback.current(), delay);
    return () => clearInterval(id);
  }, [delay]);
}

/* 13. useEventListener — typed, auto-cleaning */
export function useEventListener(eventName, handler, element = window) {
  const savedHandler = useRef(handler);
  useEffect(() => { savedHandler.current = handler; }, [handler]);

  useEffect(() => {
    const target = element?.current ?? element;
    if (!target?.addEventListener) return;
    const listener = (e) => savedHandler.current(e);
    target.addEventListener(eventName, listener);
    return () => target.removeEventListener(eventName, listener);
  }, [eventName, element]);
}

/* 14. useAsync — run an async function with state */
export function useAsync(asyncFn, immediate = true) {
  const [state, setState] = useState({ status: 'idle', value: null, error: null });

  const execute = useCallback(async (...args) => {
    setState({ status: 'pending', value: null, error: null });
    try {
      const value = await asyncFn(...args);
      setState({ status: 'success', value, error: null });
      return value;
    } catch (error) {
      setState({ status: 'error', value: null, error });
      throw error;
    }
  }, [asyncFn]);

  useEffect(() => { if (immediate) execute(); }, [execute, immediate]);

  return { ...state, execute };
}

/* 15. useIsMounted — guard against setting state after unmount */
export function useIsMounted() {
  const isMounted = useRef(false);
  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);
  return useCallback(() => isMounted.current, []);
}
```

### Usage example

```jsx
function SearchPage() {
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 400);
  const { data, loading } = useFetch(
    debouncedQuery ? `/api/search?q=${encodeURIComponent(debouncedQuery)}` : null
  );
  const isMobile = useMediaQuery('(max-width: 640px)');

  return (
    <>
      <input value={query} onChange={(e) => setQuery(e.target.value)} />
      {loading ? <Spinner /> : <Results items={data} compact={isMobile} />}
    </>
  );
}
```

**Interview Tip:** In a machine-coding round, `useDebounce` + `useFetch` + a search UI is the single most common React task. Practise writing both from memory, including the abort cleanup.

---

# Rapid Fire

**Can you call a hook inside a condition?**
No — hooks are matched by call order. Put the condition inside the hook.

**Can custom hooks call other hooks?**
Yes — that's what makes them hooks. A function that doesn't call hooks is just a function.

**Why must custom hooks start with `use`?**
Convention that lets the linter apply the rules of hooks to them.

**Do two components using the same custom hook share state?**
No. Each call gets its own independent state. Only Context or an external store shares.

**What is the difference between `useMemo` and `React.memo`?**
`useMemo` caches a value inside a component; `React.memo` skips re-rendering a whole component when its props are shallow-equal.

**Why does my effect run twice in development?**
StrictMode double-invokes to reveal missing cleanup. It doesn't happen in production.

**How do you run an effect only on update, not mount?**
A `useRef` first-render flag (`useUpdateEffect` above) — but consider whether you actually need it.

**Can `useEffect` be async?**
Not directly. Define an async function inside and call it, or use an IIFE.

**What happens if you omit the dependency array entirely?**
The effect runs after every render.

**How do you clean up a fetch in an effect?**
`AbortController` + `controller.abort()` in the cleanup, and ignore `AbortError`.

**What is `useDebugValue`?**
Displays a label for a custom hook in React DevTools. Dev-only.

**How do you share state between hooks in different components?**
Lift it to a common parent, use Context, or use an external store with `useSyncExternalStore`.

**What is the React Compiler?**
An optimising compiler (React 19) that auto-memoizes components and values, removing most manual `useMemo`/`useCallback`.

**What does `flushSync` do?**
Forces a synchronous re-render, opting out of batching. Use only when you must read the DOM immediately after a state change.

---

## 📌 Interview Checklist

- [ ] Explain why hooks can't be conditional (call-order argument)
- [ ] Fix a stale closure three different ways
- [ ] `useMemo` vs `useCallback` vs `React.memo`
- [ ] Write `useDebounce` and `useFetch` from memory
- [ ] When do you NOT need `useEffect`? Give three cases
- [ ] `useEffect` vs `useLayoutEffect` — the flicker example
- [ ] What does the effect cleanup function actually run before?
- [ ] Why does StrictMode double-invoke, and what does it catch?
