/**
 * ============================================================
 *  OBJECT PROGRAMS — JavaScript Interview Coding Questions
 * ============================================================
 *  Run:  node object-programs.js
 * ============================================================
 */

/* ------------------------------------------------------------------
 * 1. Deep clone — handles cycles, Date, Map, Set, RegExp, prototypes
 * ---------------------------------------------------------------- */
function deepClone(value, seen = new WeakMap()) {
  if (value === null || typeof value !== 'object') return value;
  if (seen.has(value)) return seen.get(value); // circular reference

  if (value instanceof Date) return new Date(value.getTime());
  if (value instanceof RegExp) return new RegExp(value.source, value.flags);

  if (value instanceof Map) {
    const out = new Map();
    seen.set(value, out);
    for (const [k, v] of value) out.set(deepClone(k, seen), deepClone(v, seen));
    return out;
  }
  if (value instanceof Set) {
    const out = new Set();
    seen.set(value, out);
    for (const v of value) out.add(deepClone(v, seen));
    return out;
  }

  const out = Array.isArray(value) ? [] : Object.create(Object.getPrototypeOf(value));
  seen.set(value, out);
  for (const key of Reflect.ownKeys(value)) out[key] = deepClone(value[key], seen);
  return out;
}

// Native alternative (2022+): structuredClone(obj)
// ❌ cannot clone functions, DOM nodes, or class prototypes

/* ------------------------------------------------------------------
 * 2. Deep merge two objects
 * ---------------------------------------------------------------- */
const isPlainObject = (v) =>
  v !== null && typeof v === 'object' && !Array.isArray(v) && !(v instanceof Date);

function deepMerge(target, ...sources) {
  for (const source of sources) {
    for (const key of Object.keys(source ?? {})) {
      if (isPlainObject(source[key]) && isPlainObject(target[key])) {
        target[key] = deepMerge({ ...target[key] }, source[key]);
      } else {
        target[key] = source[key];
      }
    }
  }
  return target;
}
// deepMerge({a:{b:1}}, {a:{c:2}}) → {a:{b:1,c:2}}
// Note: { ...a, ...b } only merges the TOP level

/* ------------------------------------------------------------------
 * 3. Deep equality check
 * ---------------------------------------------------------------- */
function deepEqual(a, b) {
  if (Object.is(a, b)) return true; // handles NaN, +0/-0
  if (typeof a !== 'object' || typeof b !== 'object' || !a || !b) return false;
  if (Object.getPrototypeOf(a) !== Object.getPrototypeOf(b)) return false;

  if (a instanceof Date) return a.getTime() === b.getTime();
  if (a instanceof RegExp) return a.source === b.source && a.flags === b.flags;

  if (Array.isArray(a)) {
    return a.length === b.length && a.every((v, i) => deepEqual(v, b[i]));
  }

  const ka = Reflect.ownKeys(a);
  const kb = Reflect.ownKeys(b);
  if (ka.length !== kb.length) return false;
  return ka.every((k) => Object.hasOwn(b, k) && deepEqual(a[k], b[k]));
}

/* ------------------------------------------------------------------
 * 4. Flatten a nested object into dot notation
 * ---------------------------------------------------------------- */
function flattenObject(obj, prefix = '', out = {}) {
  for (const [key, value] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (isPlainObject(value) && Object.keys(value).length) {
      flattenObject(value, path, out);
    } else {
      out[path] = value;
    }
  }
  return out;
}
// flattenObject({a:{b:{c:1}}, d:2}) → { 'a.b.c': 1, d: 2 }

function unflattenObject(flat) {
  const out = {};
  for (const [path, value] of Object.entries(flat)) {
    path.split('.').reduce((acc, key, i, arr) => {
      if (i === arr.length - 1) acc[key] = value;
      else acc[key] ??= {};
      return acc[key];
    }, out);
  }
  return out;
}

/* ------------------------------------------------------------------
 * 5. get / set / has by path (lodash-style)
 * ---------------------------------------------------------------- */
function get(obj, path, defaultValue) {
  const keys = Array.isArray(path) ? path : path.replace(/\[(\d+)]/g, '.$1').split('.');
  const result = keys.reduce((acc, key) => (acc == null ? undefined : acc[key]), obj);
  return result === undefined ? defaultValue : result;
}
// get(data, 'user.addresses[0].city', 'N/A')

