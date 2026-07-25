/**
 * ============================================================
 *  POLYFILLS — "Implement X from scratch" interview questions
 * ============================================================
 *  The most commonly asked JS machine-coding round questions.
 *  Run:  node polyfills.js
 * ============================================================
 */

/* ==================================================================
 *  SECTION 1 — FUNCTION METHODS
 * ================================================================== */

/* 1. Function.prototype.call */
Function.prototype.myCall = function (context, ...args) {
  context = context ?? globalThis;
  if (Object(context) !== context) context = Object(context); // box primitives

  const key = Symbol('fn');       // Symbol avoids clobbering an existing property
  context[key] = this;            // `this` is the function being called
  try {
    return context[key](...args);
  } finally {
    delete context[key];
  }
};

/* 2. Function.prototype.apply */
Function.prototype.myApply = function (context, args = []) {
  if (!Array.isArray(args) && args != null) {
    throw new TypeError('CreateListFromArrayLike called on non-object');
  }
  return this.myCall(context, ...args);
};

/* 3. Function.prototype.bind — including `new` support */
Function.prototype.myBind = function (context, ...boundArgs) {
  const targetFn = this;
  if (typeof targetFn !== 'function') {
    throw new TypeError('Bind must be called on a function');
  }

  function bound(...callArgs) {
    // When called with `new`, ignore the bound context and use the new instance
    const isNew = this instanceof bound;
    return targetFn.apply(isNew ? this : context, [...boundArgs, ...callArgs]);
  }

  bound.prototype = Object.create(targetFn.prototype ?? null);
  return bound;
};

/* ==================================================================
 *  SECTION 2 — ARRAY METHODS
 * ================================================================== */

/* 4. Array.prototype.map */
Array.prototype.myMap = function (callback, thisArg) {
  if (typeof callback !== 'function') throw new TypeError(`${callback} is not a function`);
  const out = new Array(this.length);
  for (let i = 0; i < this.length; i++) {
    if (i in this) out[i] = callback.call(thisArg, this[i], i, this); // skip holes
  }
  return out;
};

/* 5. Array.prototype.filter */
Array.prototype.myFilter = function (callback, thisArg) {
  const out = [];
  for (let i = 0; i < this.length; i++) {
    if (i in this && callback.call(thisArg, this[i], i, this)) out.push(this[i]);
  }
  return out;
};

/* 6. Array.prototype.reduce */
Array.prototype.myReduce = function (callback, initialValue) {
  if (typeof callback !== 'function') throw new TypeError(`${callback} is not a function`);

  let acc = initialValue;
  let startIndex = 0;

  if (arguments.length < 2) {
    // Find the first non-hole element
    while (startIndex < this.length && !(startIndex in this)) startIndex++;
    if (startIndex >= this.length) {
      throw new TypeError('Reduce of empty array with no initial value');
    }
    acc = this[startIndex++];
  }

  for (let i = startIndex; i < this.length; i++) {
    if (i in this) acc = callback(acc, this[i], i, this);
  }
  return acc;
};

/* 7. Array.prototype.forEach */
Array.prototype.myForEach = function (callback, thisArg) {
  for (let i = 0; i < this.length; i++) {
    if (i in this) callback.call(thisArg, this[i], i, this);
  }
  // returns undefined — by design, not chainable
};

/* 8. Array.prototype.find / findIndex / some / every */
Array.prototype.myFind = function (callback, thisArg) {
  for (let i = 0; i < this.length; i++) {
    if (callback.call(thisArg, this[i], i, this)) return this[i];
  }
  return undefined;
};

Array.prototype.myFindIndex = function (callback, thisArg) {
  for (let i = 0; i < this.length; i++) {
    if (callback.call(thisArg, this[i], i, this)) return i;
  }
  return -1;
};

Array.prototype.mySome = function (callback, thisArg) {
  for (let i = 0; i < this.length; i++) {
    if (i in this && callback.call(thisArg, this[i], i, this)) return true;
  }
  return false;
};

