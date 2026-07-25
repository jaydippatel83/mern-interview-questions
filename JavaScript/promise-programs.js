/**
 * ============================================================
 *  PROMISE / ASYNC PROGRAMS — Interview Coding Questions
 * ============================================================
 *  Run:  node promise-programs.js
 * ============================================================
 */

/* ------------------------------------------------------------------
 * 0. Helpers used throughout
 * ---------------------------------------------------------------- */
const sleep = (ms, value) => new Promise((r) => setTimeout(() => r(value), ms));

const delayedValue = (value, ms) => () => sleep(ms, value);

const failAfter = (ms, message) => () =>
  new Promise((_, reject) => setTimeout(() => reject(new Error(message)), ms));

/* ------------------------------------------------------------------
 * 1. Promisify a callback-based function (Node convention)
 * ---------------------------------------------------------------- */
const promisify =
  (fn) =>
  (...args) =>
    new Promise((resolve, reject) =>
      fn(...args, (err, result) => (err ? reject(err) : resolve(result)))
    );

// Reverse: turn a promise-returning fn into a callback style
const callbackify =
  (fn) =>
  (...args) => {
    const cb = args.pop();
    fn(...args).then((r) => cb(null, r), (e) => cb(e));
  };

/* ------------------------------------------------------------------
 * 2. Promise with timeout
 * ---------------------------------------------------------------- */
function withTimeout(promise, ms, message = 'Operation timed out') {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(message)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

// AbortController version — actually cancels the underlying fetch
async function fetchWithTimeout(url, ms = 5000, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/* ------------------------------------------------------------------
 * 3. Retry with exponential backoff + jitter
 * ---------------------------------------------------------------- */
async function retry(fn, {
  retries = 3,
  baseDelay = 200,
  maxDelay = 5000,
  factor = 2,
  jitter = true,
  shouldRetry = () => true,
  onRetry = () => {},
} = {}) {
  let lastError;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn(attempt);
    } catch (err) {
      lastError = err;
      if (attempt === retries || !shouldRetry(err)) break;

      let delay = Math.min(baseDelay * factor ** attempt, maxDelay);
      if (jitter) delay = Math.random() * delay; // full jitter — avoids thundering herd
      onRetry(err, attempt + 1, Math.round(delay));
      await sleep(delay);
    }
  }
  throw lastError;
}

// Typical usage: only retry 5xx and network errors, never 4xx
const isRetryable = (err) => !err.status || err.status >= 500 || err.status === 429;

/* ------------------------------------------------------------------
 * 4. Run promises SEQUENTIALLY (one after another)
 * ---------------------------------------------------------------- */
async function sequential(taskFns) {
  const results = [];
  for (const task of taskFns) results.push(await task());
  return results;
}

// reduce version (same behaviour, functional style)
const sequentialReduce = (taskFns) =>
  taskFns.reduce(
    (chain, task) => chain.then(async (acc) => [...acc, await task()]),
    Promise.resolve([])
  );

/* ------------------------------------------------------------------
 * 5. Run promises in PARALLEL with a concurrency limit
 * ---------------------------------------------------------------- */
async function promisePool(taskFns, limit = 5) {
  const results = new Array(taskFns.length);
  let cursor = 0;

  async function worker() {
    while (cursor < taskFns.length) {
      const index = cursor++;
      results[index] = await taskFns[index]();
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, taskFns.length) }, worker));
  return results;
}

// Variant that never rejects — collects errors alongside results
async function promisePoolSettled(taskFns, limit = 5) {
  const results = new Array(taskFns.length);
  let cursor = 0;
  async function worker() {
    while (cursor < taskFns.length) {
      const i = cursor++;
      try {
        results[i] = { status: 'fulfilled', value: await taskFns[i]() };
      } catch (reason) {
        results[i] = { status: 'rejected', reason };
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, taskFns.length) }, worker));
  return results;
}

/* ------------------------------------------------------------------
 * 6. Implement Promise.all
 * ---------------------------------------------------------------- */
function myPromiseAll(promises) {
  return new Promise((resolve, reject) => {
    const items = [...promises];
    const results = new Array(items.length);
    let remaining = items.length;

    if (remaining === 0) return resolve([]);

    items.forEach((p, i) => {
      Promise.resolve(p).then((value) => {
        results[i] = value;              // preserve ORDER, not completion order
        if (--remaining === 0) resolve(results);
      }, reject);                        // first rejection wins
    });
  });
}

