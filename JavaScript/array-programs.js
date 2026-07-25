/**
 * ============================================================
 *  ARRAY PROGRAMS — JavaScript Interview Coding Questions
 * ============================================================
 *  Every function is standalone and runnable.
 *  Run:  node array-programs.js
 * ============================================================
 */

/* ------------------------------------------------------------------
 * 1. Find the maximum and minimum in an array
 * ---------------------------------------------------------------- */
const findMax = (arr) => arr.reduce((max, n) => (n > max ? n : max), -Infinity);
const findMin = (arr) => arr.reduce((min, n) => (n < min ? n : min), Infinity);

// Math.max(...arr) fails on very large arrays (stack overflow ~100k+ elements)
const findMaxSafe = (arr) => arr.reduce((a, b) => Math.max(a, b), -Infinity);

/* ------------------------------------------------------------------
 * 2. Second largest element (without sorting) — O(n)
 * ---------------------------------------------------------------- */
function secondLargest(arr) {
  let first = -Infinity;
  let second = -Infinity;
  for (const n of arr) {
    if (n > first) {
      second = first;
      first = n;
    } else if (n > second && n !== first) {
      second = n;
    }
  }
  return second === -Infinity ? null : second;
}
// secondLargest([10, 5, 20, 20, 8]) → 10

/* ------------------------------------------------------------------
 * 3. Reverse an array (in place, two pointers) — O(n) time, O(1) space
 * ---------------------------------------------------------------- */
function reverseArray(arr) {
  let left = 0;
  let right = arr.length - 1;
  while (left < right) {
    [arr[left], arr[right]] = [arr[right], arr[left]];
    left++;
    right--;
  }
  return arr;
}
const reverseCopy = (arr) => [...arr].reverse(); // or arr.toReversed()

/* ------------------------------------------------------------------
 * 4. Remove duplicates — 4 approaches
 * ---------------------------------------------------------------- */
const uniqueSet = (arr) => [...new Set(arr)];

const uniqueFilter = (arr) => arr.filter((v, i) => arr.indexOf(v) === i); // O(n²)

const uniqueReduce = (arr) =>
  arr.reduce((acc, v) => (acc.includes(v) ? acc : [...acc, v]), []);

// By object key
const uniqueBy = (arr, key) => [
  ...new Map(arr.map((item) => [item[key], item])).values(),
];
// uniqueBy([{id:1},{id:1},{id:2}], 'id') → [{id:1},{id:2}]

/* ------------------------------------------------------------------
 * 5. Flatten a nested array — recursive, reduce and native
 * ---------------------------------------------------------------- */
function flattenDeep(arr) {
  return arr.reduce(
    (flat, item) => flat.concat(Array.isArray(item) ? flattenDeep(item) : item),
    []
  );
}

const flattenNative = (arr, depth = Infinity) => arr.flat(depth);

// Iterative (no recursion — safe for very deep nesting)
function flattenIterative(arr) {
  const stack = [...arr];
  const out = [];
  while (stack.length) {
    const next = stack.pop();
    if (Array.isArray(next)) stack.push(...next);
    else out.push(next);
  }
  return out.reverse();
}

/* ------------------------------------------------------------------
 * 6. Chunk an array into groups of size n
 * ---------------------------------------------------------------- */
function chunk(arr, size) {
  if (size <= 0) throw new RangeError('size must be > 0');
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}
// chunk([1,2,3,4,5], 2) → [[1,2],[3,4],[5]]

/* ------------------------------------------------------------------
 * 7. Rotate an array by k positions
 * ---------------------------------------------------------------- */
// O(n) space
const rotateRight = (arr, k) => {
  const n = arr.length;
  if (!n) return arr;
  k = ((k % n) + n) % n; // handle k > n and negative k
  return [...arr.slice(-k), ...arr.slice(0, -k)];
};