Array.prototype.myEvery = function (callback, thisArg) {
  for (let i = 0; i < this.length; i++) {
    if (i in this && !callback.call(thisArg, this[i], i, this)) return false;
  }
  return true;
};

/* 9. Array.prototype.flat */
Array.prototype.myFlat = function (depth = 1) {
  const out = [];
  for (const item of this) {
    if (Array.isArray(item) && depth > 0) out.push(...item.myFlat(depth - 1));
    else out.push(item);
  }
  return out;
};

/* 10. Array.prototype.includes — note: handles NaN, unlike indexOf */
Array.prototype.myIncludes = function (searchElement, fromIndex = 0) {
  const len = this.length;
  let start = fromIndex < 0 ? Math.max(len + fromIndex, 0) : fromIndex;
  for (let i = start; i < len; i++) {
    if (Object.is(this[i], searchElement) || this[i] === searchElement) return true;
  }
  return false;
};

/* ==================================================================
 *  SECTION 3 — PROMISE
 * ================================================================== */

/* 11. A Promises/A+ compliant Promise implementation */
const PENDING = 'pending';
const FULFILLED = 'fulfilled';
const REJECTED = 'rejected';

class MyPromise {
  #state = PENDING;
  #value = undefined;
  #reason = undefined;
  #onFulfilledCallbacks = [];
  #onRejectedCallbacks = [];