/* ------------------------------------------------------------------
 * 7. Implement Promise.allSettled
 * ---------------------------------------------------------------- */
function myPromiseAllSettled(promises) {
  return myPromiseAll(
    [...promises].map((p) =>
      Promise.resolve(p).then(
        (value) => ({ status: 'fulfilled', value }),
        (reason) => ({ status: 'rejected', reason })
      )
    )
  );
}

/* ------------------------------------------------------------------
 * 8. Implement Promise.race
 * ---------------------------------------------------------------- */
function myPromiseRace(promises) {
  return new Promise((resolve, reject) => {
    for (const p of promises) Promise.resolve(p).then(resolve, reject);
    // whichever settles first wins; later settles are ignored
  });
}

/* ------------------------------------------------------------------
 * 9. Implement Promise.any
 * ---------------------------------------------------------------- */
function myPromiseAny(promises) {
  return new Promise((resolve, reject) => {
    const items = [...promises];
    const errors = new Array(items.length);
    let remaining = items.length;

    if (remaining === 0) {
      return reject(new AggregateError([], 'All promises were rejected'));
    }

    items.forEach((p, i) => {
      Promise.resolve(p).then(resolve, (err) => {
        errors[i] = err;
        if (--remaining === 0) {
          reject(new AggregateError(errors, 'All promises were rejected'));
        }
      });
    });
  });
}

/* ------------------------------------------------------------------
 * 10. Cancellable promise
 * ---------------------------------------------------------------- */
function makeCancellable(promise) {
  let cancelled = false;
  const wrapped = new Promise((resolve, reject) => {
    promise.then(
      (value) => (cancelled ? reject(new Error('Cancelled')) : resolve(value)),
      (error) => (cancelled ? reject(new Error('Cancelled')) : reject(error))
    );
  });
  return { promise: wrapped, cancel: () => (cancelled = true) };
}

/* ------------------------------------------------------------------
 * 11. Async queue with concurrency control (task scheduler)
 * ---------------------------------------------------------------- */
class AsyncQueue {
  #queue = [];
  #running = 0;

  constructor(concurrency = 1) {
    this.concurrency = concurrency;
  }

  push(taskFn) {
    return new Promise((resolve, reject) => {
      this.#queue.push({ taskFn, resolve, reject });
      this.#next();
    });
  }

  #next() {
    while (this.#running < this.concurrency && this.#queue.length) {
      const { taskFn, resolve, reject } = this.#queue.shift();
      this.#running++;
      Promise.resolve()
        .then(taskFn)
        .then(resolve, reject)
        .finally(() => {
          this.#running--;
          this.#next();
        });
    }
  }

  get size() {
    return this.#queue.length;
  }
  get pending() {
    return this.#running;
  }
}

/* ------------------------------------------------------------------
 * 12. Debounce and throttle for async functions
 * ---------------------------------------------------------------- */
function debounceAsync(fn, delay = 300) {
  let timer;
  let pendingResolvers = [];
  return (...args) =>
    new Promise((resolve, reject) => {
      pendingResolvers.push({ resolve, reject });
      clearTimeout(timer);
      timer = setTimeout(async () => {
        const resolvers = pendingResolvers;
        pendingResolvers = [];
        try {
          const result = await fn(...args);
          resolvers.forEach((r) => r.resolve(result));
        } catch (err) {
          resolvers.forEach((r) => r.reject(err));
        }
      }, delay);
    });
}

/* ------------------------------------------------------------------
 * 13. Deduplicate in-flight requests (request coalescing)
 * ---------------------------------------------------------------- */
function dedupe(fn, keyFn = (...a) => JSON.stringify(a)) {
  const inFlight = new Map();
  return (...args) => {
    const key = keyFn(...args);
    if (inFlight.has(key)) return inFlight.get(key); // reuse the pending promise

    const promise = Promise.resolve(fn(...args)).finally(() => inFlight.delete(key));
    inFlight.set(key, promise);
    return promise;
  };
}
// 100 components calling getUser(1) simultaneously → ONE network request

/* ------------------------------------------------------------------
 * 14. Cache async results with a TTL
 * ---------------------------------------------------------------- */
function cacheAsync(fn, ttlMs = 60_000) {
  const cache = new Map();
  const cached = async (...args) => {
    const key = JSON.stringify(args);
    const hit = cache.get(key);
    if (hit && Date.now() - hit.time < ttlMs) return hit.value;

    const value = await fn(...args);
    cache.set(key, { value, time: Date.now() });
    return value;
  };
  cached.invalidate = (...args) => cache.delete(JSON.stringify(args));
  cached.clear = () => cache.clear();
  return cached;
}

