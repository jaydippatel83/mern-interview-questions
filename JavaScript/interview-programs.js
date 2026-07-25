/**
 * ============================================================
 *  INTERVIEW PROGRAMS — Classic JS machine-coding questions
 * ============================================================
 *  Logic building, patterns, number theory, dates and
 *  "implement this utility" rounds.
 *  Run:  node interview-programs.js
 * ============================================================
 */

/* ==================================================================
 *  SECTION 1 — NUMBERS & MATH
 * ================================================================== */

/* 1. FizzBuzz */
function fizzBuzz(n) {
  const out = [];
  for (let i = 1; i <= n; i++) {
    let s = '';
    if (i % 3 === 0) s += 'Fizz';
    if (i % 5 === 0) s += 'Buzz';
    out.push(s || i);
  }
  return out;
}

/* 2. Prime check + sieve of Eratosthenes */
function isPrime(n) {
  if (n < 2) return false;
  if (n < 4) return true;
  if (n % 2 === 0 || n % 3 === 0) return false;
  for (let i = 5; i * i <= n; i += 6) {
    if (n % i === 0 || n % (i + 2) === 0) return false;
  }
  return true;
}

function sieve(limit) {
  const isComposite = new Uint8Array(limit + 1);
  const primes = [];
  for (let i = 2; i <= limit; i++) {
    if (!isComposite[i]) {
      primes.push(i);
      for (let j = i * i; j <= limit; j += i) isComposite[j] = 1;
    }
  }
  return primes;
}

/* 3. Factorial — recursive, iterative, memoized, BigInt */
const factorialRecursive = (n) => (n <= 1 ? 1 : n * factorialRecursive(n - 1));

function factorialIterative(n) {
  let result = 1;
  for (let i = 2; i <= n; i++) result *= i;
  return result;
}

function factorialBig(n) {
  let result = 1n;
  for (let i = 2n; i <= BigInt(n); i++) result *= i;
  return result; // 100! is exact — a plain Number loses precision past 18!
}

/* 4. Fibonacci — naive, memoized, iterative, generator */
const fibNaive = (n) => (n < 2 ? n : fibNaive(n - 1) + fibNaive(n - 2)); // O(2ⁿ) ❌

const fibMemo = (() => {
  const cache = new Map([[0, 0], [1, 1]]);
  return function fib(n) {
    if (cache.has(n)) return cache.get(n);
    const value = fib(n - 1) + fib(n - 2);
    cache.set(n, value);
    return value;
  };
})();

function fibIterative(n) {
  let [a, b] = [0, 1];
  for (let i = 0; i < n; i++) [a, b] = [b, a + b];
  return a; // O(n) time, O(1) space
}

function* fibGenerator() {
  let [a, b] = [0, 1];
  while (true) {
    yield a;
    [a, b] = [b, a + b];
  }
}

/* 5. GCD, LCM, power, square root */
const gcd = (a, b) => (b === 0 ? Math.abs(a) : gcd(b, a % b));
const lcm = (a, b) => Math.abs(a * b) / gcd(a, b);

// Fast exponentiation — O(log n)
function power(base, exp) {
  if (exp < 0) return 1 / power(base, -exp);
  let result = 1;
  while (exp > 0) {
    if (exp % 2 === 1) result *= base;
    base *= base;
    exp = Math.floor(exp / 2);
  }
  return result;
}

// Newton's method
function sqrt(n, precision = 1e-10) {
  if (n < 0) return NaN;
  let x = n;
  while (Math.abs(x * x - n) > precision) x = (x + n / x) / 2;
  return x;
}

/* 6. Reverse a number, palindrome number, digit sum, Armstrong */
const reverseNumber = (n) =>
  Math.sign(n) * Number(String(Math.abs(n)).split('').reverse().join(''));

const isPalindromeNumber = (n) => n >= 0 && n === reverseNumber(n);

const digitSum = (n) =>
  String(Math.abs(n)).split('').reduce((a, d) => a + Number(d), 0);

