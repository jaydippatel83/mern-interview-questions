/**
 * ============================================================
 *  REACT CODING QUESTIONS — Machine Coding Round
 * ============================================================
 *  The components you are most likely to be asked to build
 *  live in a 45–60 minute interview.
 *
 *  Each one is self-contained and copy-pasteable.
 * ============================================================
 */

import React, {
  useState, useEffect, useRef, useMemo, useCallback,
  useReducer, useContext, createContext, memo,
} from 'react';

/* ==================================================================
 *  1. COUNTER — the warm-up. Show you know functional updates.
 * ================================================================== */
export function Counter({ initial = 0, step = 1, min = -Infinity, max = Infinity }) {
  const [count, setCount] = useState(initial);

  const increment = () => setCount((c) => Math.min(c + step, max));
  const decrement = () => setCount((c) => Math.max(c - step, min));
  const reset = () => setCount(initial);

  return (
    <div>
      <button onClick={decrement} disabled={count <= min} aria-label="Decrement">−</button>
      <output aria-live="polite">{count}</output>
      <button onClick={increment} disabled={count >= max} aria-label="Increment">+</button>
      <button onClick={reset}>Reset</button>
    </div>
  );
}

/* ==================================================================
 *  2. TODO LIST — CRUD, filtering, immutable updates
 * ================================================================== */