function set(obj, path, value) {
  const keys = Array.isArray(path) ? path : path.replace(/\[(\d+)]/g, '.$1').split('.');
  keys.reduce((acc, key, i) => {
    if (i === keys.length - 1) {
      acc[key] = value;
    } else {
      // create an array if the next key is numeric
      acc[key] ??= /^\d+$/.test(keys[i + 1]) ? [] : {};
    }
    return acc[key];
  }, obj);
  return obj;
}

const hasPath = (obj, path) => get(obj, path, Symbol.for('miss')) !== Symbol.for('miss');

/* ------------------------------------------------------------------
 * 6. pick / omit
 * ---------------------------------------------------------------- */
const pick = (obj, keys) =>
  Object.fromEntries(keys.filter((k) => k in obj).map((k) => [k, obj[k]]));

const omit = (obj, keys) =>
  Object.fromEntries(Object.entries(obj).filter(([k]) => !keys.includes(k)));

// Alternative with rest destructuring
const { password, ...safeUser } = { id: 1, name: 'A', password: 'secret' };

/* ------------------------------------------------------------------
 * 7. Map / filter over object values and keys
 * ---------------------------------------------------------------- */
const mapValues = (obj, fn) =>
  Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, fn(v, k)]));

const mapKeys = (obj, fn) =>
  Object.fromEntries(Object.entries(obj).map(([k, v]) => [fn(k, v), v]));

const filterObject = (obj, fn) =>
  Object.fromEntries(Object.entries(obj).filter(([k, v]) => fn(v, k)));

const invert = (obj) =>
  Object.fromEntries(Object.entries(obj).map(([k, v]) => [v, k]));

/* ------------------------------------------------------------------
 * 8. Remove null / undefined / empty values
 * ---------------------------------------------------------------- */
const compact = (obj) =>
  Object.fromEntries(Object.entries(obj).filter(([, v]) => v != null && v !== ''));

function deepCompact(obj) {
  if (Array.isArray(obj)) return obj.map(deepCompact).filter((v) => v != null);
  if (!isPlainObject(obj)) return obj;
  return Object.fromEntries(
    Object.entries(obj)
      .map(([k, v]) => [k, deepCompact(v)])
      .filter(([, v]) => v != null && v !== '' && !(isPlainObject(v) && !Object.keys(v).length))
  );
}

/* ------------------------------------------------------------------
 * 9. Check if an object is empty
 * ---------------------------------------------------------------- */
const isEmpty = (obj) => {
  if (obj == null) return true;
  if (Array.isArray(obj) || typeof obj === 'string') return obj.length === 0;
  if (obj instanceof Map || obj instanceof Set) return obj.size === 0;
  return Object.keys(obj).length === 0;
};

/* ------------------------------------------------------------------
 * 10. Freeze deeply (true immutability)
 * ---------------------------------------------------------------- */
function deepFreeze(obj) {
  for (const key of Object.getOwnPropertyNames(obj)) {
    const value = obj[key];
    if (value && typeof value === 'object' && !Object.isFrozen(value)) deepFreeze(value);
  }
  return Object.freeze(obj);
}

/* ------------------------------------------------------------------
 * 11. Count keys deeply / find all paths
 * ---------------------------------------------------------------- */
function countKeysDeep(obj) {
  return Object.entries(obj).reduce(
    (count, [, v]) => count + 1 + (isPlainObject(v) ? countKeysDeep(v) : 0),
    0
  );
}

function allPaths(obj, prefix = '') {
  return Object.entries(obj).flatMap(([k, v]) => {
    const path = prefix ? `${prefix}.${k}` : k;
    return isPlainObject(v) ? allPaths(v, path) : [path];
  });
}

/* ------------------------------------------------------------------
 * 12. Diff two objects
 * ---------------------------------------------------------------- */
function diff(a, b) {
  const changes = {};
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const key of keys) {
    if (!deepEqual(a[key], b[key])) {
      changes[key] = { from: a[key], to: b[key] };
    }
  }
  return changes;
}
// diff({a:1,b:2}, {a:1,b:3,c:4})
// → { b: {from:2,to:3}, c: {from:undefined,to:4} }

/* ------------------------------------------------------------------
 * 13. Convert an object to/from a query string
 * ---------------------------------------------------------------- */
const toQueryString = (obj) =>
  new URLSearchParams(
    Object.entries(obj).filter(([, v]) => v != null && v !== '')
  ).toString();

const fromQueryString = (qs) => Object.fromEntries(new URLSearchParams(qs));