// O(1) space — reversal algorithm (asked at FAANG)
function rotateInPlace(arr, k) {
  const n = arr.length;
  k = ((k % n) + n) % n;
  const rev = (s, e) => {
    while (s < e) [arr[s], arr[e]] = [arr[e], arr[s]], s++, e--;
  };
  rev(0, n - 1);
  rev(0, k - 1);
  rev(k, n - 1);
  return arr;
}

/* ------------------------------------------------------------------
 * 8. Two Sum — O(n) with a hash map
 * ---------------------------------------------------------------- */
function twoSum(nums, target) {
  const seen = new Map(); // value → index
  for (let i = 0; i < nums.length; i++) {
    const need = target - nums[i];
    if (seen.has(need)) return [seen.get(need), i];
    seen.set(nums[i], i);
  }
  return [];
}

/* ------------------------------------------------------------------
 * 9. Three Sum — sort + two pointers, O(n²)
 * ---------------------------------------------------------------- */
function threeSum(nums) {
  const a = [...nums].sort((x, y) => x - y);
  const res = [];
  for (let i = 0; i < a.length - 2; i++) {
    if (i > 0 && a[i] === a[i - 1]) continue; // skip duplicates
    let l = i + 1;
    let r = a.length - 1;
    while (l < r) {
      const sum = a[i] + a[l] + a[r];
      if (sum === 0) {
        res.push([a[i], a[l], a[r]]);
        while (a[l] === a[l + 1]) l++;
        while (a[r] === a[r - 1]) r--;
        l++;
        r--;
      } else if (sum < 0) l++;
      else r--;
    }
  }
  return res;
}

/* ------------------------------------------------------------------
 * 10. Maximum subarray sum — Kadane's algorithm, O(n)
 * ---------------------------------------------------------------- */
function maxSubArraySum(arr) {
  let best = -Infinity;
  let current = 0;
  for (const n of arr) {
    current = Math.max(n, current + n);
    best = Math.max(best, current);
  }
  return best;
}
// maxSubArraySum([-2,1,-3,4,-1,2,1,-5,4]) → 6  ([4,-1,2,1])

/* ------------------------------------------------------------------
 * 11. Move all zeros to the end (preserving order) — O(n), O(1)
 * ---------------------------------------------------------------- */
function moveZeros(arr) {
  let insert = 0;
  for (let i = 0; i < arr.length; i++) {
    if (arr[i] !== 0) arr[insert++] = arr[i];
  }
  while (insert < arr.length) arr[insert++] = 0;
  return arr;
}

/* ------------------------------------------------------------------
 * 12. Find missing number in 1..n
 * ---------------------------------------------------------------- */
const missingNumber = (arr, n) =>
  (n * (n + 1)) / 2 - arr.reduce((a, b) => a + b, 0);

// XOR version — avoids integer overflow for huge n
function missingNumberXor(arr) {
  let xor = arr.length;
  for (let i = 0; i < arr.length; i++) xor ^= i ^ arr[i];
  return xor;
}

/* ------------------------------------------------------------------
 * 13. Find all duplicates in an array
 * ---------------------------------------------------------------- */
function findDuplicates(arr) {
  const seen = new Set();
  const dupes = new Set();
  for (const v of arr) (seen.has(v) ? dupes : seen).add(v);
  return [...dupes];
}

/* ------------------------------------------------------------------
 * 14. Intersection, union and difference of two arrays
 * ---------------------------------------------------------------- */
const union = (a, b) => [...new Set([...a, ...b])];
const intersection = (a, b) => {
  const setB = new Set(b);
  return [...new Set(a.filter((x) => setB.has(x)))];
};
const difference = (a, b) => {
  const setB = new Set(b);
  return a.filter((x) => !setB.has(x));
};
const symmetricDifference = (a, b) => [...difference(a, b), ...difference(b, a)];

/* ------------------------------------------------------------------
 * 15. Group array of objects by a key
 * ---------------------------------------------------------------- */