/* ------------------------------------------------------------------
 * 15. Rate limiter — N calls per interval (token bucket)
 * ---------------------------------------------------------------- */
function rateLimit(fn, maxCalls, intervalMs) {
  const timestamps = [];
  return async (...args) => {
    const now = Date.now();
    while (timestamps.length && now - timestamps[0] > intervalMs) timestamps.shift();

    if (timestamps.length >= maxCalls) {
      const waitFor = intervalMs - (now - timestamps[0]);
      await sleep(waitFor);
      return rateLimit(fn, maxCalls, intervalMs)(...args);
    }

    timestamps.push(Date.now());
    return fn(...args);
  };
}

/* ------------------------------------------------------------------
 * 16. Async pipe / compose
 * ---------------------------------------------------------------- */
const pipeAsync =
  (...fns) =>
  (input) =>
    fns.reduce((chain, fn) => chain.then(fn), Promise.resolve(input));

const composeAsync = (...fns) => pipeAsync(...fns.reverse());

/* ------------------------------------------------------------------
 * 17. Async map / filter / reduce / forEach
 * ---------------------------------------------------------------- */
const asyncMap = (arr, fn) => Promise.all(arr.map(fn)); // parallel

async function asyncMapSeries(arr, fn) {
  const out = [];
  for (let i = 0; i < arr.length; i++) out.push(await fn(arr[i], i, arr));
  return out;
}

async function asyncFilter(arr, predicate) {
  const flags = await Promise.all(arr.map(predicate));
  return arr.filter((_, i) => flags[i]);
}

async function asyncReduce(arr, fn, initial) {
  let acc = initial;
  for (let i = 0; i < arr.length; i++) acc = await fn(acc, arr[i], i, arr);
  return acc;
}

/* ------------------------------------------------------------------
 * 18. Poll until a condition is met
 * ---------------------------------------------------------------- */
async function poll(fn, {
  interval = 1000,
  timeout = 30_000,
  condition = (result) => Boolean(result),
} = {}) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    const result = await fn();
    if (condition(result)) return result;
    await sleep(interval);
  }
  throw new Error('Polling timed out');
}

/* ------------------------------------------------------------------
 * 19. Circuit breaker
 * ---------------------------------------------------------------- */
class CircuitBreaker {
  #failures = 0;
  #state = 'CLOSED'; // CLOSED → OPEN → HALF_OPEN
  #nextAttempt = 0;

  constructor(fn, { threshold = 5, resetTimeout = 30_000 } = {}) {
    this.fn = fn;
    this.threshold = threshold;
    this.resetTimeout = resetTimeout;
  }