  constructor(executor) {
    if (typeof executor !== 'function') throw new TypeError('Executor must be a function');

    const resolve = (value) => {
      // Resolving with a thenable adopts its state
      if (value instanceof MyPromise) return value.then(resolve, reject);
      if (this.#state !== PENDING) return;
      this.#state = FULFILLED;
      this.#value = value;
      this.#onFulfilledCallbacks.forEach((cb) => queueMicrotask(() => cb(value)));
      this.#onFulfilledCallbacks = [];
    };

    const reject = (reason) => {
      if (this.#state !== PENDING) return;
      this.#state = REJECTED;
      this.#reason = reason;
      this.#onRejectedCallbacks.forEach((cb) => queueMicrotask(() => cb(reason)));
      this.#onRejectedCallbacks = [];
    };

    try {
      executor(resolve, reject);
    } catch (err) {
      reject(err);
    }
  }

  then(onFulfilled, onRejected) {
    // Pass-through when handlers are omitted — this is what makes chaining work
    const handleFulfilled =
      typeof onFulfilled === 'function' ? onFulfilled : (v) => v;
    const handleRejected =
      typeof onRejected === 'function'
        ? onRejected
        : (e) => {
            throw e;
          };

    return new MyPromise((resolve, reject) => {
      const runFulfilled = (value) =>
        queueMicrotask(() => {
          try {
            resolve(handleFulfilled(value));
          } catch (err) {
            reject(err);
          }
        });

      const runRejected = (reason) =>
        queueMicrotask(() => {
          try {
            resolve(handleRejected(reason));
          } catch (err) {
            reject(err);
          }
        });

      if (this.#state === FULFILLED) runFulfilled(this.#value);
      else if (this.#state === REJECTED) runRejected(this.#reason);
      else {
        this.#onFulfilledCallbacks.push(runFulfilled);
        this.#onRejectedCallbacks.push(runRejected);
      }
    });
  }

  catch(onRejected) {
    return this.then(null, onRejected);
  }

  finally(onFinally) {
    return this.then(
      (value) => MyPromise.resolve(onFinally()).then(() => value),
      (reason) =>
        MyPromise.resolve(onFinally()).then(() => {
          throw reason;
        })
    );
  }

  static resolve(value) {
    return value instanceof MyPromise ? value : new MyPromise((res) => res(value));
  }

  static reject(reason) {
    return new MyPromise((_, rej) => rej(reason));
  }

  static all(promises) {
    return new MyPromise((resolve, reject) => {
      const items = [...promises];
      const results = new Array(items.length);
      let remaining = items.length;
      if (!remaining) return resolve([]);
      items.forEach((p, i) =>
        MyPromise.resolve(p).then((v) => {
          results[i] = v;
          if (--remaining === 0) resolve(results);
        }, reject)
      );
    });
  }

  static allSettled(promises) {
    return MyPromise.all(
      [...promises].map((p) =>
        MyPromise.resolve(p).then(
          (value) => ({ status: 'fulfilled', value }),
          (reason) => ({ status: 'rejected', reason })
        )
      )
    );
  }

  static race(promises) {
    return new MyPromise((resolve, reject) => {
      for (const p of promises) MyPromise.resolve(p).then(resolve, reject);
    });
  }

  static any(promises) {
    return new MyPromise((resolve, reject) => {
      const items = [...promises];
      const errors = new Array(items.length);
      let remaining = items.length;
      if (!remaining) return reject(new AggregateError([], 'All promises were rejected'));
      items.forEach((p, i) =>
        MyPromise.resolve(p).then(resolve, (err) => {
          errors[i] = err;
          if (--remaining === 0) {
            reject(new AggregateError(errors, 'All promises were rejected'));
          }
        })
      );
    });
  }
}

/* ==================================================================
 *  SECTION 4 — UTILITIES (lodash-style)
 * ================================================================== */

/* 12. debounce — with leading/trailing options and cancel */
function debounce(fn, wait = 300, { leading = false, trailing = true } = {}) {
  let timer = null;
  let lastArgs = null;
  let lastThis = null;

  function invoke() {
    timer = null;
    if (trailing && lastArgs) {
      fn.apply(lastThis, lastArgs);
      lastArgs = lastThis = null;
    }
  }

  function debounced(...args) {
    lastArgs = args;
    lastThis = this;

    const shouldCallNow = leading && timer === null;
    clearTimeout(timer);
    timer = setTimeout(invoke, wait);

    if (shouldCallNow) {
      fn.apply(this, args);
      lastArgs = lastThis = null;
    }
  }

  debounced.cancel = () => {
    clearTimeout(timer);
    timer = null;
    lastArgs = lastThis = null;
  };

  debounced.flush = () => {
    if (timer) {
      clearTimeout(timer);
      invoke();
    }
  };

  return debounced;
}

/* 13. throttle — leading + trailing edge */
function throttle(fn, limit = 300, { leading = true, trailing = true } = {}) {
  let lastRun = 0;
  let timer = null;
  let lastArgs = null;

  return function throttled(...args) {
    const now = Date.now();
    if (!lastRun && !leading) lastRun = now;

    const remaining = limit - (now - lastRun);
    lastArgs = args;

    if (remaining <= 0 || remaining > limit) {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      lastRun = now;
      fn.apply(this, args);
    } else if (!timer && trailing) {
      timer = setTimeout(() => {
        lastRun = leading ? Date.now() : 0;
        timer = null;
        fn.apply(this, lastArgs);
      }, remaining);
    }
  };
}

/* 14. curry — supports partial application of any arity */
function curry(fn, arity = fn.length) {
  return function curried(...args) {
    if (args.length >= arity) return fn.apply(this, args);
    return (...next) => curried.apply(this, [...args, ...next]);
  };
}

// Placeholder curry (lodash-style _)
const _ = Symbol('placeholder');
function curryWithPlaceholder(fn) {
  return function curried(...args) {
    const complete =
      args.length >= fn.length && !args.slice(0, fn.length).includes(_);
    if (complete) return fn.apply(this, args);

    return (...next) => {
      const merged = args.map((a) => (a === _ && next.length ? next.shift() : a));
      return curried.apply(this, [...merged, ...next]);
    };
  };
}

/* 15. memoize with a custom resolver */
function memoize(fn, resolver = (...args) => JSON.stringify(args)) {
  const cache = new Map();
  function memoized(...args) {
    const key = resolver.apply(this, args);
    if (cache.has(key)) return cache.get(key);
    const result = fn.apply(this, args);
    cache.set(key, result);
    return result;
  }
  memoized.cache = cache;
  return memoized;
}

/* 16. once */
function once(fn) {
  let called = false;
  let result;
  return function (...args) {
    if (!called) {
      called = true;
      result = fn.apply(this, args);
      fn = null; // release the closure for GC
    }
    return result;
  };
}

/* 17. pipe / compose */
const pipe = (...fns) => (input) => fns.reduce((acc, fn) => fn(acc), input);
const compose = (...fns) => (input) => fns.reduceRight((acc, fn) => fn(acc), input);

/* 18. deepClone */
function deepClone(value, seen = new WeakMap()) {
  if (value === null || typeof value !== 'object') return value;
  if (seen.has(value)) return seen.get(value);

  if (value instanceof Date) return new Date(value);
  if (value instanceof RegExp) return new RegExp(value.source, value.flags);
  if (value instanceof Map) {
    const m = new Map();
    seen.set(value, m);
    value.forEach((v, k) => m.set(deepClone(k, seen), deepClone(v, seen)));
    return m;
  }
  if (value instanceof Set) {
    const s = new Set();
    seen.set(value, s);
    value.forEach((v) => s.add(deepClone(v, seen)));
    return s;
  }

  const out = Array.isArray(value) ? [] : Object.create(Object.getPrototypeOf(value));
  seen.set(value, out);
  for (const key of Reflect.ownKeys(value)) out[key] = deepClone(value[key], seen);
  return out;
}

/* ==================================================================
 *  SECTION 5 — OBJECT & JSON
 * ================================================================== */

/* 19. Object.create */
function myObjectCreate(proto, propertiesObject) {
  if (typeof proto !== 'object' && typeof proto !== 'function') {
    throw new TypeError('Object prototype may only be an Object or null');
  }
  function F() {}
  F.prototype = proto;
  const obj = new F();
  if (propertiesObject) Object.defineProperties(obj, propertiesObject);
  return obj;
}

/* 20. Object.assign */
function myObjectAssign(target, ...sources) {
  if (target == null) throw new TypeError('Cannot convert undefined or null to object');
  const to = Object(target);
  for (const source of sources) {
    if (source == null) continue;
    for (const key of Reflect.ownKeys(source)) {
      const desc = Object.getOwnPropertyDescriptor(source, key);
      if (desc?.enumerable) to[key] = source[key];
    }
  }
  return to;
}

/* 21. instanceof */
function myInstanceof(instance, Constructor) {
  if (instance === null || (typeof instance !== 'object' && typeof instance !== 'function')) {
    return false;
  }
  let proto = Object.getPrototypeOf(instance);
  const target = Constructor.prototype;
  while (proto !== null) {
    if (proto === target) return true;
    proto = Object.getPrototypeOf(proto);
  }
  return false;
}

/* 22. new */
function myNew(Constructor, ...args) {
  if (typeof Constructor !== 'function') throw new TypeError('not a constructor');
  const obj = Object.create(Constructor.prototype);
  const result = Constructor.apply(obj, args);
  return result !== null && typeof result === 'object' ? result : obj;
}

/* 23. JSON.stringify (simplified) */
function myStringify(value) {
  const type = typeof value;

  if (value === null) return 'null';
  if (type === 'number') return Number.isFinite(value) ? String(value) : 'null';
  if (type === 'boolean') return String(value);
  if (type === 'string') return `"${value.replace(/[\\"]/g, '\\$&').replace(/\n/g, '\\n')}"`;
  if (type === 'undefined' || type === 'function' || type === 'symbol') return undefined;

  if (typeof value.toJSON === 'function') return myStringify(value.toJSON());

  if (Array.isArray(value)) {
    const items = value.map((v) => myStringify(v) ?? 'null'); // holes/undefined → null
    return `[${items.join(',')}]`;
  }

  const pairs = [];
  for (const [k, v] of Object.entries(value)) {
    const str = myStringify(v);
    if (str !== undefined) pairs.push(`"${k}":${str}`); // undefined props are DROPPED
  }
  return `{${pairs.join(',')}}`;
}

/* ==================================================================
 *  SECTION 6 — DOM / BROWSER (conceptual, runs in a browser)
 * ================================================================== */

/* 24. Event emitter (pub/sub) */
class EventEmitter {
  #events = new Map();

  on(event, listener) {
    if (!this.#events.has(event)) this.#events.set(event, new Set());
    this.#events.get(event).add(listener);
    return () => this.off(event, listener); // unsubscribe function
  }

  once(event, listener) {
    const wrapper = (...args) => {
      this.off(event, wrapper);
      listener(...args);
    };
    wrapper.original = listener;
    return this.on(event, wrapper);
  }

  off(event, listener) {
    const set = this.#events.get(event);
    if (!set) return this;
    for (const l of set) {
      if (l === listener || l.original === listener) set.delete(l);
    }
    if (!set.size) this.#events.delete(event);
    return this;
  }

  emit(event, ...args) {
    const set = this.#events.get(event);
    if (!set?.size) return false;
    [...set].forEach((l) => l(...args)); // copy — listeners may unsubscribe mid-emit
    return true;
  }

  listenerCount(event) {
    return this.#events.get(event)?.size ?? 0;
  }

  removeAllListeners(event) {
    if (event) this.#events.delete(event);
    else this.#events.clear();
    return this;
  }
}

/* 25. getElementsByClassName / querySelector-ish traversal */
function myGetElementsByClassName(className, root = document.body) {
  const result = [];
  const walk = (node) => {
    if (node.nodeType === 1 && node.classList.contains(className)) result.push(node);
    for (const child of node.children ?? []) walk(child);
  };
  walk(root);
  return result;
}

/* 26. Simple virtual DOM diff (concept) */
function createElement(tag, props = {}, ...children) {
  return { tag, props, children: children.flat() };
}

function render(vnode) {
  if (typeof vnode === 'string' || typeof vnode === 'number') {
    return document.createTextNode(String(vnode));
  }
  const el = document.createElement(vnode.tag);
  for (const [key, value] of Object.entries(vnode.props ?? {})) {
    if (key.startsWith('on')) el.addEventListener(key.slice(2).toLowerCase(), value);
    else el.setAttribute(key, value);
  }
  vnode.children.forEach((child) => el.appendChild(render(child)));
  return el;
}

/* ==================================================================
 *  QUICK TESTS
 * ================================================================== */
if (require.main === module) {
  console.log('=== FUNCTION METHODS ===');
  function greet(greeting, punct) {
    return `${greeting}, ${this.name}${punct}`;
  }
  const person = { name: 'Jaydip' };
  console.log('myCall  ', greet.myCall(person, 'Hello', '!'));
  console.log('myApply ', greet.myApply(person, ['Hi', '.']));
  console.log('myBind  ', greet.myBind(person, 'Hey')('!!'));

  function Point(x, y) {
    this.x = x;
    this.y = y;
  }
  const BoundPoint = Point.myBind(null, 1);
  const p = new BoundPoint(2);
  console.log('myBind+new', p.x, p.y, p instanceof Point);

  console.log('\n=== ARRAY METHODS ===');
  console.log('myMap    ', [1, 2, 3].myMap((n) => n * 2));
  console.log('myFilter ', [1, 2, 3, 4].myFilter((n) => n % 2 === 0));
  console.log('myReduce ', [1, 2, 3, 4].myReduce((a, b) => a + b));
  console.log('myReduce0', [1, 2, 3, 4].myReduce((a, b) => a + b, 100));
  console.log('myFind   ', [1, 5, 9].myFind((n) => n > 3));
  console.log('mySome   ', [1, 2].mySome((n) => n > 1), 'myEvery', [1, 2].myEvery((n) => n > 0));
  console.log('myFlat   ', [1, [2, [3, [4]]]].myFlat(2));
  console.log('myIncludes NaN', [NaN].myIncludes(NaN), '(indexOf gives', [NaN].indexOf(NaN), ')');
  try {
    [].myReduce((a, b) => a + b);
  } catch (e) {
    console.log('myReduce empty →', e.message);
  }

  console.log('\n=== MyPromise ===');
  new MyPromise((resolve) => setTimeout(() => resolve('resolved!'), 20))
    .then((v) => {
      console.log('then    ', v);
      return v.toUpperCase();
    })
    .then((v) => {
      console.log('chained ', v);
      throw new Error('boom');
    })
    .catch((e) => console.log('catch   ', e.message))
    .finally(() => console.log('finally  ran'));

  MyPromise.all([1, MyPromise.resolve(2), new MyPromise((r) => setTimeout(() => r(3), 10))])
    .then((v) => console.log('MyPromise.all     ', v));

  MyPromise.allSettled([MyPromise.resolve(1), MyPromise.reject(new Error('nope'))])
    .then((v) => console.log('MyPromise.allSettled', v.map((x) => x.status)));

  MyPromise.race([
    new MyPromise((r) => setTimeout(() => r('slow'), 50)),
    new MyPromise((r) => setTimeout(() => r('fast'), 5)),
  ]).then((v) => console.log('MyPromise.race    ', v));

  console.log('\n=== UTILITIES ===');
  const add3 = curry((a, b, c) => a + b + c);
  console.log('curry    ', add3(1)(2)(3), add3(1, 2)(3), add3(1)(2, 3), add3(1, 2, 3));

  const slowSquare = (n) => {
    for (let i = 0; i < 1e6; i++); // simulate work
    return n * n;
  };
  const fast = memoize(slowSquare);
  fast(9);
  console.log('memoize  ', fast(9), '(cache size:', fast.cache.size, ')');

  const init = once(() => 'initialized');
  console.log('once     ', init(), init(), init());

  console.log('pipe     ', pipe((n) => n + 1, (n) => n * 2, (n) => `= ${n}`)(5));
  console.log('compose  ', compose((n) => `= ${n}`, (n) => n * 2, (n) => n + 1)(5));

  console.log('\n=== OBJECT / JSON ===');
  console.log('myNew        ', myNew(Point, 3, 4));
  console.log('myInstanceof ', myInstanceof([], Array), myInstanceof({}, Array));
  console.log('myObjectAssign', myObjectAssign({ a: 1 }, { b: 2 }, { a: 3 }));
  console.log('myStringify  ', myStringify({
    a: 1,
    b: 'two',
    c: [1, undefined, null],
    d: undefined,
    e: { f: true },
    g: () => {},
  }));
  console.log('native       ', JSON.stringify({
    a: 1, b: 'two', c: [1, undefined, null], d: undefined, e: { f: true }, g: () => {},
  }));

  console.log('\n=== EventEmitter ===');
  const bus = new EventEmitter();
  const unsub = bus.on('data', (payload) => console.log('  on   →', payload));
  bus.once('data', (payload) => console.log('  once →', payload));
  bus.emit('data', { id: 1 });
  bus.emit('data', { id: 2 }); // `once` no longer fires
  unsub();
  console.log('  after unsub, listeners:', bus.listenerCount('data'));

  console.log('\n=== debounce / throttle ===');
  let debounceCalls = 0;
  const debounced = debounce(() => debounceCalls++, 50);
  for (let i = 0; i < 10; i++) debounced();
  setTimeout(() => console.log(`  debounce: 10 rapid calls → ${debounceCalls} execution(s)`), 100);

  let throttleCalls = 0;
  const throttled = throttle(() => throttleCalls++, 50);
  const interval = setInterval(throttled, 10);
  setTimeout(() => {
    clearInterval(interval);
    console.log(`  throttle: ~20 calls over 200ms @50ms limit → ${throttleCalls} execution(s)`);
  }, 200);
}

module.exports = {
  MyPromise, EventEmitter, debounce, throttle, curry, curryWithPlaceholder,
  memoize, once, pipe, compose, deepClone, myObjectCreate, myObjectAssign,
  myInstanceof, myNew, myStringify, createElement, render,
  myGetElementsByClassName,
};