function groupBy(arr, keyOrFn) {
  const fn = typeof keyOrFn === 'function' ? keyOrFn : (o) => o[keyOrFn];
  return arr.reduce((acc, item) => {
    const key = fn(item);
    (acc[key] ||= []).push(item);
    return acc;
  }, {});
}
// Modern native: Object.groupBy(arr, fn)

/* ------------------------------------------------------------------
 * 16. Sort array of objects by multiple keys
 * ---------------------------------------------------------------- */
function sortBy(arr, ...keys) {
  return [...arr].sort((a, b) => {
    for (const key of keys) {
      const desc = key.startsWith('-');
      const k = desc ? key.slice(1) : key;
      if (a[k] === b[k]) continue;
      const cmp = a[k] > b[k] ? 1 : -1;
      return desc ? -cmp : cmp;
    }
    return 0;
  });
}
// sortBy(users, 'age', '-name')

/* ------------------------------------------------------------------
 * 17. Frequency count / most frequent element
 * ---------------------------------------------------------------- */
const frequency = (arr) =>
  arr.reduce((m, x) => ((m[x] = (m[x] || 0) + 1), m), {});

function mostFrequent(arr) {
  const freq = frequency(arr);
  return Object.keys(freq).reduce((a, b) => (freq[a] >= freq[b] ? a : b));
}

/* ------------------------------------------------------------------
 * 18. Merge two sorted arrays — O(n + m)
 * ---------------------------------------------------------------- */
function mergeSorted(a, b) {
  const out = [];
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) out.push(a[i] <= b[j] ? a[i++] : b[j++]);
  while (i < a.length) out.push(a[i++]);
  while (j < b.length) out.push(b[j++]);
  return out;
}

/* ------------------------------------------------------------------
 * 19. Binary search — iterative, O(log n)
 * ---------------------------------------------------------------- */
function binarySearch(arr, target) {
  let lo = 0;
  let hi = arr.length - 1;
  while (lo <= hi) {
    const mid = lo + Math.floor((hi - lo) / 2); // avoids overflow
    if (arr[mid] === target) return mid;
    if (arr[mid] < target) lo = mid + 1;
    else hi = mid - 1;
  }
  return -1;
}

/* ------------------------------------------------------------------
 * 20. Product of array except self — O(n), no division
 * ---------------------------------------------------------------- */
function productExceptSelf(nums) {
  const n = nums.length;
  const out = new Array(n).fill(1);
  let left = 1;
  for (let i = 0; i < n; i++) {
    out[i] = left;
    left *= nums[i];
  }
  let right = 1;
  for (let i = n - 1; i >= 0; i--) {
    out[i] *= right;
    right *= nums[i];
  }
  return out;
}
// productExceptSelf([1,2,3,4]) → [24,12,8,6]

/* ------------------------------------------------------------------
 * 21. Array equality (shallow and deep)
 * ---------------------------------------------------------------- */
const shallowEqual = (a, b) =>
  a.length === b.length && a.every((v, i) => v === b[i]);

function deepEqual(a, b) {
  if (a === b) return true;
  if (typeof a !== 'object' || typeof b !== 'object' || !a || !b) return false;
  const ka = Object.keys(a);
  const kb = Object.keys(b);
  if (ka.length !== kb.length) return false;
  return ka.every((k) => deepEqual(a[k], b[k]));
}

/* ------------------------------------------------------------------
 * 22. Shuffle an array — Fisher-Yates (unbiased)
 * ---------------------------------------------------------------- */
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
// ❌ arr.sort(() => Math.random() - 0.5) is BIASED — a classic interview trap

/* ------------------------------------------------------------------
 * 23. Range / zip / partition / countBy — utility helpers
 * ---------------------------------------------------------------- */
const range = (start, end, step = 1) =>
  Array.from({ length: Math.ceil((end - start) / step) }, (_, i) => start + i * step);