// Nested version (arrays → repeated keys)
function toQueryStringDeep(obj, prefix = '') {
  const parts = [];
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}[${k}]` : k;
    if (v == null) continue;
    if (isPlainObject(v)) parts.push(toQueryStringDeep(v, key));
    else if (Array.isArray(v)) v.forEach((x) => parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(x)}`));
    else parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(v)}`);
  }
  return parts.filter(Boolean).join('&');
}

/* ------------------------------------------------------------------
 * 14. Group an array of objects and aggregate
 * ---------------------------------------------------------------- */
const groupBy = (arr, keyFn) => {
  const fn = typeof keyFn === 'function' ? keyFn : (o) => o[keyFn];
  return arr.reduce((acc, item) => ((acc[fn(item)] ||= []).push(item), acc), {});
};

const sumBy = (arr, keyFn) => {
  const fn = typeof keyFn === 'function' ? keyFn : (o) => o[keyFn];
  return arr.reduce((total, item) => total + (fn(item) || 0), 0);
};

const keyBy = (arr, key) => Object.fromEntries(arr.map((o) => [o[key], o]));
// keyBy([{id:'a'},{id:'b'}], 'id') → { a: {...}, b: {...} }

/* ------------------------------------------------------------------
 * 15. Object → array and array → object
 * ---------------------------------------------------------------- */
const objectToArray = (obj) => Object.entries(obj).map(([key, value]) => ({ key, value }));
const arrayToObject = (arr, keyProp = 'key', valueProp = 'value') =>
  Object.fromEntries(arr.map((o) => [o[keyProp], o[valueProp]]));

/* ------------------------------------------------------------------
 * 16. Rename object keys via a map
 * ---------------------------------------------------------------- */
const renameKeys = (obj, keyMap) =>
  Object.fromEntries(Object.entries(obj).map(([k, v]) => [keyMap[k] ?? k, v]));
// renameKeys({first_name:'A'}, {first_name:'firstName'}) → { firstName: 'A' }

// Recursively convert snake_case API responses to camelCase
function camelizeKeys(input) {
  if (Array.isArray(input)) return input.map(camelizeKeys);
  if (!isPlainObject(input)) return input;
  return Object.fromEntries(
    Object.entries(input).map(([k, v]) => [
      k.replace(/_([a-z])/g, (_, ch) => ch.toUpperCase()),
      camelizeKeys(v),
    ])
  );
}

/* ------------------------------------------------------------------
 * 17. Sort object by keys or values
 * ---------------------------------------------------------------- */
const sortByKeys = (obj) =>
  Object.fromEntries(Object.entries(obj).sort(([a], [b]) => a.localeCompare(b)));

const sortByValues = (obj, desc = false) =>
  Object.fromEntries(
    Object.entries(obj).sort(([, a], [, b]) => (desc ? b - a : a - b))
  );

/* ------------------------------------------------------------------
 * 18. Memoize a function on object arguments
 * ---------------------------------------------------------------- */
function memoize(fn, keyFn = (...args) => JSON.stringify(args)) {
  const cache = new Map();
  const memoized = (...args) => {
    const key = keyFn(...args);
    if (cache.has(key)) return cache.get(key);
    const result = fn(...args);
    cache.set(key, result);
    return result;
  };
  memoized.clear = () => cache.clear();
  memoized.cache = cache;
  return memoized;
}

// WeakMap version — for single-object arguments, GC-friendly
function memoizeObject(fn) {
  const cache = new WeakMap();
  return (obj) => {
    if (cache.has(obj)) return cache.get(obj);
    const result = fn(obj);
    cache.set(obj, result);
    return result;
  };
}

/* ------------------------------------------------------------------
 * 19. Create an immutable, observable store (mini-Redux)
 * ---------------------------------------------------------------- */
function createStore(reducer, initialState) {
  let state = initialState;
  const listeners = new Set();
  return {
    getState: () => state,
    dispatch(action) {
      state = reducer(state, action);
      listeners.forEach((fn) => fn(state));
      return action;
    },
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn); // unsubscribe
    },
  };
}

/* ------------------------------------------------------------------
 * 20. Reactive object with Proxy (mini-Vue)
 * ---------------------------------------------------------------- */
function reactive(target, onChange) {
  return new Proxy(target, {
    get(obj, prop, receiver) {
      const value = Reflect.get(obj, prop, receiver);
      // deep reactivity
      return isPlainObject(value) ? reactive(value, onChange) : value;
    },
    set(obj, prop, value, receiver) {
      const old = obj[prop];
      const ok = Reflect.set(obj, prop, value, receiver);
      if (ok && old !== value) onChange(prop, old, value);
      return ok;
    },
    deleteProperty(obj, prop) {
      const old = obj[prop];
      const ok = Reflect.deleteProperty(obj, prop);
      if (ok) onChange(prop, old, undefined);
      return ok;
    },
  });
}

/* ------------------------------------------------------------------
 * 21. Object validation against a schema
 * ---------------------------------------------------------------- */
function validate(obj, schema) {
  const errors = [];
  for (const [key, rules] of Object.entries(schema)) {
    const value = obj[key];
    if (rules.required && (value == null || value === '')) {
      errors.push(`${key} is required`);
      continue;
    }
    if (value == null) continue;
    if (rules.type && typeof value !== rules.type) {
      errors.push(`${key} must be a ${rules.type}`);
    }
    if (rules.min != null && value.length < rules.min) {
      errors.push(`${key} must be at least ${rules.min} characters`);
    }
    if (rules.pattern && !rules.pattern.test(value)) {
      errors.push(`${key} has an invalid format`);
    }
    if (rules.custom && !rules.custom(value)) {
      errors.push(rules.message || `${key} is invalid`);
    }
  }
  return { valid: errors.length === 0, errors };
}

/* ------------------------------------------------------------------
 * 22. Safe JSON parse/stringify (handles cycles)
 * ---------------------------------------------------------------- */
const safeJSONParse = (str, fallback = null) => {
  try {
    return JSON.parse(str);
  } catch {
    return fallback;
  }
};

function safeStringify(obj, space = 0) {
  const seen = new WeakSet();
  return JSON.stringify(
    obj,
    (key, value) => {
      if (typeof value === 'object' && value !== null) {
        if (seen.has(value)) return '[Circular]';
        seen.add(value);
      }
      if (typeof value === 'bigint') return value.toString();
      if (value instanceof Map) return Object.fromEntries(value);
      if (value instanceof Set) return [...value];
      return value;
    },
    space
  );
}

/* ------------------------------------------------------------------
 * 23. Prototype chain inspection
 * ---------------------------------------------------------------- */
function getPrototypeChain(obj) {
  const chain = [];
  let proto = Object.getPrototypeOf(obj);
  while (proto) {
    chain.push(proto.constructor?.name ?? 'Object');
    proto = Object.getPrototypeOf(proto);
  }
  return chain;
}
// getPrototypeChain([]) → ['Array', 'Object']

const getAllMethods = (obj) => {
  const methods = new Set();
  let current = obj;
  while (current && current !== Object.prototype) {
    Object.getOwnPropertyNames(current)
      .filter((k) => typeof obj[k] === 'function' && k !== 'constructor')
      .forEach((k) => methods.add(k));
    current = Object.getPrototypeOf(current);
  }
  return [...methods];
};

/* ------------------------------------------------------------------
 * 24. Implement `new`, `instanceof` and `Object.create`
 * ---------------------------------------------------------------- */
function myNew(Ctor, ...args) {
  const obj = Object.create(Ctor.prototype);
  const result = Ctor.apply(obj, args);
  return result !== null && typeof result === 'object' ? result : obj;
}

function myInstanceof(obj, Ctor) {
  if (obj === null || typeof obj !== 'object') return false;
  let proto = Object.getPrototypeOf(obj);
  while (proto) {
    if (proto === Ctor.prototype) return true;
    proto = Object.getPrototypeOf(proto);
  }
  return false;
}

function myObjectCreate(proto, props = {}) {
  function F() {}
  F.prototype = proto;
  const obj = new F();
  Object.defineProperties(obj, props);
  return obj;
}

/* ------------------------------------------------------------------
 * 25. Chainable / fluent API builder
 * ---------------------------------------------------------------- */
class QueryBuilder {
  #parts = { select: '*', from: '', where: [], orderBy: '', limit: null };

  select(...cols) {
    this.#parts.select = cols.join(', ');
    return this;
  }
  from(table) {
    this.#parts.from = table;
    return this;
  }
  where(condition) {
    this.#parts.where.push(condition);
    return this;
  }
  orderBy(col, dir = 'ASC') {
    this.#parts.orderBy = `${col} ${dir}`;
    return this;
  }
  limit(n) {
    this.#parts.limit = n;
    return this;
  }
  build() {
    const p = this.#parts;
    return [
      `SELECT ${p.select}`,
      `FROM ${p.from}`,
      p.where.length ? `WHERE ${p.where.join(' AND ')}` : '',
      p.orderBy ? `ORDER BY ${p.orderBy}` : '',
      p.limit ? `LIMIT ${p.limit}` : '',
    ]
      .filter(Boolean)
      .join(' ');
  }
}

/* ==================================================================
 *  QUICK TESTS
 * ================================================================== */
if (require.main === module) {
  const nested = { a: 1, b: { c: 2, d: { e: 3 } }, f: new Date('2026-01-01') };
  const cloned = deepClone(nested);
  cloned.b.d.e = 99;
  console.log('deepClone       ', nested.b.d.e, '(original unchanged) vs', cloned.b.d.e);

  console.log('deepMerge       ', deepMerge({ a: { b: 1 } }, { a: { c: 2 }, d: 3 }));
  console.log('deepEqual       ', deepEqual({ a: [1, { b: 2 }] }, { a: [1, { b: 2 }] })); // true
  console.log('flattenObject   ', flattenObject({ a: { b: { c: 1 } }, d: 2 }));
  console.log('unflattenObject ', unflattenObject({ 'a.b.c': 1, d: 2 }));

  const data = { user: { addresses: [{ city: 'Surat' }] } };
  console.log('get             ', get(data, 'user.addresses[0].city'));      // Surat
  console.log('get (missing)   ', get(data, 'user.phone.number', 'N/A'));    // N/A
  console.log('set             ', set({}, 'a.b[0].c', 42));

  console.log('pick            ', pick({ a: 1, b: 2, c: 3 }, ['a', 'c']));
  console.log('omit            ', omit({ a: 1, b: 2, c: 3 }, ['b']));
  console.log('mapValues       ', mapValues({ a: 1, b: 2 }, (v) => v * 10));
  console.log('invert          ', invert({ a: '1', b: '2' }));
  console.log('compact         ', compact({ a: 1, b: null, c: '', d: 0 }));
  console.log('isEmpty         ', isEmpty({}), isEmpty({ a: 1 }), isEmpty([]));
  console.log('diff            ', diff({ a: 1, b: 2 }, { a: 1, b: 3, c: 4 }));
  console.log('toQueryString   ', toQueryString({ page: 1, q: 'react', empty: null }));
  console.log('camelizeKeys    ', camelizeKeys({ first_name: 'A', nested_obj: { last_name: 'B' } }));
  console.log('keyBy           ', keyBy([{ id: 'a', v: 1 }, { id: 'b', v: 2 }], 'id'));
  console.log('getPrototypeChain', getPrototypeChain([]));

  function Person(name) { this.name = name; }
  const p = myNew(Person, 'Jaydip');
  console.log('myNew           ', p.name, myInstanceof(p, Person));

  const store = createStore((s, a) => (a.type === 'INC' ? { n: s.n + 1 } : s), { n: 0 });
  const unsub = store.subscribe((s) => console.log('store changed →', s));
  store.dispatch({ type: 'INC' });
  unsub();

  const state = reactive({ count: 0 }, (k, o, n) => console.log(`reactive: ${k} ${o} → ${n}`));
  state.count = 5;

  console.log('validate        ', validate(
    { email: 'bad', name: '' },
    {
      name: { required: true },
      email: { required: true, pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
    }
  ));

  console.log('QueryBuilder    ', new QueryBuilder()
    .select('id', 'name')
    .from('users')
    .where('age > 18')
    .where("status = 'active'")
    .orderBy('created_at', 'DESC')
    .limit(10)
    .build());

  const circular = { a: 1 };
  circular.self = circular;
  console.log('safeStringify   ', safeStringify(circular));
}

module.exports = {
  deepClone, deepMerge, deepEqual, flattenObject, unflattenObject, get, set,
  hasPath, pick, omit, mapValues, mapKeys, filterObject, invert, compact,
  deepCompact, isEmpty, deepFreeze, countKeysDeep, allPaths, diff,
  toQueryString, fromQueryString, toQueryStringDeep, groupBy, sumBy, keyBy,
  objectToArray, arrayToObject, renameKeys, camelizeKeys, sortByKeys,
  sortByValues, memoize, memoizeObject, createStore, reactive, validate,
  safeJSONParse, safeStringify, getPrototypeChain, getAllMethods, myNew,
  myInstanceof, myObjectCreate, QueryBuilder, isPlainObject,
};