// Digital root — repeatedly sum until single digit
const digitalRoot = (n) => (n === 0 ? 0 : 1 + ((n - 1) % 9));

function isArmstrong(n) {
  const digits = String(n).split('');
  const power = digits.length;
  return digits.reduce((sum, d) => sum + Number(d) ** power, 0) === n;
}
// 153 = 1³ + 5³ + 3³ ✅

/* 7. Number to words (Indian system) */
function numberToWords(num) {
  if (num === 0) return 'zero';
  const ones = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine',
    'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen',
    'seventeen', 'eighteen', 'nineteen'];
  const tens = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

  const twoDigits = (n) =>
    n < 20 ? ones[n] : `${tens[Math.floor(n / 10)]}${n % 10 ? '-' + ones[n % 10] : ''}`;

  const threeDigits = (n) => {
    const h = Math.floor(n / 100);
    const rest = n % 100;
    return [h ? `${ones[h]} hundred` : '', rest ? twoDigits(rest) : ''].filter(Boolean).join(' ');
  };

  const parts = [];
  const units = [[10000000, 'crore'], [100000, 'lakh'], [1000, 'thousand']];
  for (const [value, name] of units) {
    if (num >= value) {
      parts.push(`${threeDigits(Math.floor(num / value))} ${name}`);
      num %= value;
    }
  }
  if (num) parts.push(threeDigits(num));
  return parts.join(' ').trim();
}

/* 8. Roman numeral conversion */
function toRoman(num) {
  const map = [
    [1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'],
    [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I'],
  ];
  let out = '';
  for (const [value, symbol] of map) {
    while (num >= value) {
      out += symbol;
      num -= value;
    }
  }
  return out;
}

function fromRoman(s) {
  const values = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };
  let total = 0;
  for (let i = 0; i < s.length; i++) {
    const current = values[s[i]];
    const next = values[s[i + 1]];
    total += next > current ? -current : current; // subtractive notation
  }
  return total;
}

/* 9. Random helpers */
const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

const randomFrom = (arr) => arr[Math.floor(Math.random() * arr.length)];

// Cryptographically secure ID
const randomId = (len = 16) =>
  Array.from({ length: len }, () => Math.floor(Math.random() * 36).toString(36)).join('');

/* ==================================================================
 *  SECTION 2 — PATTERN PRINTING (very common in Indian interviews)
 * ================================================================== */

/* 10. Right-angled triangle */
const rightTriangle = (n) =>
  Array.from({ length: n }, (_, i) => '*'.repeat(i + 1)).join('\n');

/* 11. Pyramid */
const pyramid = (n) =>
  Array.from({ length: n }, (_, i) =>
    ' '.repeat(n - i - 1) + '*'.repeat(2 * i + 1)
  ).join('\n');

/* 12. Diamond */
const diamond = (n) => {
  const top = Array.from({ length: n }, (_, i) =>
    ' '.repeat(n - i - 1) + '*'.repeat(2 * i + 1)
  );
  const bottom = top.slice(0, -1).reverse();
  return [...top, ...bottom].join('\n');
};

/* 13. Pascal's triangle */
function pascalsTriangle(rows) {
  const triangle = [];
  for (let i = 0; i < rows; i++) {
    const row = [1];
    for (let j = 1; j <= i; j++) {
      row.push((triangle[i - 1][j - 1] ?? 0) + (triangle[i - 1][j] ?? 0));
    }
    triangle.push(row);
  }
  return triangle;
}

/* 14. Multiplication table */
const multiplicationTable = (n, upto = 10) =>
  Array.from({ length: upto }, (_, i) => `${n} x ${i + 1} = ${n * (i + 1)}`).join('\n');

/* ==================================================================
 *  SECTION 3 — DATE & TIME
 * ================================================================== */

/* 15. Format a date without a library */
function formatDate(date, pattern = 'DD/MM/YYYY') {
  const d = new Date(date);
  const pad = (n, len = 2) => String(n).padStart(len, '0');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  const tokens = {
    YYYY: d.getFullYear(),
    YY: String(d.getFullYear()).slice(-2),
    MMM: months[d.getMonth()],
    MM: pad(d.getMonth() + 1),
    DD: pad(d.getDate()),
    HH: pad(d.getHours()),
    mm: pad(d.getMinutes()),
    ss: pad(d.getSeconds()),
  };

  return pattern.replace(/YYYY|YY|MMM|MM|DD|HH|mm|ss/g, (t) => tokens[t]);
}

/* 16. Relative time ("3 hours ago") */
function timeAgo(date, now = Date.now()) {
  const seconds = Math.floor((now - new Date(date)) / 1000);
  const units = [
    [31536000, 'year'], [2592000, 'month'], [604800, 'week'],
    [86400, 'day'], [3600, 'hour'], [60, 'minute'], [1, 'second'],
  ];
  for (const [secs, name] of units) {
    const value = Math.floor(seconds / secs);
    if (value >= 1) return `${value} ${name}${value > 1 ? 's' : ''} ago`;
  }
  return 'just now';
}

// Native alternative — localised for free
const relativeTime = (date, locale = 'en') => {
  const diff = (new Date(date) - Date.now()) / 1000;
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
  const units = [['year', 31536000], ['month', 2592000], ['day', 86400],
    ['hour', 3600], ['minute', 60], ['second', 1]];
  for (const [unit, secs] of units) {
    if (Math.abs(diff) >= secs || unit === 'second') {
      return rtf.format(Math.round(diff / secs), unit);
    }
  }
};

/* 17. Age calculation, date difference, leap year */
function calculateAge(dob, on = new Date()) {
  const birth = new Date(dob);
  let age = on.getFullYear() - birth.getFullYear();
  const monthDiff = on.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && on.getDate() < birth.getDate())) age--;
  return age;
}