export function TodoApp() {
  const [todos, setTodos] = useState([]);
  const [input, setInput] = useState('');
  const [filter, setFilter] = useState('all'); // all | active | completed

  const addTodo = (e) => {
    e.preventDefault();
    const text = input.trim();
    if (!text) return;
    setTodos((prev) => [...prev, { id: crypto.randomUUID(), text, done: false }]);
    setInput('');
  };

  const toggleTodo = useCallback((id) => {
    setTodos((prev) => prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));
  }, []);

  const deleteTodo = useCallback((id) => {
    setTodos((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const editTodo = useCallback((id, text) => {
    setTodos((prev) => prev.map((t) => (t.id === id ? { ...t, text } : t)));
  }, []);

  // Derived state — never store this in useState
  const visible = useMemo(() => {
    if (filter === 'active') return todos.filter((t) => !t.done);
    if (filter === 'completed') return todos.filter((t) => t.done);
    return todos;
  }, [todos, filter]);

  const remaining = todos.filter((t) => !t.done).length;

  return (
    <div>
      <form onSubmit={addTodo}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="What needs doing?"
          aria-label="New todo"
        />
        <button type="submit">Add</button>
      </form>

      <div role="group" aria-label="Filter todos">
        {['all', 'active', 'completed'].map((f) => (
          <button key={f} onClick={() => setFilter(f)} aria-pressed={filter === f}>
            {f}
          </button>
        ))}
      </div>

      <ul>
        {visible.map((todo) => (
          <TodoItem
            key={todo.id}              // stable id, NOT the index
            todo={todo}
            onToggle={toggleTodo}
            onDelete={deleteTodo}
            onEdit={editTodo}
          />
        ))}
      </ul>

      <p>{remaining} item{remaining !== 1 && 's'} left</p>
    </div>
  );
}

const TodoItem = memo(function TodoItem({ todo, onToggle, onDelete, onEdit }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(todo.text);

  const save = () => {
    const text = draft.trim();
    if (text) onEdit(todo.id, text);
    else setDraft(todo.text);
    setEditing(false);
  };

  return (
    <li>
      <input type="checkbox" checked={todo.done} onChange={() => onToggle(todo.id)} />
      {editing ? (
        <input
          value={draft}
          autoFocus
          onChange={(e) => setDraft(e.target.value)}
          onBlur={save}
          onKeyDown={(e) => {
            if (e.key === 'Enter') save();
            if (e.key === 'Escape') { setDraft(todo.text); setEditing(false); }
          }}
        />
      ) : (
        <span
          onDoubleClick={() => setEditing(true)}
          style={{ textDecoration: todo.done ? 'line-through' : 'none' }}
        >
          {todo.text}
        </span>
      )}
      <button onClick={() => onDelete(todo.id)} aria-label={`Delete ${todo.text}`}>×</button>
    </li>
  );
});

/* ==================================================================
 *  3. DEBOUNCED SEARCH — the single most-asked React coding question
 * ================================================================== */
function useDebounce(value, delay = 400) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

export function SearchAutocomplete() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [highlighted, setHighlighted] = useState(-1);
  const [open, setOpen] = useState(false);

  const debouncedQuery = useDebounce(query, 400);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!debouncedQuery.trim()) {
      setResults([]);
      return;
    }

    const controller = new AbortController();   // ← cancels the stale request
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const res = await fetch(
          `/api/search?q=${encodeURIComponent(debouncedQuery)}`,
          { signal: controller.signal }
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setResults(data);
        setOpen(true);
      } catch (err) {
        if (err.name !== 'AbortError') setError(err.message);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();

    return () => controller.abort();
  }, [debouncedQuery]);

  // Close on outside click
  useEffect(() => {
    const onClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlighted((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlighted((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && highlighted >= 0) {
      select(results[highlighted]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  const select = (item) => {
    setQuery(item.name);
    setOpen(false);
    setHighlighted(-1);
  };

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <input
        value={query}
        onChange={(e) => { setQuery(e.target.value); setHighlighted(-1); }}
        onKeyDown={onKeyDown}
        role="combobox"
        aria-expanded={open}
        aria-controls="search-listbox"
        aria-activedescendant={highlighted >= 0 ? `option-${highlighted}` : undefined}
        aria-autocomplete="list"
        placeholder="Search…"
      />

      {loading && <span role="status">Loading…</span>}
      {error && <span role="alert">{error}</span>}

      {open && results.length > 0 && (
        <ul id="search-listbox" role="listbox">
          {results.map((item, i) => (
            <li
              key={item.id}
              id={`option-${i}`}
              role="option"
              aria-selected={i === highlighted}
              onMouseEnter={() => setHighlighted(i)}
              onClick={() => select(item)}
              style={{ background: i === highlighted ? '#eef' : 'transparent' }}
            >
              {item.name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ==================================================================
 *  4. MODAL WITH PORTAL — focus trap, Escape, scroll lock
 * ================================================================== */
import { createPortal } from 'react-dom';

export function Modal({ isOpen, onClose, title, children }) {
  const dialogRef = useRef(null);
  const previouslyFocused = useRef(null);

  useEffect(() => {
    if (!isOpen) return;

    previouslyFocused.current = document.activeElement;
    document.body.style.overflow = 'hidden';

    const onKeyDown = (e) => {
      if (e.key === 'Escape') return onClose();
      if (e.key !== 'Tab') return;

      // Focus trap
      const focusable = dialogRef.current?.querySelectorAll(
        'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
      );
      if (!focusable?.length) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    dialogRef.current?.focus();

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = '';
      previouslyFocused.current?.focus();      // restore focus on close
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div
      className="overlay"
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgb(0 0 0 / .5)' }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="modal-title">{title}</h2>
        {children}
        <button onClick={onClose}>Close</button>
      </div>
    </div>,
    document.body
  );
}

/* ==================================================================
 *  5. ACCORDION — single or multiple open, keyboard accessible
 * ================================================================== */
export function Accordion({ items, allowMultiple = false }) {
  const [openIds, setOpenIds] = useState(new Set());

  const toggle = (id) => {
    setOpenIds((prev) => {
      const next = new Set(allowMultiple ? prev : []);
      if (prev.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div>
      {items.map((item) => {
        const isOpen = openIds.has(item.id);
        return (
          <div key={item.id}>
            <h3>
              <button
                onClick={() => toggle(item.id)}
                aria-expanded={isOpen}
                aria-controls={`panel-${item.id}`}
                id={`header-${item.id}`}
              >
                {item.title}
                <span aria-hidden="true">{isOpen ? '−' : '+'}</span>
              </button>
            </h3>
            <div
              id={`panel-${item.id}`}
              role="region"
              aria-labelledby={`header-${item.id}`}
              hidden={!isOpen}
            >
              {item.content}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ==================================================================
 *  6. TABS — compound component pattern with Context
 * ================================================================== */
const TabsContext = createContext(null);

export function Tabs({ defaultTab, children }) {
  const [active, setActive] = useState(defaultTab);
  const value = useMemo(() => ({ active, setActive }), [active]);
  return <TabsContext.Provider value={value}>{children}</TabsContext.Provider>;
}

function useTabs() {
  const ctx = useContext(TabsContext);
  if (!ctx) throw new Error('Tabs components must be used inside <Tabs>');
  return ctx;
}

Tabs.List = function TabList({ children }) {
  const onKeyDown = (e) => {
    const tabs = [...e.currentTarget.querySelectorAll('[role="tab"]')];
    const index = tabs.indexOf(document.activeElement);
    let next = index;
    if (e.key === 'ArrowRight') next = (index + 1) % tabs.length;
    else if (e.key === 'ArrowLeft') next = (index - 1 + tabs.length) % tabs.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = tabs.length - 1;
    else return;
    e.preventDefault();
    tabs[next].focus();
    tabs[next].click();
  };

  return <div role="tablist" onKeyDown={onKeyDown}>{children}</div>;
};

Tabs.Tab = function Tab({ id, children }) {
  const { active, setActive } = useTabs();
  const selected = active === id;
  return (
    <button
      role="tab"
      id={`tab-${id}`}
      aria-selected={selected}
      aria-controls={`panel-${id}`}
      tabIndex={selected ? 0 : -1}          // roving tabindex
      onClick={() => setActive(id)}
    >
      {children}
    </button>
  );
};

Tabs.Panel = function TabPanel({ id, children }) {
  const { active } = useTabs();
  if (active !== id) return null;
  return (
    <div role="tabpanel" id={`panel-${id}`} aria-labelledby={`tab-${id}`} tabIndex={0}>
      {children}
    </div>
  );
};

/* ==================================================================
 *  7. INFINITE SCROLL — IntersectionObserver
 * ================================================================== */
export function InfiniteList({ fetchPage }) {
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const sentinelRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    fetchPage(page)
      .then((data) => {
        if (cancelled) return;
        setItems((prev) => [...prev, ...data.items]);
        setHasMore(data.hasMore);
      })
      .finally(() => !cancelled && setLoading(false));

    return () => { cancelled = true; };
  }, [page, fetchPage]);

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || !hasMore || loading) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setPage((p) => p + 1);
      },
      { rootMargin: '200px' }        // start loading before it's visible
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, loading]);

  return (
    <div>
      <ul>{items.map((item) => <li key={item.id}>{item.name}</li>)}</ul>
      {loading && <p role="status">Loading…</p>}
      {hasMore && <div ref={sentinelRef} style={{ height: 1 }} />}
      {!hasMore && <p>No more items</p>}
    </div>
  );
}

/* ==================================================================
 *  8. STAR RATING — hover preview, keyboard support
 * ================================================================== */
export function StarRating({ value = 0, max = 5, onChange, readOnly = false }) {
  const [hovered, setHovered] = useState(0);
  const display = hovered || value;

  return (
    <div
      role={readOnly ? 'img' : 'radiogroup'}
      aria-label={`Rating: ${value} out of ${max}`}
      onMouseLeave={() => setHovered(0)}
    >
      {Array.from({ length: max }, (_, i) => i + 1).map((star) => (
        <button
          key={star}
          type="button"
          disabled={readOnly}
          role={readOnly ? undefined : 'radio'}
          aria-checked={value === star}
          aria-label={`${star} star${star > 1 ? 's' : ''}`}
          onMouseEnter={() => !readOnly && setHovered(star)}
          onClick={() => !readOnly && onChange?.(star)}
          style={{ color: star <= display ? 'gold' : '#ccc', fontSize: 24 }}
        >
          ★
        </button>
      ))}
    </div>
  );
}

/* ==================================================================
 *  9. PAGINATION COMPONENT
 * ================================================================== */
export function Pagination({ currentPage, totalPages, onPageChange, maxVisible = 5 }) {
  const pages = useMemo(() => {
    if (totalPages <= maxVisible) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    const half = Math.floor(maxVisible / 2);
    let start = Math.max(1, currentPage - half);
    const end = Math.min(totalPages, start + maxVisible - 1);
    start = Math.max(1, end - maxVisible + 1);

    const range = Array.from({ length: end - start + 1 }, (_, i) => start + i);
    if (start > 1) range.unshift(1, '…');
    if (end < totalPages) range.push('…', totalPages);
    return range;
  }, [currentPage, totalPages, maxVisible]);

  return (
    <nav aria-label="Pagination">
      <button onClick={() => onPageChange(currentPage - 1)} disabled={currentPage === 1}>
        Previous
      </button>

      {pages.map((p, i) =>
        p === '…' ? (
          <span key={`gap-${i}`} aria-hidden="true">…</span>
        ) : (
          <button
            key={p}
            onClick={() => onPageChange(p)}
            aria-current={p === currentPage ? 'page' : undefined}
          >
            {p}
          </button>
        )
      )}

      <button onClick={() => onPageChange(currentPage + 1)} disabled={currentPage === totalPages}>
        Next
      </button>
    </nav>
  );
}

/* ==================================================================
 *  10. STOPWATCH / TIMER — interval cleanup, no stale closures
 * ================================================================== */
export function Stopwatch() {
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);
  const [laps, setLaps] = useState([]);
  const startRef = useRef(0);
  const rafRef = useRef(null);

  useEffect(() => {
    if (!running) return;

    startRef.current = performance.now() - elapsed;

    const tick = () => {
      setElapsed(performance.now() - startRef.current);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(rafRef.current);
  }, [running]);   // `elapsed` intentionally excluded — read via ref on start

  const format = (ms) => {
    const totalSeconds = Math.floor(ms / 1000);
    const m = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
    const s = String(totalSeconds % 60).padStart(2, '0');
    const cs = String(Math.floor((ms % 1000) / 10)).padStart(2, '0');
    return `${m}:${s}.${cs}`;
  };

  return (
    <div>
      <output aria-live="off" style={{ fontVariantNumeric: 'tabular-nums', fontSize: 32 }}>
        {format(elapsed)}
      </output>
      <button onClick={() => setRunning((r) => !r)}>{running ? 'Pause' : 'Start'}</button>
      <button onClick={() => setLaps((l) => [...l, elapsed])} disabled={!running}>Lap</button>
      <button onClick={() => { setRunning(false); setElapsed(0); setLaps([]); }}>Reset</button>
      <ol>{laps.map((lap, i) => <li key={i}>{format(lap)}</li>)}</ol>
    </div>
  );
}

/* ==================================================================
 *  11. SHOPPING CART — useReducer, derived totals
 * ================================================================== */
function cartReducer(state, action) {
  switch (action.type) {
    case 'ADD': {
      const existing = state.items.find((i) => i.id === action.item.id);
      return {
        ...state,
        items: existing
          ? state.items.map((i) =>
              i.id === action.item.id ? { ...i, qty: i.qty + 1 } : i
            )
          : [...state.items, { ...action.item, qty: 1 }],
      };
    }
    case 'REMOVE':
      return { ...state, items: state.items.filter((i) => i.id !== action.id) };
    case 'SET_QTY':
      return {
        ...state,
        items: action.qty <= 0
          ? state.items.filter((i) => i.id !== action.id)
          : state.items.map((i) => (i.id === action.id ? { ...i, qty: action.qty } : i)),
      };
    case 'APPLY_COUPON':
      return { ...state, coupon: action.code };
    case 'CLEAR':
      return { items: [], coupon: null };
    default:
      throw new Error(`Unknown action: ${action.type}`);
  }
}

export function ShoppingCart({ products }) {
  const [state, dispatch] = useReducer(cartReducer, { items: [], coupon: null });

  const totals = useMemo(() => {
    const discounts = { SAVE10: 0.1, SAVE20: 0.2 };
    const subtotal = state.items.reduce((s, i) => s + i.price * i.qty, 0);
    const discount = subtotal * (discounts[state.coupon] ?? 0);
    const tax = (subtotal - discount) * 0.18;
    return {
      subtotal,
      discount,
      tax,
      total: subtotal - discount + tax,
      count: state.items.reduce((s, i) => s + i.qty, 0),
    };
  }, [state.items, state.coupon]);

  return (
    <div>
      <ul>
        {products.map((p) => (
          <li key={p.id}>
            {p.name} — ₹{p.price}
            <button onClick={() => dispatch({ type: 'ADD', item: p })}>Add</button>
          </li>
        ))}
      </ul>

      <h3>Cart ({totals.count})</h3>
      <ul>
        {state.items.map((item) => (
          <li key={item.id}>
            {item.name}
            <input
              type="number"
              min="0"
              value={item.qty}
              onChange={(e) =>
                dispatch({ type: 'SET_QTY', id: item.id, qty: Number(e.target.value) })
              }
            />
            ₹{(item.price * item.qty).toFixed(2)}
            <button onClick={() => dispatch({ type: 'REMOVE', id: item.id })}>×</button>
          </li>
        ))}
      </ul>

      <dl>
        <dt>Subtotal</dt><dd>₹{totals.subtotal.toFixed(2)}</dd>
        <dt>Discount</dt><dd>−₹{totals.discount.toFixed(2)}</dd>
        <dt>Tax (18%)</dt><dd>₹{totals.tax.toFixed(2)}</dd>
        <dt><strong>Total</strong></dt><dd><strong>₹{totals.total.toFixed(2)}</strong></dd>
      </dl>
    </div>
  );
}

/* ==================================================================
 *  12. MULTI-STEP FORM WIZARD
 * ================================================================== */
export function FormWizard({ steps, onComplete }) {
  const [step, setStep] = useState(0);
  const [data, setData] = useState({});
  const [errors, setErrors] = useState({});

  const current = steps[step];
  const isLast = step === steps.length - 1;

  const updateField = (name, value) => {
    setData((d) => ({ ...d, [name]: value }));
    setErrors((e) => ({ ...e, [name]: undefined }));  // clear the error as they type
  };

  const next = () => {
    const stepErrors = current.validate?.(data) ?? {};
    if (Object.keys(stepErrors).length) return setErrors(stepErrors);
    if (isLast) onComplete(data);
    else setStep((s) => s + 1);
  };

  return (
    <div>
      <ol aria-label="Progress">
        {steps.map((s, i) => (
          <li key={s.id} aria-current={i === step ? 'step' : undefined}>
            {i < step ? '✓' : i + 1}. {s.title}
          </li>
        ))}
      </ol>

      <h2>{current.title}</h2>

      {current.fields.map((field) => (
        <div key={field.name}>
          <label htmlFor={field.name}>{field.label}</label>
          <input
            id={field.name}
            type={field.type ?? 'text'}
            value={data[field.name] ?? ''}
            onChange={(e) => updateField(field.name, e.target.value)}
            aria-invalid={!!errors[field.name]}
            aria-describedby={errors[field.name] ? `${field.name}-error` : undefined}
          />
          {errors[field.name] && (
            <span id={`${field.name}-error`} role="alert">{errors[field.name]}</span>
          )}
        </div>
      ))}

      <button onClick={() => setStep((s) => s - 1)} disabled={step === 0}>Back</button>
      <button onClick={next}>{isLast ? 'Submit' : 'Next'}</button>
    </div>
  );
}

/* ==================================================================
 *  13. DARK MODE TOGGLE — no flash, system preference aware
 * ================================================================== */
export function useTheme() {
  const [theme, setTheme] = useState(() => {
    if (typeof window === 'undefined') return 'light';
    const stored = localStorage.getItem('theme');
    if (stored) return stored;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Follow the system if the user hasn't chosen explicitly
  useEffect(() => {
    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = (e) => {
      if (!localStorage.getItem('theme')) setTheme(e.matches ? 'dark' : 'light');
    };
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);

  return [theme, () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))];
}

// Put this INLINE in <head> to avoid the flash of wrong theme:
// <script>
//   (function(){ var t = localStorage.getItem('theme') ||
//     (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
//     document.documentElement.dataset.theme = t; })();
// </script>

/* ==================================================================
 *  14. OTP INPUT — auto-advance, paste, backspace
 * ================================================================== */
export function OtpInput({ length = 6, onComplete }) {
  const [values, setValues] = useState(() => Array(length).fill(''));
  const inputsRef = useRef([]);

  const setDigit = (index, digit) => {
    const next = [...values];
    next[index] = digit;
    setValues(next);
    if (next.every(Boolean)) onComplete?.(next.join(''));
    return next;
  };

  const onChange = (index, e) => {
    const digit = e.target.value.replace(/\D/g, '').slice(-1);
    if (!digit) return;
    setDigit(index, digit);
    if (index < length - 1) inputsRef.current[index + 1]?.focus();
  };

  const onKeyDown = (index, e) => {
    if (e.key === 'Backspace') {
      e.preventDefault();
      if (values[index]) setDigit(index, '');
      else if (index > 0) {
        setDigit(index - 1, '');
        inputsRef.current[index - 1]?.focus();
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputsRef.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < length - 1) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const onPaste = (e) => {
    e.preventDefault();
    const digits = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
    const next = Array(length).fill('');
    [...digits].forEach((d, i) => (next[i] = d));
    setValues(next);
    inputsRef.current[Math.min(digits.length, length - 1)]?.focus();
    if (digits.length === length) onComplete?.(digits);
  };

  return (
    <div onPaste={onPaste} role="group" aria-label="One-time code">
      {values.map((value, i) => (
        <input
          key={i}
          ref={(el) => (inputsRef.current[i] = el)}
          value={value}
          onChange={(e) => onChange(i, e)}
          onKeyDown={(e) => onKeyDown(i, e)}
          inputMode="numeric"
          autoComplete={i === 0 ? 'one-time-code' : 'off'}
          maxLength={1}
          aria-label={`Digit ${i + 1}`}
          style={{ width: 40, textAlign: 'center', fontSize: 24 }}
        />
      ))}
    </div>
  );
}

/* ==================================================================
 *  15. ERROR BOUNDARY (class — still the only way)
 * ================================================================== */
export class ErrorBoundary extends React.Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Caught by boundary:', error, errorInfo.componentStack);
    // reportToSentry(error, errorInfo);
  }

  componentDidUpdate(prevProps) {
    // Reset when resetKeys change — e.g. navigating to a different route
    if (this.state.error && prevProps.resetKeys !== this.props.resetKeys) {
      this.setState({ error: null });
    }
  }

  render() {
    if (this.state.error) {
      const Fallback = this.props.fallback;
      return Fallback ? (
        <Fallback error={this.state.error} reset={() => this.setState({ error: null })} />
      ) : (
        <div role="alert">
          <h2>Something went wrong</h2>
          <pre>{this.state.error.message}</pre>
          <button onClick={() => this.setState({ error: null })}>Try again</button>
        </div>
      );
    }
    return this.props.children;
  }
}

/* ==================================================================
 *  16. DRAG AND DROP LIST — native HTML5 DnD
 * ================================================================== */
export function DraggableList({ initialItems }) {
  const [items, setItems] = useState(initialItems);
  const dragIndex = useRef(null);

  const onDragStart = (index) => (e) => {
    dragIndex.current = index;
    e.dataTransfer.effectAllowed = 'move';
  };

  const onDragOver = (index) => (e) => {
    e.preventDefault();
    if (dragIndex.current === null || dragIndex.current === index) return;

    setItems((prev) => {
      const next = [...prev];
      const [moved] = next.splice(dragIndex.current, 1);
      next.splice(index, 0, moved);
      dragIndex.current = index;
      return next;
    });
  };

  return (
    <ul>
      {items.map((item, i) => (
        <li
          key={item.id}
          draggable
          onDragStart={onDragStart(i)}
          onDragOver={onDragOver(i)}
          onDragEnd={() => (dragIndex.current = null)}
          style={{ cursor: 'grab', padding: 8, border: '1px solid #ddd' }}
        >
          {item.name}
        </li>
      ))}
    </ul>
  );
}

/* ==================================================================
 *  17. TIC TAC TOE — the classic React tutorial question
 * ================================================================== */
export function TicTacToe() {
  const [history, setHistory] = useState([Array(9).fill(null)]);
  const [move, setMove] = useState(0);

  const board = history[move];
  const isXNext = move % 2 === 0;

  const winner = useMemo(() => {
    const lines = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8],   // rows
      [0, 3, 6], [1, 4, 7], [2, 5, 8],   // columns
      [0, 4, 8], [2, 4, 6],              // diagonals
    ];
    for (const [a, b, c] of lines) {
      if (board[a] && board[a] === board[b] && board[a] === board[c]) {
        return { player: board[a], line: [a, b, c] };
      }
    }
    return null;
  }, [board]);

  const isDraw = !winner && board.every(Boolean);

  const play = (i) => {
    if (board[i] || winner) return;
    const next = [...board];
    next[i] = isXNext ? 'X' : 'O';
    const newHistory = [...history.slice(0, move + 1), next];
    setHistory(newHistory);
    setMove(newHistory.length - 1);
  };

  return (
    <div>
      <p role="status">
        {winner ? `Winner: ${winner.player}` : isDraw ? 'Draw!' : `Next: ${isXNext ? 'X' : 'O'}`}
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 60px)', gap: 4 }}>
        {board.map((cell, i) => (
          <button
            key={i}
            onClick={() => play(i)}
            aria-label={`Cell ${i + 1}${cell ? `, ${cell}` : ', empty'}`}
            style={{
              height: 60,
              fontSize: 24,
              background: winner?.line.includes(i) ? '#cfc' : '#fff',
            }}
          >
            {cell}
          </button>
        ))}
      </div>

      <ol>
        {history.map((_, i) => (
          <li key={i}>
            <button onClick={() => setMove(i)}>
              {i === 0 ? 'Go to start' : `Go to move #${i}`}
            </button>
          </li>
        ))}
      </ol>
    </div>
  );
}

/* ==================================================================
 *  18. IMAGE CAROUSEL — autoplay, keyboard, touch
 * ================================================================== */
export function Carousel({ images, autoPlayMs = 0 }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchStartX = useRef(0);

  const goTo = useCallback(
    (i) => setIndex(((i % images.length) + images.length) % images.length),
    [images.length]
  );
  const next = useCallback(() => goTo(index + 1), [goTo, index]);
  const prev = useCallback(() => goTo(index - 1), [goTo, index]);

  useEffect(() => {
    if (!autoPlayMs || paused) return;
    const id = setInterval(next, autoPlayMs);
    return () => clearInterval(id);
  }, [autoPlayMs, paused, next]);

  return (
    <div
      role="region"
      aria-roledescription="carousel"
      aria-label="Image gallery"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onKeyDown={(e) => {
        if (e.key === 'ArrowRight') next();
        if (e.key === 'ArrowLeft') prev();
      }}
      onTouchStart={(e) => (touchStartX.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        const diff = touchStartX.current - e.changedTouches[0].clientX;
        if (Math.abs(diff) > 50) (diff > 0 ? next : prev)();
      }}
      tabIndex={0}
    >
      <img
        src={images[index].src}
        alt={images[index].alt}
        width={800}
        height={450}
      />

      <button onClick={prev} aria-label="Previous image">‹</button>
      <button onClick={next} aria-label="Next image">›</button>

      <div role="tablist" aria-label="Choose image">
        {images.map((_, i) => (
          <button
            key={i}
            role="tab"
            aria-selected={i === index}
            aria-label={`Go to image ${i + 1}`}
            onClick={() => goTo(i)}
            style={{ opacity: i === index ? 1 : 0.4 }}
          >
            ●
          </button>
        ))}
      </div>

      <p aria-live="polite" className="sr-only">
        Image {index + 1} of {images.length}
      </p>
    </div>
  );
}

/* ==================================================================
 *  19. PROGRESS BAR / FILE UPLOAD WITH PROGRESS
 * ================================================================== */
export function FileUpload({ url }) {
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('idle');
  const xhrRef = useRef(null);

  const upload = (file) => {
    const xhr = new XMLHttpRequest();       // fetch has no upload progress
    xhrRef.current = xhr;
    const formData = new FormData();
    formData.append('file', file);

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) setProgress((e.loaded / e.total) * 100);
    });
    xhr.addEventListener('load', () =>
      setStatus(xhr.status < 400 ? 'success' : 'error')
    );
    xhr.addEventListener('error', () => setStatus('error'));
    xhr.addEventListener('abort', () => setStatus('cancelled'));

    setStatus('uploading');
    setProgress(0);
    xhr.open('POST', url);
    xhr.send(formData);
  };

  useEffect(() => () => xhrRef.current?.abort(), []);   // cancel on unmount

  return (
    <div>
      <input type="file" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
      {status === 'uploading' && (
        <>
          <progress value={progress} max="100" aria-label="Upload progress" />
          <span>{Math.round(progress)}%</span>
          <button onClick={() => xhrRef.current?.abort()}>Cancel</button>
        </>
      )}
      {status === 'success' && <p role="status">Uploaded ✓</p>}
      {status === 'error' && <p role="alert">Upload failed</p>}
    </div>
  );
}

/* ==================================================================
 *  20. TOAST / NOTIFICATION SYSTEM — Context + portal + auto-dismiss
 * ================================================================== */
const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const remove = useCallback((id) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  const notify = useCallback((message, { type = 'info', duration = 4000 } = {}) => {
    const id = crypto.randomUUID();
    setToasts((t) => [...t, { id, message, type }]);
    if (duration) setTimeout(() => remove(id), duration);
    return id;
  }, [remove]);

  const value = useMemo(() => ({ notify, remove }), [notify, remove]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {createPortal(
        <div
          aria-live="polite"
          aria-atomic="false"
          style={{ position: 'fixed', bottom: 16, right: 16, display: 'grid', gap: 8 }}
        >
          {toasts.map((toast) => (
            <div key={toast.id} role={toast.type === 'error' ? 'alert' : 'status'}>
              {toast.message}
              <button onClick={() => remove(toast.id)} aria-label="Dismiss">×</button>
            </div>
          ))}
        </div>,
        document.body
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within a ToastProvider');
  return ctx;
}

/* ==================================================================
 *  INTERVIEW NOTES
 * ==================================================================
 *
 *  What interviewers actually score in a machine-coding round:
 *
 *  1. CORRECTNESS       — does it work for the happy path and edge cases?
 *  2. STATE MODELLING   — minimal state, derived values computed not stored
 *  3. CLEANUP           — every effect that subscribes must unsubscribe
 *  4. KEYS              — stable ids, never the index on reorderable lists
 *  5. ACCESSIBILITY     — labels, roles, keyboard support (huge differentiator)
 *  6. EDGE CASES        — empty state, loading, error, rapid clicks, unmount
 *  7. COMMUNICATION     — narrate tradeoffs as you go
 *
 *  Say these out loud while coding:
 *  - "I'm using a functional update because the new state depends on the old."
 *  - "I'll abort this fetch in the cleanup to avoid a race condition."
 *  - "I'm deriving `filtered` during render instead of storing it — one source of truth."
 *  - "Let me add keyboard navigation; a real user might not have a mouse."
 *  - "In production I'd use TanStack Query here for caching and dedupe."
 */