const zip = (...arrays) =>
  Array.from({ length: Math.min(...arrays.map((a) => a.length)) }, (_, i) =>
    arrays.map((a) => a[i])
  );

const partition = (arr, predicate) =>
  arr.reduce(
    (acc, x) => (acc[predicate(x) ? 0 : 1].push(x), acc),
    [[], []]
  );

const countBy = (arr, fn) =>
  arr.reduce((acc, x) => ((acc[fn(x)] = (acc[fn(x)] || 0) + 1), acc), {});

/* ------------------------------------------------------------------
 * 24. Longest consecutive sequence — O(n)
 * ---------------------------------------------------------------- */
function longestConsecutive(nums) {
  const set = new Set(nums);
  let best = 0;
  for (const n of set) {
    if (set.has(n - 1)) continue; // only start counting at sequence starts
    let length = 1;
    while (set.has(n + length)) length++;
    best = Math.max(best, length);
  }
  return best;
}

/* ------------------------------------------------------------------
 * 25. Sliding window maximum — O(n) with a deque
 * ---------------------------------------------------------------- */
function maxSlidingWindow(nums, k) {
  const deque = []; // stores indices, values decreasing
  const out = [];
  for (let i = 0; i < nums.length; i++) {
    while (deque.length && deque[0] <= i - k) deque.shift();
    while (deque.length && nums[deque[deque.length - 1]] <= nums[i]) deque.pop();
    deque.push(i);
    if (i >= k - 1) out.push(nums[deque[0]]);
  }
  return out;
}

/* ------------------------------------------------------------------
 * 26. Array of objects → nested tree
 * ---------------------------------------------------------------- */
function buildTree(items, rootId = null) {
  const map = new Map(items.map((i) => [i.id, { ...i, children: [] }]));
  const roots = [];
  for (const node of map.values()) {
    if (node.parentId === rootId) roots.push(node);
    else map.get(node.parentId)?.children.push(node);
  }
  return roots;
}

/* ------------------------------------------------------------------
 * 27. Paginate an array
 * ---------------------------------------------------------------- */
const paginate = (arr, page = 1, perPage = 10) => ({
  data: arr.slice((page - 1) * perPage, page * perPage),
  page,
  perPage,
  total: arr.length,
  totalPages: Math.ceil(arr.length / perPage),
});

/* ------------------------------------------------------------------
 * 28. Sum, average, median and mode
 * ---------------------------------------------------------------- */
const sum = (arr) => arr.reduce((a, b) => a + b, 0);
const average = (arr) => (arr.length ? sum(arr) / arr.length : 0);