const daysBetween = (a, b) =>
  Math.round(Math.abs(new Date(b) - new Date(a)) / 86400000);

const isLeapYear = (y) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;

const addDays = (date, days) => {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
};

const startOfDay = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

/* 18. Working days between two dates (skip weekends) */
function businessDays(start, end) {
  let count = 0;
  const current = new Date(start);
  const last = new Date(end);
  while (current <= last) {
    const day = current.getDay();
    if (day !== 0 && day !== 6) count++;
    current.setDate(current.getDate() + 1);
  }
  return count;
}

/* ==================================================================
 *  SECTION 4 — REAL-WORLD UTILITIES
 * ================================================================== */

/* 19. LRU Cache — O(1) get and put using Map insertion order */
class LRUCache {
  #cache = new Map();

  constructor(capacity = 5) {
    this.capacity = capacity;
  }

  get(key) {
    if (!this.#cache.has(key)) return -1;
    const value = this.#cache.get(key);
    this.#cache.delete(key);    // re-insert to mark as most-recently used
    this.#cache.set(key, value);
    return value;
  }

  put(key, value) {
    if (this.#cache.has(key)) this.#cache.delete(key);
    else if (this.#cache.size >= this.capacity) {
      this.#cache.delete(this.#cache.keys().next().value); // evict oldest
    }
    this.#cache.set(key, value);
    return this;
  }

  get keys() {
    return [...this.#cache.keys()];
  }
}

/* 20. Deep flatten a nested comment/reply tree */
function flattenTree(nodes, childrenKey = 'children', depth = 0) {
  return nodes.flatMap((node) => [
    { ...node, depth, [childrenKey]: undefined },
    ...flattenTree(node[childrenKey] ?? [], childrenKey, depth + 1),
  ]);
}

/* 21. Search / filter with a debounce-friendly matcher */
function fuzzyMatch(text, query) {
  const t = text.toLowerCase();
  const q = query.toLowerCase();
  let index = 0;
  for (const ch of q) {
    index = t.indexOf(ch, index);
    if (index === -1) return false;
    index++;
  }
  return true;
}
// fuzzyMatch('interview questions', 'itvq') → true

function highlightMatch(text, query) {
  if (!query) return text;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return text.replace(new RegExp(`(${escaped})`, 'gi'), '<mark>$1</mark>');
}

/* 22. Cookie helpers */
const setCookie = (name, value, days = 7) => {
  const expires = new Date(Date.now() + days * 86400000).toUTCString();
  return `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
};

const parseCookies = (cookieString = '') =>
  Object.fromEntries(
    cookieString
      .split(';')
      .map((c) => c.trim().split('='))
      .filter(([k]) => k)
      .map(([k, v]) => [k, decodeURIComponent(v ?? '')])
  );

/* 23. Simple router (hash-based) */
class Router {
  #routes = [];

  add(pattern, handler) {
    // '/users/:id' → /^\/users\/([^/]+)$/
    const paramNames = [];
    const regex = new RegExp(
      '^' +
        pattern.replace(/:([\w]+)/g, (_, name) => {
          paramNames.push(name);
          return '([^/]+)';
        }) +
        '$'
    );
    this.#routes.push({ regex, paramNames, handler });
    return this;
  }

  resolve(path) {
    for (const { regex, paramNames, handler } of this.#routes) {
      const match = path.match(regex);
      if (match) {
        const params = Object.fromEntries(
          paramNames.map((name, i) => [name, match[i + 1]])
        );
        return handler(params);
      }
    }
    return null;
  }
}

/* 24. Undo/redo stack (command pattern) */
class History {
  #past = [];
  #future = [];

  constructor(present) {
    this.present = present;
  }

  push(state) {
    this.#past.push(this.present);
    this.present = state;
    this.#future = []; // a new action clears the redo stack
    return this;
  }

  undo() {
    if (!this.#past.length) return this.present;
    this.#future.unshift(this.present);
    this.present = this.#past.pop();
    return this.present;
  }

  redo() {
    if (!this.#future.length) return this.present;
    this.#past.push(this.present);
    this.present = this.#future.shift();
    return this.present;
  }

  get canUndo() { return this.#past.length > 0; }
  get canRedo() { return this.#future.length > 0; }
}

/* 25. Shopping cart / order total with discounts and tax */
function calculateOrder(items, { taxRate = 0.18, discountCode, shipping = 0 } = {}) {
  const discounts = { SAVE10: 0.1, SAVE20: 0.2, WELCOME: 0.05 };

  const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const discountRate = discounts[discountCode] ?? 0;
  const discount = +(subtotal * discountRate).toFixed(2);
  const taxable = subtotal - discount;
  const tax = +(taxable * taxRate).toFixed(2);
  const total = +(taxable + tax + shipping).toFixed(2);

  return { subtotal: +subtotal.toFixed(2), discount, tax, shipping, total };
}

/* 26. Pagination metadata */
function getPagination(totalItems, currentPage = 1, perPage = 10, maxLinks = 5) {
  const totalPages = Math.max(1, Math.ceil(totalItems / perPage));
  const page = Math.min(Math.max(1, currentPage), totalPages);

  let start = Math.max(1, page - Math.floor(maxLinks / 2));
  const end = Math.min(totalPages, start + maxLinks - 1);
  start = Math.max(1, end - maxLinks + 1);

  return {
    page,
    perPage,
    totalItems,
    totalPages,
    offset: (page - 1) * perPage,
    hasPrev: page > 1,
    hasNext: page < totalPages,
    pages: Array.from({ length: end - start + 1 }, (_, i) => start + i),
  };
}

/* 27. Form state manager with validation */
function createForm(initialValues, validators = {}) {
  let values = { ...initialValues };
  let touched = {};

  const validate = () => {
    const errors = {};
    for (const [field, rules] of Object.entries(validators)) {
      for (const rule of [].concat(rules)) {
        const error = rule(values[field], values);
        if (error) {
          errors[field] = error;
          break;
        }
      }
    }
    return errors;
  };

  return {
    get values() { return { ...values }; },
    get errors() { return validate(); },
    get isValid() { return Object.keys(validate()).length === 0; },
    get touched() { return { ...touched }; },
    setValue(field, value) {
      values[field] = value;
      touched[field] = true;
      return this;
    },
    reset() {
      values = { ...initialValues };
      touched = {};
      return this;
    },
  };
}

// Reusable validation rules
const required = (msg = 'This field is required') => (v) =>
  v == null || v === '' ? msg : null;
const minLength = (n, msg) => (v) =>
  v && v.length < n ? msg || `Must be at least ${n} characters` : null;
const email = (msg = 'Invalid email') => (v) =>
  v && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? msg : null;
const matches = (field, msg) => (v, all) => (v !== all[field] ? msg : null);

/* 28. Throttled scroll / infinite scroll detector */
function isNearBottom(el, threshold = 100) {
  return el.scrollHeight - el.scrollTop - el.clientHeight < threshold;
}

/* 29. Simple state machine */
function createMachine(config) {
  let state = config.initial;
  return {
    get state() { return state; },
    send(event) {
      const next = config.states[state]?.on?.[event];
      if (next) {
        config.states[state]?.onExit?.();
        state = next;
        config.states[state]?.onEntry?.();
      }
      return state;
    },
    can(event) { return Boolean(config.states[state]?.on?.[event]); },
  };
}

/* 30. Type checking utility */
const getType = (v) =>
  Object.prototype.toString.call(v).slice(8, -1).toLowerCase();

const is = {
  string: (v) => typeof v === 'string',
  number: (v) => typeof v === 'number' && !Number.isNaN(v),
  boolean: (v) => typeof v === 'boolean',
  array: Array.isArray,
  object: (v) => getType(v) === 'object',
  function: (v) => typeof v === 'function',
  date: (v) => getType(v) === 'date' && !Number.isNaN(v.getTime()),
  regexp: (v) => getType(v) === 'regexp',
  promise: (v) => v && typeof v.then === 'function',
  empty: (v) => {
    if (v == null) return true;
    if (typeof v === 'string' || Array.isArray(v)) return v.length === 0;
    if (v instanceof Map || v instanceof Set) return v.size === 0;
    if (getType(v) === 'object') return Object.keys(v).length === 0;
    return false;
  },
};

/* ==================================================================
 *  QUICK TESTS
 * ================================================================== */
if (require.main === module) {
  console.log('=== NUMBERS ===');
  console.log('fizzBuzz(15)   ', fizzBuzz(15).join(' '));
  console.log('sieve(30)      ', sieve(30));
  console.log('factorialBig(25)', factorialBig(25).toString());
  console.log('fibIterative(50)', fibIterative(50));
  console.log('fibGenerator   ', [...(function* () {
    const g = fibGenerator();
    for (let i = 0; i < 10; i++) yield g.next().value;
  })()]);
  console.log('gcd/lcm        ', gcd(48, 18), lcm(4, 6));
  console.log('power(2,10)    ', power(2, 10));
  console.log('isArmstrong    ', isArmstrong(153), isArmstrong(154));
  console.log('digitalRoot    ', digitalRoot(9875));
  console.log('numberToWords  ', numberToWords(12345678));
  console.log('toRoman(2026)  ', toRoman(2026), '→ back:', fromRoman(toRoman(2026)));

  console.log('\n=== PATTERNS ===');
  console.log(pyramid(4));
  console.log('\nPascal:', pascalsTriangle(5));

  console.log('\n=== DATES ===');
  const d = new Date('2026-07-25T14:30:00');
  console.log('formatDate     ', formatDate(d, 'DD MMM YYYY, HH:mm'));
  console.log('timeAgo        ', timeAgo(Date.now() - 3 * 3600 * 1000));
  console.log('calculateAge   ', calculateAge('1998-03-15', new Date('2026-07-25')));
  console.log('daysBetween    ', daysBetween('2026-01-01', '2026-07-25'));
  console.log('isLeapYear     ', isLeapYear(2024), isLeapYear(2026));
  console.log('businessDays   ', businessDays('2026-07-01', '2026-07-31'));

  console.log('\n=== LRU CACHE ===');
  const lru = new LRUCache(3);
  lru.put('a', 1).put('b', 2).put('c', 3);
  lru.get('a');                 // 'a' becomes most recent
  lru.put('d', 4);              // evicts 'b' (least recently used)
  console.log('keys after eviction:', lru.keys, '| get(b):', lru.get('b'));

  console.log('\n=== ROUTER ===');
  const router = new Router()
    .add('/users/:id', (p) => `User page for id=${p.id}`)
    .add('/posts/:postId/comments/:commentId', (p) => `Post ${p.postId}, comment ${p.commentId}`);
  console.log(router.resolve('/users/42'));
  console.log(router.resolve('/posts/7/comments/99'));

  console.log('\n=== UNDO / REDO ===');
  const history = new History('v1');
  history.push('v2').push('v3');
  console.log('undo →', history.undo(), '| undo →', history.undo(), '| redo →', history.redo());

  console.log('\n=== ORDER TOTAL ===');
  console.log(calculateOrder(
    [{ price: 500, quantity: 2 }, { price: 1200, quantity: 1 }],
    { discountCode: 'SAVE10', shipping: 50 }
  ));

  console.log('\n=== PAGINATION ===');
  console.log(getPagination(237, 12, 10));

  console.log('\n=== FORM ===');
  const form = createForm(
    { email: '', password: '', confirm: '' },
    {
      email: [required(), email()],
      password: [required(), minLength(8)],
      confirm: [matches('password', 'Passwords must match')],
    }
  );
  form.setValue('email', 'not-an-email').setValue('password', '123');
  console.log('errors:', form.errors, '| isValid:', form.isValid);

  console.log('\n=== STATE MACHINE ===');
  const order = createMachine({
    initial: 'pending',
    states: {
      pending: { on: { PAY: 'paid', CANCEL: 'cancelled' } },
      paid: { on: { SHIP: 'shipped', REFUND: 'refunded' } },
      shipped: { on: { DELIVER: 'delivered' } },
      delivered: {},
      cancelled: {},
      refunded: {},
    },
  });
  console.log(order.state, '→', order.send('PAY'), '→', order.send('SHIP'), '→', order.send('DELIVER'));
  console.log('can CANCEL from delivered?', order.can('CANCEL'));

  console.log('\n=== MISC ===');
  console.log('fuzzyMatch     ', fuzzyMatch('interview questions', 'itvq'));
  console.log('highlightMatch ', highlightMatch('React interview', 'inter'));
  console.log('parseCookies   ', parseCookies('token=abc123; theme=dark; lang=en'));
  console.log('getType        ', getType([]), getType(null), getType(new Date()));
  console.log('is.empty       ', is.empty({}), is.empty([1]), is.empty(''));
  console.log('flattenTree    ', flattenTree([
    { id: 1, children: [{ id: 2, children: [{ id: 3 }] }] },
  ]).map((n) => `${'  '.repeat(n.depth)}#${n.id}`).join('\n'));
}

module.exports = {
  fizzBuzz, isPrime, sieve, factorialRecursive, factorialIterative, factorialBig,
  fibNaive, fibMemo, fibIterative, fibGenerator, gcd, lcm, power, sqrt,
  reverseNumber, isPalindromeNumber, digitSum, digitalRoot, isArmstrong,
  numberToWords, toRoman, fromRoman, randomInt, randomFrom, randomId,
  rightTriangle, pyramid, diamond, pascalsTriangle, multiplicationTable,
  formatDate, timeAgo, relativeTime, calculateAge, daysBetween, isLeapYear,
  addDays, startOfDay, businessDays, LRUCache, flattenTree, fuzzyMatch,
  highlightMatch, setCookie, parseCookies, Router, History, calculateOrder,
  getPagination, createForm, required, minLength, email, matches,
  isNearBottom, createMachine, getType, is,
};