  async call(...args) {
    if (this.#state === 'OPEN') {
      if (Date.now() < this.#nextAttempt) throw new Error('Circuit breaker is OPEN');
      this.#state = 'HALF_OPEN';
    }

    try {
      const result = await this.fn(...args);
      this.#failures = 0;
      this.#state = 'CLOSED';
      return result;
    } catch (err) {
      this.#failures++;
      if (this.#failures >= this.threshold) {
        this.#state = 'OPEN';
        this.#nextAttempt = Date.now() + this.resetTimeout;
      }
      throw err;
    }
  }

  get state() {
    return this.#state;
  }
}

/* ------------------------------------------------------------------
 * 20. Event loop order — predict the output
 * ---------------------------------------------------------------- */
function eventLoopDemo() {
  const order = [];
  order.push('1 sync start');

  setTimeout(() => order.push('7 setTimeout 0            [macrotask]'), 0);

  Promise.resolve().then(() => order.push('4 promise.then           [microtask #1]'));
  queueMicrotask(() => order.push('5 queueMicrotask         [microtask #2]'));

  (async () => {
    order.push('2 async body runs SYNC until the first await');
    await null;
    order.push('6 code after await       [microtask #3]');
  })();

  order.push('3 sync end');

  return new Promise((resolve) => setTimeout(() => resolve(order), 10));
}
// Microtasks fire in REGISTRATION order: .then was registered before
// queueMicrotask, which was registered before the async fn hit its await.
// All three drain before the single setTimeout macrotask.

/* ==================================================================
 *  QUICK TESTS
 * ================================================================== */
async function main() {
  console.log('--- myPromiseAll ---');
  console.log(await myPromiseAll([1, sleep(20, 2), Promise.resolve(3)])); // [1,2,3] in order

  console.log('\n--- myPromiseAllSettled ---');
  console.log(await myPromiseAllSettled([Promise.resolve(1), Promise.reject(new Error('x'))]));

  console.log('\n--- myPromiseRace ---');
  console.log(await myPromiseRace([sleep(50, 'slow'), sleep(10, 'fast')])); // fast

  console.log('\n--- myPromiseAny ---');
  console.log(await myPromiseAny([Promise.reject(new Error('a')), sleep(10, 'ok')])); // ok
  try {
    await myPromiseAny([Promise.reject(new Error('a')), Promise.reject(new Error('b'))]);
  } catch (e) {
    console.log('AggregateError:', e.errors.map((x) => x.message));
  }

  console.log('\n--- sequential vs parallel timing ---');
  const tasks = [delayedValue('a', 60), delayedValue('b', 60), delayedValue('c', 60)];

  let t = Date.now();
  await sequential(tasks);
  console.log(`sequential: ~${Date.now() - t}ms (expected ~180ms)`);

  t = Date.now();
  await Promise.all(tasks.map((fn) => fn()));
  console.log(`parallel:   ~${Date.now() - t}ms (expected ~60ms)`);

  t = Date.now();
  await promisePool(tasks, 2);
  console.log(`pool(2):    ~${Date.now() - t}ms (expected ~120ms)`);

  console.log('\n--- retry with backoff ---');
  let attempts = 0;
  const flaky = async () => {
    attempts++;
    if (attempts < 3) throw new Error(`attempt ${attempts} failed`);
    return `succeeded on attempt ${attempts}`;
  };
  console.log(
    await retry(flaky, {
      retries: 5,
      baseDelay: 20,
      onRetry: (err, n, d) => console.log(`  retry #${n} after ${d}ms — ${err.message}`),
    })
  );

  console.log('\n--- withTimeout ---');
  try {
    await withTimeout(sleep(200, 'too slow'), 50);
  } catch (e) {
    console.log('caught:', e.message);
  }

  console.log('\n--- dedupe (request coalescing) ---');
  let calls = 0;
  const getUser = dedupe(async (id) => {
    calls++;
    await sleep(30);
    return { id, name: 'Jaydip' };
  });
  await Promise.all([getUser(1), getUser(1), getUser(1)]);
  console.log(`3 concurrent calls → ${calls} actual invocation(s)`);

  console.log('\n--- AsyncQueue ---');
  const queue = new AsyncQueue(2);
  const started = [];
  await Promise.all(
    [1, 2, 3, 4].map((n) =>
      queue.push(async () => {
        started.push(n);
        await sleep(20);
        return n * 10;
      })
    )
  );
  console.log('processed order:', started);

  console.log('\n--- asyncFilter ---');
  console.log(await asyncFilter([1, 2, 3, 4], async (n) => n % 2 === 0)); // [2,4]

  console.log('\n--- pipeAsync ---');
  console.log(await pipeAsync(
    async (n) => n + 1,
    async (n) => n * 2,
    async (n) => `result: ${n}`
  )(5)); // result: 12

  console.log('\n--- poll ---');
  let ticks = 0;
  console.log(await poll(async () => ++ticks, { interval: 10, condition: (n) => n >= 3 }));

  console.log('\n--- CircuitBreaker ---');
  const breaker = new CircuitBreaker(async () => { throw new Error('service down'); }, {
    threshold: 2,
    resetTimeout: 1000,
  });
  for (let i = 0; i < 3; i++) {
    try { await breaker.call(); } catch (e) { console.log(`  call ${i + 1}: ${e.message} [${breaker.state}]`); }
  }

  console.log('\n--- event loop order ---');
  console.log((await eventLoopDemo()).join('\n'));
}

if (require.main === module) main();

module.exports = {
  sleep, delayedValue, failAfter, promisify, callbackify, withTimeout,
  fetchWithTimeout, retry, isRetryable, sequential, sequentialReduce,
  promisePool, promisePoolSettled, myPromiseAll, myPromiseAllSettled,
  myPromiseRace, myPromiseAny, makeCancellable, AsyncQueue, debounceAsync,
  dedupe, cacheAsync, rateLimit, pipeAsync, composeAsync, asyncMap,
  asyncMapSeries, asyncFilter, asyncReduce, poll, CircuitBreaker, eventLoopDemo,
};