function median(arr) {
  const s = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

function mode(arr) {
  const freq = frequency(arr);
  const max = Math.max(...Object.values(freq));
  return Object.keys(freq).filter((k) => freq[k] === max);
}

/* ------------------------------------------------------------------
 * 29. Matrix operations (2D arrays)
 * ---------------------------------------------------------------- */
const transpose = (m) => m[0].map((_, i) => m.map((row) => row[i]));

// Rotate a square matrix 90° clockwise, in place
function rotateMatrix(m) {
  const n = m.length;
  for (let i = 0; i < n; i++)
    for (let j = i + 1; j < n; j++) [m[i][j], m[j][i]] = [m[j][i], m[i][j]];
  m.forEach((row) => row.reverse());
  return m;
}

function spiralOrder(matrix) {
  const out = [];
  let top = 0;
  let bottom = matrix.length - 1;
  let left = 0;
  let right = matrix[0].length - 1;
  while (top <= bottom && left <= right) {
    for (let i = left; i <= right; i++) out.push(matrix[top][i]);
    top++;
    for (let i = top; i <= bottom; i++) out.push(matrix[i][right]);
    right--;
    if (top <= bottom) {
      for (let i = right; i >= left; i--) out.push(matrix[bottom][i]);
      bottom--;
    }
    if (left <= right) {
      for (let i = bottom; i >= top; i--) out.push(matrix[i][left]);
      left++;
    }
  }
  return out;
}

/* ------------------------------------------------------------------
 * 30. Best time to buy and sell stock — O(n)
 * ---------------------------------------------------------------- */
function maxProfit(prices) {
  let minPrice = Infinity;
  let profit = 0;
  for (const p of prices) {
    minPrice = Math.min(minPrice, p);
    profit = Math.max(profit, p - minPrice);
  }
  return profit;
}

/* ==================================================================
 *  QUICK TESTS
 * ================================================================== */
if (require.main === module) {
  console.log('secondLargest   ', secondLargest([10, 5, 20, 20, 8]));      // 10
  console.log('uniqueSet       ', uniqueSet([1, 2, 2, 3, 3, 3]));          // [1,2,3]
  console.log('flattenDeep     ', flattenDeep([1, [2, [3, [4]]]]));        // [1,2,3,4]
  console.log('chunk           ', chunk([1, 2, 3, 4, 5], 2));              // [[1,2],[3,4],[5]]
  console.log('rotateRight     ', rotateRight([1, 2, 3, 4, 5], 2));        // [4,5,1,2,3]
  console.log('twoSum          ', twoSum([2, 7, 11, 15], 9));              // [0,1]
  console.log('threeSum        ', threeSum([-1, 0, 1, 2, -1, -4]));        // [[-1,-1,2],[-1,0,1]]
  console.log('maxSubArraySum  ', maxSubArraySum([-2, 1, -3, 4, -1, 2, 1, -5, 4])); // 6
  console.log('moveZeros       ', moveZeros([0, 1, 0, 3, 12]));            // [1,3,12,0,0]
  console.log('missingNumber   ', missingNumber([1, 2, 4, 5], 5));         // 3
  console.log('intersection    ', intersection([1, 2, 3], [2, 3, 4]));     // [2,3]
  console.log('groupBy         ', groupBy([1, 2, 3, 4], (n) => (n % 2 ? 'odd' : 'even')));
  console.log('mergeSorted     ', mergeSorted([1, 3, 5], [2, 4, 6]));      // [1,2,3,4,5,6]
  console.log('binarySearch    ', binarySearch([1, 3, 5, 7, 9], 7));       // 3
  console.log('productExceptSelf', productExceptSelf([1, 2, 3, 4]));       // [24,12,8,6]
  console.log('longestConsec.  ', longestConsecutive([100, 4, 200, 1, 3, 2])); // 4
  console.log('maxSlidingWindow', maxSlidingWindow([1, 3, -1, -3, 5, 3, 6, 7], 3)); // [3,3,5,5,6,7]
  console.log('spiralOrder     ', spiralOrder([[1, 2, 3], [4, 5, 6], [7, 8, 9]]));
  console.log('maxProfit       ', maxProfit([7, 1, 5, 3, 6, 4]));          // 5
  console.log('median          ', median([5, 3, 1, 4, 2]));                // 3
}

module.exports = {
  findMax, findMin, findMaxSafe, secondLargest, reverseArray, reverseCopy,
  uniqueSet, uniqueFilter, uniqueReduce, uniqueBy, flattenDeep, flattenNative,
  flattenIterative, chunk, rotateRight, rotateInPlace, twoSum, threeSum,
  maxSubArraySum, moveZeros, missingNumber, missingNumberXor, findDuplicates,
  union, intersection, difference, symmetricDifference, groupBy, sortBy,
  frequency, mostFrequent, mergeSorted, binarySearch, productExceptSelf,
  shallowEqual, deepEqual, shuffle, range, zip, partition, countBy,
  longestConsecutive, maxSlidingWindow, buildTree, paginate, sum, average,
  median, mode, transpose, rotateMatrix, spiralOrder, maxProfit,
};
