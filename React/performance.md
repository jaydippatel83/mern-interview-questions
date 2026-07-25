# 🚀 React Performance — Interview Questions

> Re-renders · Memoization · Code splitting · Virtualization · Profiling · Core Web Vitals

---

## Table of Contents

1. [Understanding Re-renders](#understanding-re-renders)
2. [Memoization](#memoization)
3. [State Placement & Composition](#state-placement--composition)
4. [Code Splitting](#code-splitting)
5. [List Virtualization](#list-virtualization)
6. [Images & Assets](#images--assets)
7. [Concurrent Rendering](#concurrent-rendering)
8. [Profiling & Measurement](#profiling--measurement)
9. [Bundle Optimisation](#bundle-optimisation)
10. [Checklist](#performance-checklist)

---

# Understanding Re-renders

## When does a React component re-render?

### Answer

A component re-renders when:

1. Its **own state** changes (`useState`, `useReducer`)
2. Its **parent re-renders** — regardless of whether its props changed
3. A **Context** it consumes changes value
4. Its **key** changes (that's a remount, not a re-render)
5. A hook it uses triggers an update (`useSyncExternalStore`, etc.)

**Not** a cause: props changing when the parent didn't re-render (impossible), or refs changing.

### Example

```jsx
function Parent() {
  const [count, setCount] = useState(0);

  return (
    <>
      <button onClick={() => setCount(c => c + 1)}>{count}</button>
      <ExpensiveChild />       {/* re-renders on EVERY count change,
                                   even though it receives no props */}
    </>
  );
}
```

### Why do we use it?

"Parent re-renders → all children re-render" is the root cause of nearly every React performance problem. Understanding it is more valuable than knowing every optimisation API.

**Interview Tip:** A re-render is not automatically a DOM update. React still diffs, and if the output is identical no DOM changes happen. Re-renders cost **CPU in the render phase**, not necessarily paint. That nuance matters — it's why premature memoization often doesn't help.

**Common Mistakes:** Believing `React.memo` on the leaf fixes everything, when the actual cost is a huge component tree re-rendering above it.

---

## What is a wasted render and how do you find one?

### Answer

A render that produces identical output. It burns CPU with no visible effect.

### How to find them

```jsx
// 1. React DevTools → Profiler → record an interaction
//    "Why did this render?" shows the exact reason per component.

// 2. Highlight updates: DevTools → Components → ⚙️ → "Highlight updates when components render"

// 3. The Profiler component — measure programmatically
import { Profiler } from 'react';

<Profiler
  id="ProductList"
  onRender={(id, phase, actualDuration, baseDuration, startTime, commitTime) => {
    if (actualDuration > 16) console.warn(`${id} took ${actualDuration.toFixed(1)}ms (${phase})`);
  }}
>
  <ProductList />
</Profiler>

// 4. A quick manual counter during development
function useRenderCount(name) {
  const count = useRef(0);
  count.current++;
  console.log(`${name} rendered ${count.current}x`);
}
```

**Interview Tip:** Always say **"profile first"**. Optimising without measuring is how codebases end up with `useCallback` on every function and no measurable improvement.

---

# Memoization

## What is `React.memo` and when should you use it?

### Answer

A HOC that skips re-rendering when the new props are **shallowly equal** to the previous ones.

### Example

```jsx
const ProductCard = React.memo(function ProductCard({ product, onAdd }) {
  console.log('rendering', product.id);
  return (
    <div>
      {product.name}
      <button onClick={() => onAdd(product.id)}>Add</button>
    </div>
  );
});

// ⚠️ Broken — a new object/function every render defeats the memo
function List({ products }) {
  return products.map(p => (
    <ProductCard
      key={p.id}
      product={p}
      onAdd={(id) => addToCart(id)}     // ❌ new function identity each render
      style={{ margin: 8 }}             // ❌ new object each render
    />
  ));
}

// ✅ Fixed
function List({ products }) {
  const onAdd = useCallback((id) => addToCart(id), []);
  const style = useMemo(() => ({ margin: 8 }), []);
  return products.map(p => (
    <ProductCard key={p.id} product={p} onAdd={onAdd} style={style} />
  ));
}

// Custom comparison — use rarely, and never with a deep compare
const Row = React.memo(RowBase, (prev, next) =>
  prev.item.id === next.item.id && prev.item.updatedAt === next.item.updatedAt
);
```

### When should we use it?

- The component is **expensive** to render (big subtree, heavy computation)
- It renders **often** with the **same props**
- It's a **list item** rendered hundreds of times

### When NOT to use it

- Cheap components (a `<span>` with text) — the comparison costs more than the render
- Props change on nearly every render anyway
- The component is rendered once

**Interview Tip:** `React.memo` does a shallow compare, so `children` breaks it — JSX children create a new element object every render:

```jsx
<MemoizedLayout><Sidebar /></MemoizedLayout>   // memo never hits
```

**Common Mistakes:** Wrapping everything in `memo` as a policy. Measure. Also: `memo` does *not* prevent re-renders caused by Context or the component's own state.

---

## What is the React Compiler and does it replace manual memoization?

### Answer

An optimising compiler (stable in React 19) that analyses your components and **automatically inserts memoization** — the equivalent of `useMemo`, `useCallback` and `React.memo`, applied precisely where it helps.

### Example

```jsx
// You write plain React
function ProductList({ products, filter }) {
  const filtered = products.filter(p => p.category === filter);
  const onSelect = (id) => setSelected(id);
  return filtered.map(p => <Card key={p.id} product={p} onSelect={onSelect} />);
}

// The compiler emits memoized equivalents — no useMemo/useCallback in your source
```

### Requirements

Your components must follow the **Rules of React**: pure render, no mutation of props/state, no reading refs during render. The `eslint-plugin-react-compiler` flags violations.

**Interview Tip:** Frame it as: *"The compiler makes manual memoization the exception rather than the default — but only if your components are actually pure. It's a strong argument for following the rules strictly."*

---

# State Placement & Composition

## How does moving state around improve performance?

### Answer

Often better than memoization: **isolate the state so fewer components re-render**.

### Example

```jsx
// ❌ Typing in the input re-renders ExpensiveTree on every keystroke
function App() {
  const [text, setText] = useState('');
  return (
    <>
      <input value={text} onChange={(e) => setText(e.target.value)} />
      <ExpensiveTree />
    </>
  );
}

// ✅ Fix 1: push state DOWN into its own component
function SearchInput() {
  const [text, setText] = useState('');
  return <input value={text} onChange={(e) => setText(e.target.value)} />;
}
function App() {
  return <><SearchInput /><ExpensiveTree /></>;
}

// ✅ Fix 2: lift CONTENT up — pass the expensive tree as children
function Wrapper({ children }) {
  const [text, setText] = useState('');
  return (
    <>
      <input value={text} onChange={(e) => setText(e.target.value)} />
      {children}          {/* created by App, NOT re-created when text changes */}
    </>
  );
}
function App() {
  return <Wrapper><ExpensiveTree /></Wrapper>;
}
```

### Why does Fix 2 work?

`children` is a prop. The element was created in `App`, which didn't re-render. `Wrapper` re-renders and simply passes the same element object through — React sees the identical reference and skips the subtree.

**Interview Tip:** This is the "pass elements as props" pattern, and it beats memoization because it requires **no comparison at all**. Bringing it up unprompted is a strong senior signal.

---

## How do you prevent Context from re-rendering everything?

### Answer

```jsx
// ❌ Everything re-renders whenever ANY field changes
<AppContext.Provider value={{ user, theme, cart, notifications }}>

// ✅ 1. Split contexts by change frequency
<UserContext.Provider value={user}>
  <ThemeContext.Provider value={theme}>
    <CartContext.Provider value={cart}>

// ✅ 2. Separate state from dispatch (dispatch is stable forever)
<DispatchContext.Provider value={dispatch}>
  <StateContext.Provider value={state}>

// ✅ 3. Memoize the value object
const value = useMemo(() => ({ user, setUser }), [user]);

// ✅ 4. Memoize consumers so unrelated context changes don't cascade
const Child = React.memo(function Child() {
  const { theme } = useContext(ThemeContext);
  return <div className={theme} />;
});

// ✅ 5. For high-frequency state, use a store with selectors instead
const count = useCartStore((s) => s.items.length);   // re-renders only on length change
```

**Interview Tip:** Context has no selector mechanism — this is a genuine architectural limitation, not a bug. `useSyncExternalStore` + an external store is the standard workaround, and it's exactly what Zustand does in ~1kB.

---

# Code Splitting

## How do you code split a React app?

### Answer

```jsx
import { lazy, Suspense } from 'react';

// 1. Route-based — the highest-value split
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Settings = lazy(() => import('./pages/Settings'));

<Suspense fallback={<PageSkeleton />}>
  <Routes>
    <Route path="/dashboard" element={<Dashboard />} />
    <Route path="/settings" element={<Settings />} />
  </Routes>
</Suspense>

// 2. Component-based — heavy widgets below the fold
const Chart = lazy(() => import('./Chart'));          // recharts is ~100kB
const RichEditor = lazy(() => import('./RichEditor'));

{showChart && (
  <Suspense fallback={<ChartSkeleton />}>
    <Chart data={data} />
  </Suspense>
)}

// 3. Library-level — load only when the interaction happens
const onExport = async () => {
  const { default: jsPDF } = await import('jspdf');   // not in the main bundle
  new jsPDF().save('report.pdf');
};

// 4. Preload on intent — hover/focus starts the download early
const preloadDashboard = () => import('./pages/Dashboard');
<Link to="/dashboard" onMouseEnter={preloadDashboard} onFocus={preloadDashboard}>
  Dashboard
</Link>

// 5. Named exports need a wrapper
const Widget = lazy(() =>
  import('./widgets').then(m => ({ default: m.Widget }))
);

// 6. Retry on chunk load failure (deploys invalidate old chunks)
const lazyWithRetry = (importFn, retries = 2) =>
  lazy(() =>
    importFn().catch((err) =>
      retries > 0
        ? new Promise(r => setTimeout(r, 500)).then(() => lazyWithRetry(importFn, retries - 1))
        : Promise.reject(err)
    )
  );
```

**Interview Tip:** Mention the **chunk-load-error-after-deploy** problem: users on an old tab request a hashed chunk that no longer exists. The fix is a retry + a "new version available, reload" prompt. That's real production experience.

**Common Mistakes:** Splitting too granularly — dozens of tiny chunks means more requests and worse compression than a few well-sized ones.

---

# List Virtualization

## How do you render a list of 10,000 items?

### Answer

**Windowing** — render only the visible rows plus a small overscan buffer.

### Example

```jsx
import { useVirtualizer } from '@tanstack/react-virtual';

function VirtualList({ items }) {
  const parentRef = useRef(null);

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 60,      // estimated row height in px
    overscan: 5,                 // extra rows rendered outside the viewport
  });

  return (
    <div ref={parentRef} style={{ height: 600, overflow: 'auto' }}>
      <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
        {virtualizer.getVirtualItems().map((virtualRow) => (
          <div
            key={virtualRow.key}
            data-index={virtualRow.index}
            ref={virtualizer.measureElement}     // dynamic heights
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              transform: `translateY(${virtualRow.start}px)`,
            }}
          >
            <Row item={items[virtualRow.index]} />
          </div>
        ))}
      </div>
    </div>
  );
}
```

### Other strategies

| Strategy | When |
|---|---|
| Virtualization | Long lists/tables/grids |
| Pagination | Server-driven, SEO-friendly |
| Infinite scroll | Feeds, with IntersectionObserver |
| `content-visibility: auto` | CSS-only, zero JS, coarse control |

**Interview Tip:** Virtualization breaks Ctrl+F, and needs care for accessibility (`aria-rowcount`, `aria-rowindex`) and for anchor links to off-screen items. Naming those tradeoffs shows you've actually shipped it.

**Common Mistakes:** Virtualizing a 50-item list. Below a few hundred rows the machinery costs more than it saves.

---

# Images & Assets

## How do you optimise images in a React app?

### Answer

```jsx
// 1. Next.js Image — automatic resizing, format negotiation, lazy loading
import Image from 'next/image';

<Image
  src="/hero.jpg"
  alt="Product hero"
  width={1200}
  height={630}
  priority              // preload — for LCP images only
  placeholder="blur"
  blurDataURL={base64Tiny}
  sizes="(max-width: 768px) 100vw, 50vw"
/>

// 2. Plain React — do it manually
<img
  src="/hero-800.jpg"
  srcSet="/hero-400.jpg 400w, /hero-800.jpg 800w, /hero-1600.jpg 1600w"
  sizes="(max-width: 600px) 100vw, 50vw"
  width={1600}
  height={900}          // ALWAYS set — prevents layout shift (CLS)
  loading="lazy"        // never on the LCP image
  decoding="async"
  fetchPriority="low"
  alt="Descriptive text"
/>

// 3. Modern formats with fallback
<picture>
  <source srcSet="/hero.avif" type="image/avif" />
  <source srcSet="/hero.webp" type="image/webp" />
  <img src="/hero.jpg" alt="…" width={1200} height={630} />
</picture>
```

**Interview Tip:** The single highest-impact rule: **always set `width` and `height`** (or `aspect-ratio`). It costs nothing and takes CLS to zero. And never `loading="lazy"` on the hero — it *delays* LCP.

---

# Concurrent Rendering

## How do concurrent features improve perceived performance?

### Answer

They don't make work faster — they make it **interruptible**, so high-priority updates (typing, clicking) aren't blocked.

### Example

```jsx
function ProductSearch({ allProducts }) {
  const [query, setQuery] = useState('');
  const [isPending, startTransition] = useTransition();
  const [filtered, setFiltered] = useState(allProducts);

  const onChange = (e) => {
    const value = e.target.value;
    setQuery(value);                       // urgent — input updates instantly

    startTransition(() => {                // interruptible
      setFiltered(allProducts.filter(p =>
        p.name.toLowerCase().includes(value.toLowerCase())
      ));
    });
  };

  return (
    <>
      <input value={query} onChange={onChange} />
      {isPending && <Spinner size="sm" />}
      <div style={{ opacity: isPending ? 0.6 : 1 }}>
        <ProductGrid products={filtered} />
      </div>
    </>
  );
}
```

### Long-task chunking without React

```jsx
// Yield to the browser during heavy synchronous work
async function processLargeDataset(items, onProgress) {
  const results = [];
  for (let i = 0; i < items.length; i++) {
    results.push(expensiveTransform(items[i]));
    if (i % 100 === 0) {
      onProgress(i / items.length);
      await new Promise(r => setTimeout(r, 0));   // let the browser paint & handle input
    }
  }
  return results;
}

// Or move it off the main thread entirely
const worker = new Worker(new URL('./heavy.worker.js', import.meta.url), { type: 'module' });
```

**Interview Tip:** Connect this to **INP** (Interaction to Next Paint), which replaced FID as a Core Web Vital in March 2024. Long tasks blocking the main thread are exactly what INP measures.

---

# Profiling & Measurement

## How do you profile and measure React performance?

### Answer

```jsx
// 1. React DevTools Profiler
//    - Record an interaction, inspect the flame graph
//    - "Ranked" view shows the most expensive components
//    - "Why did this render?" (enable in settings) gives the exact cause

// 2. The <Profiler> API for automated measurement
<Profiler id="Checkout" onRender={(id, phase, actualDuration) => {
  analytics.track('render', { id, phase, actualDuration });
}}>

// 3. Web Vitals in production
import { onCLS, onINP, onLCP, onFCP, onTTFB } from 'web-vitals';

onCLS(sendToAnalytics);
onINP(sendToAnalytics);
onLCP(sendToAnalytics);

// 4. User Timing API for custom marks
performance.mark('checkout-start');
// … work …
performance.mark('checkout-end');
performance.measure('checkout', 'checkout-start', 'checkout-end');

// 5. Long task observer
new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    if (entry.duration > 50) console.warn('Long task:', entry.duration);
  }
}).observe({ entryTypes: ['longtask'] });
```

### Core Web Vitals targets

| Metric | Good | Needs improvement | Poor |
|---|---|---|---|
| **LCP** (Largest Contentful Paint) | ≤ 2.5s | ≤ 4.0s | > 4.0s |
| **INP** (Interaction to Next Paint) | ≤ 200ms | ≤ 500ms | > 500ms |
| **CLS** (Cumulative Layout Shift) | ≤ 0.1 | ≤ 0.25 | > 0.25 |
| **FCP** | ≤ 1.8s | ≤ 3.0s | > 3.0s |
| **TTFB** | ≤ 0.8s | ≤ 1.8s | > 1.8s |

**Interview Tip:** Know that INP replaced FID in March 2024, and why: FID measured only the *delay before* the first handler ran, which most sites passed trivially. INP measures the full interaction to the next paint — a far more honest number.

---

# Bundle Optimisation

## How do you reduce React bundle size?

### Answer

```bash
# 1. Analyse first — never guess
npx vite-bundle-visualizer
# or for webpack:
npm i -D webpack-bundle-analyzer
# Next.js:
ANALYZE=true npm run build
```

```jsx
// 2. Import only what you need — enable tree shaking
import debounce from 'lodash/debounce';        // ✅ ~2kB
import { debounce } from 'lodash';             // ❌ may pull the whole library
import { debounce } from 'lodash-es';          // ✅ ESM, tree-shakeable

// 3. Replace heavy dependencies
// moment (~70kB) → date-fns (tree-shakeable) or native Intl / Temporal
// lodash → native methods or lodash-es
// axios (~15kB) → native fetch with a small wrapper

// 4. Dynamic import for anything used conditionally
const onExport = async () => {
  const { utils, writeFile } = await import('xlsx');
};

// 5. Externalise/CDN only if genuinely shared across apps
```

### Build-level wins

```js
// vite.config.js
export default {
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'ui-vendor': ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu'],
        },
      },
    },
    target: 'es2020',       // less transpilation, smaller output
    cssCodeSplit: true,
    sourcemap: false,       // don't ship source maps to production
  },
};
```

### Server-side
- **Brotli** compression (~15–20% smaller than gzip)
- Long `Cache-Control` on hashed assets: `max-age=31536000, immutable`
- HTTP/2 or HTTP/3
- CDN with edge caching

**Interview Tip:** Quantify with real numbers: "moment.js with locales is ~70kB gzipped; swapping to date-fns imports cut our bundle by 60kB, which is roughly 0.5s on a 3G connection." Concrete numbers beat generic advice.

---

# Performance Checklist

### Rendering
- [ ] Profiled before optimising (DevTools Profiler)
- [ ] State placed as locally as possible
- [ ] Expensive subtrees passed as `children`, not re-created
- [ ] `React.memo` only on expensive, frequently-rendered components
- [ ] `useMemo`/`useCallback` only where they enable memo or feed a dep array
- [ ] Context split by change frequency, values memoized
- [ ] Stable, unique keys (never index on reorderable lists, never `Math.random()`)

### Loading
- [ ] Route-based code splitting
- [ ] Heavy libraries dynamically imported
- [ ] Preload on hover/focus for likely navigations
- [ ] Bundle analysed; no accidental heavy dependencies
- [ ] Images: correct format, sized, `width`/`height` set, lazy below the fold
- [ ] Fonts: `font-display: swap`, preloaded, subset

### Runtime
- [ ] Long lists virtualized (> ~200 rows)
- [ ] Expensive filters in `useTransition`/`useDeferredValue`
- [ ] Heavy computation in a Web Worker
- [ ] Scroll/resize handlers throttled; `passive: true` listeners
- [ ] No layout thrashing (batch reads, then writes)

### Data
- [ ] Server state cached (TanStack Query / SWR), not refetched per mount
- [ ] Requests deduplicated
- [ ] Pagination or infinite scroll instead of loading everything
- [ ] Optimistic updates for perceived speed

### Measurement
- [ ] Core Web Vitals tracked in production (LCP, INP, CLS)
- [ ] Bundle size budget enforced in CI
- [ ] Lighthouse CI on pull requests

---

## 📌 Interview Answers to Have Ready

**"How would you speed up a slow React page?"**
1. Profile it — find whether the cost is in load (bundle/network) or runtime (renders).
2. If load: analyse the bundle, code split routes, optimise images and fonts.
3. If runtime: find wasted renders in the Profiler, move state down or pass children, memoize the genuinely expensive components.
4. If it's a long list: virtualize.
5. If it's an expensive computation: `useMemo`, `useTransition`, or a Web Worker.
6. Measure again and confirm the improvement with numbers.

**"A form gets slower as the user types. Why?"**
Every keystroke updates state at a high level, re-rendering the whole form subtree. Fix by isolating each field's state, using an uncontrolled library like react-hook-form, or memoizing field components.

**"Users complain the page 'jumps' while loading."**
CLS. Set explicit dimensions on images/ads/embeds, reserve space with skeletons, use `font-display: optional` or size-adjusted fallbacks, and never insert content above existing content.
