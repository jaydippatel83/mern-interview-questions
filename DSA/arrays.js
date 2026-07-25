/**
 * ============================================================
 *  DSA — ARRAYS
 * ============================================================
 *  Two pointers · Sliding window · Prefix sum · Binary search
 *  Sorting · Kadane · Matrix · Intervals
 *
 *  Every function has its time/space complexity documented.
 *  Run:  node arrays.js
 * ============================================================
 */

/* ==================================================================
 *  SECTION 1 — TWO POINTERS
 * ================================================================== */

/**
 * Two Sum (sorted array) — O(n) time, O(1) space
 * The unsorted version needs a hash map (see twoSumHash).
 */
function twoSumSorted(nums, target) {
  let left = 0;
  let right = nums.length - 1;
  while (left < right) {
    const sum = nums[left] + nums[right];
    if (sum === target) return [left, right];
    if (sum < target) left++;      // need a bigger sum
    else right--;                  // need a smaller sum
  }
  return [];
}

/** Two Sum (unsorted) — O(n) time, O(n) space */
function twoSumHash(nums, target) {
  const seen = new Map();
  for (let i = 0; i < nums.length; i++) {
    const need = target - nums[i];
    if (seen.has(need)) return [seen.get(need), i];
    seen.set(nums[i], i);
  }
  return [];
}

/** 3Sum — all unique triplets summing to 0. O(n²) time, O(1) extra space */
function threeSum(nums) {
  const a = [...nums].sort((x, y) => x - y);
  const result = [];

  for (let i = 0; i < a.length - 2; i++) {
    if (a[i] > 0) break;                          // sorted: no way to reach 0
    if (i > 0 && a[i] === a[i - 1]) continue;     // skip duplicate anchors

    let l = i + 1;
    let r = a.length - 1;

    while (l < r) {
      const sum = a[i] + a[l] + a[r];
      if (sum === 0) {
        result.push([a[i], a[l], a[r]]);
        while (l < r && a[l] === a[l + 1]) l++;   // skip duplicates
        while (l < r && a[r] === a[r - 1]) r--;
        l++;
        r--;
      } else if (sum < 0) l++;
      else r--;
    }
  }
  return result;
}

/** Container With Most Water — O(n) time, O(1) space */
function maxArea(height) {
  let left = 0;
  let right = height.length - 1;
  let best = 0;

  while (left < right) {
    const h = Math.min(height[left], height[right]);
    best = Math.max(best, h * (right - left));
    // Move the SHORTER wall — moving the taller one can never help
    if (height[left] < height[right]) left++;
    else right--;
  }
  return best;
}

/** Trapping Rain Water — O(n) time, O(1) space */
function trapRainWater(height) {
  let left = 0;
  let right = height.length - 1;
  let leftMax = 0;
  let rightMax = 0;
  let water = 0;

  while (left < right) {
    if (height[left] < height[right]) {
      // The right side guarantees a taller wall, so leftMax bounds the water
      leftMax = Math.max(leftMax, height[left]);
      water += leftMax - height[left];
      left++;
    } else {
      rightMax = Math.max(rightMax, height[right]);
      water += rightMax - height[right];
      right--;
    }
  }
  return water;
}

/** Remove duplicates from a sorted array in place — O(n) time, O(1) space */
function removeDuplicates(nums) {
  if (!nums.length) return 0;
  let write = 1;
  for (let read = 1; read < nums.length; read++) {
    if (nums[read] !== nums[read - 1]) nums[write++] = nums[read];
  }
  return write;                     // new logical length
}

/** Move zeros to the end, keeping order — O(n) time, O(1) space */
function moveZeroes(nums) {
  let write = 0;
  for (let read = 0; read < nums.length; read++) {
    if (nums[read] !== 0) {
      [nums[write], nums[read]] = [nums[read], nums[write]];
      write++;
    }
  }
  return nums;
}

/** Sort Colors (Dutch National Flag) — O(n) time, one pass */
function sortColors(nums) {
  let low = 0;
  let mid = 0;
  let high = nums.length - 1;

  while (mid <= high) {
    if (nums[mid] === 0) {
      [nums[low], nums[mid]] = [nums[mid], nums[low]];
      low++;
      mid++;
    } else if (nums[mid] === 2) {
      [nums[mid], nums[high]] = [nums[high], nums[mid]];
      high--;                       // don't advance mid — the swapped value is unchecked
    } else {
      mid++;
    }
  }
  return nums;
}

/* ==================================================================
 *  SECTION 2 — SLIDING WINDOW
 * ================================================================== */

/** Maximum sum of a fixed-size window — O(n) time, O(1) space */
function maxSumSubarray(nums, k) {
  if (nums.length < k) return null;

  let windowSum = 0;
  for (let i = 0; i < k; i++) windowSum += nums[i];

  let best = windowSum;
  for (let i = k; i < nums.length; i++) {
    windowSum += nums[i] - nums[i - k];      // slide: add new, drop old
    best = Math.max(best, windowSum);
  }
  return best;
}

/** Longest substring without repeating characters — O(n) time */
function longestUniqueSubstring(s) {
  const lastIndex = new Map();
  let start = 0;
  let best = 0;

  for (let end = 0; end < s.length; end++) {
    const ch = s[end];
    // Only move `start` forward, never backwards
    if (lastIndex.has(ch) && lastIndex.get(ch) >= start) {
      start = lastIndex.get(ch) + 1;
    }
    lastIndex.set(ch, end);
    best = Math.max(best, end - start + 1);
  }
  return best;
}

/** Minimum size subarray with sum >= target — O(n) time */
function minSubArrayLen(target, nums) {
  let start = 0;
  let sum = 0;
  let best = Infinity;

  for (let end = 0; end < nums.length; end++) {
    sum += nums[end];
    while (sum >= target) {           // shrink from the left while still valid
      best = Math.min(best, end - start + 1);
      sum -= nums[start++];
    }
  }
  return best === Infinity ? 0 : best;
}

/** Longest repeating character replacement (k changes allowed) — O(n) */
function characterReplacement(s, k) {
  const count = new Map();
  let start = 0;
  let maxFreq = 0;
  let best = 0;

  for (let end = 0; end < s.length; end++) {
    count.set(s[end], (count.get(s[end]) ?? 0) + 1);
    maxFreq = Math.max(maxFreq, count.get(s[end]));

    // window size - most frequent char = chars we'd need to replace
    while (end - start + 1 - maxFreq > k) {
      count.set(s[start], count.get(s[start]) - 1);
      start++;
    }
    best = Math.max(best, end - start + 1);
  }
  return best;
}

/** Sliding window maximum — O(n) using a monotonic deque */
function maxSlidingWindow(nums, k) {
  const deque = [];        // stores INDICES, values decreasing
  const result = [];

  for (let i = 0; i < nums.length; i++) {
    // Drop indices that have slid out of the window
    while (deque.length && deque[0] <= i - k) deque.shift();
    // Drop indices whose values can never be the max again
    while (deque.length && nums[deque[deque.length - 1]] <= nums[i]) deque.pop();

    deque.push(i);
    if (i >= k - 1) result.push(nums[deque[0]]);
  }
  return result;
}

/* ==================================================================
 *  SECTION 3 — PREFIX SUM
 * ================================================================== */

/** Range sum queries — O(n) build, O(1) per query */
class PrefixSum {
  constructor(nums) {
    this.prefix = [0];
    for (const n of nums) this.prefix.push(this.prefix.at(-1) + n);
  }
  /** Sum of nums[left..right] inclusive */
  rangeSum(left, right) {
    return this.prefix[right + 1] - this.prefix[left];
  }
}

/** Subarray sum equals k — O(n) time, O(n) space */
function subarraySum(nums, k) {
  const counts = new Map([[0, 1]]);   // prefix sum 0 seen once (empty prefix)
  let sum = 0;
  let result = 0;

  for (const n of nums) {
    sum += n;
    // If (sum - k) was seen before, every such prefix forms a valid subarray
    result += counts.get(sum - k) ?? 0;
    counts.set(sum, (counts.get(sum) ?? 0) + 1);
  }
  return result;
}

/** Product of array except self — O(n) time, O(1) extra space */
function productExceptSelf(nums) {
  const n = nums.length;
  const result = new Array(n).fill(1);

  let left = 1;
  for (let i = 0; i < n; i++) {
    result[i] = left;               // product of everything to the LEFT
    left *= nums[i];
  }

  let right = 1;
  for (let i = n - 1; i >= 0; i--) {
    result[i] *= right;             // multiply by everything to the RIGHT
    right *= nums[i];
  }
  return result;
}

/* ==================================================================
 *  SECTION 4 — BINARY SEARCH
 * ================================================================== */

/** Classic binary search — O(log n) */
function binarySearch(nums, target) {
  let lo = 0;
  let hi = nums.length - 1;

  while (lo <= hi) {
    const mid = lo + ((hi - lo) >> 1);      // avoids overflow in other languages
    if (nums[mid] === target) return mid;
    if (nums[mid] < target) lo = mid + 1;
    else hi = mid - 1;
  }
  return -1;
}

/** First index where nums[i] >= target (lower bound) — O(log n) */
function lowerBound(nums, target) {
  let lo = 0;
  let hi = nums.length;
  while (lo < hi) {
    const mid = lo + ((hi - lo) >> 1);
    if (nums[mid] < target) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

/** First index where nums[i] > target (upper bound) */
function upperBound(nums, target) {
  let lo = 0;
  let hi = nums.length;
  while (lo < hi) {
    const mid = lo + ((hi - lo) >> 1);
    if (nums[mid] <= target) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

/** Search in a rotated sorted array — O(log n) */
function searchRotated(nums, target) {
  let lo = 0;
  let hi = nums.length - 1;

  while (lo <= hi) {
    const mid = lo + ((hi - lo) >> 1);
    if (nums[mid] === target) return mid;

    // One half is always sorted — figure out which
    if (nums[lo] <= nums[mid]) {
      // left half sorted
      if (nums[lo] <= target && target < nums[mid]) hi = mid - 1;
      else lo = mid + 1;
    } else {
      // right half sorted
      if (nums[mid] < target && target <= nums[hi]) lo = mid + 1;
      else hi = mid - 1;
    }
  }
  return -1;
}

/** Minimum in a rotated sorted array — O(log n) */
function findMinRotated(nums) {
  let lo = 0;
  let hi = nums.length - 1;
  while (lo < hi) {
    const mid = lo + ((hi - lo) >> 1);
    if (nums[mid] > nums[hi]) lo = mid + 1;   // min is to the right
    else hi = mid;                            // min is at mid or to the left
  }
  return nums[lo];
}

/** Binary search on the ANSWER — Koko eating bananas. O(n log maxPile) */
function minEatingSpeed(piles, hours) {
  const canFinish = (speed) =>
    piles.reduce((total, p) => total + Math.ceil(p / speed), 0) <= hours;

  let lo = 1;
  let hi = Math.max(...piles);
  while (lo < hi) {
    const mid = lo + ((hi - lo) >> 1);
    if (canFinish(mid)) hi = mid;      // try slower
    else lo = mid + 1;                 // need faster
  }
  return lo;
}

/* ==================================================================
 *  SECTION 5 — KADANE & DP-ON-ARRAYS
 * ================================================================== */

/** Maximum subarray sum (Kadane) — O(n) time, O(1) space */
function maxSubArray(nums) {
  let best = -Infinity;
  let current = 0;
  for (const n of nums) {
    // Either extend the previous subarray or start fresh at n
    current = Math.max(n, current + n);
    best = Math.max(best, current);
  }
  return best;
}

/** Kadane with the actual subarray returned */
function maxSubArrayWithIndices(nums) {
  let best = -Infinity;
  let current = 0;
  let start = 0;
  let bestStart = 0;
  let bestEnd = 0;

  for (let i = 0; i < nums.length; i++) {
    if (current + nums[i] < nums[i]) {
      current = nums[i];
      start = i;
    } else {
      current += nums[i];
    }
    if (current > best) {
      best = current;
      bestStart = start;
      bestEnd = i;
    }
  }
  return { sum: best, subarray: nums.slice(bestStart, bestEnd + 1) };
}

/** Maximum product subarray — track BOTH max and min (negatives flip) */
function maxProduct(nums) {
  let best = nums[0];
  let curMax = nums[0];
  let curMin = nums[0];

  for (let i = 1; i < nums.length; i++) {
    const n = nums[i];
    const candidates = [n, curMax * n, curMin * n];
    curMax = Math.max(...candidates);
    curMin = Math.min(...candidates);
    best = Math.max(best, curMax);
  }
  return best;
}

/** Best time to buy and sell stock — O(n) */
function maxProfit(prices) {
  let minPrice = Infinity;
  let profit = 0;
  for (const p of prices) {
    minPrice = Math.min(minPrice, p);
    profit = Math.max(profit, p - minPrice);
  }
  return profit;
}

/** Longest increasing subsequence — O(n log n) with patience sorting */
function lengthOfLIS(nums) {
  const tails = [];       // tails[i] = smallest tail of an increasing subseq of length i+1
  for (const n of nums) {
    const idx = lowerBound(tails, n);
    if (idx === tails.length) tails.push(n);
    else tails[idx] = n;
  }
  return tails.length;    // note: tails is NOT the actual subsequence
}

/* ==================================================================
 *  SECTION 6 — SORTING
 * ================================================================== */

/** Merge sort — O(n log n) time, O(n) space, STABLE */
function mergeSort(arr) {
  if (arr.length <= 1) return arr;
  const mid = arr.length >> 1;
  return merge(mergeSort(arr.slice(0, mid)), mergeSort(arr.slice(mid)));
}

function merge(left, right) {
  const out = [];
  let i = 0;
  let j = 0;
  while (i < left.length && j < right.length) {
    out.push(left[i] <= right[j] ? left[i++] : right[j++]);   // <= keeps it stable
  }
  while (i < left.length) out.push(left[i++]);
  while (j < right.length) out.push(right[j++]);
  return out;
}

/** Quick sort — O(n log n) average, O(n²) worst, O(log n) space */
function quickSort(arr, lo = 0, hi = arr.length - 1) {
  if (lo >= hi) return arr;
  const p = partition(arr, lo, hi);
  quickSort(arr, lo, p - 1);
  quickSort(arr, p + 1, hi);
  return arr;
}

function partition(arr, lo, hi) {
  // Median-of-three pivot avoids the O(n²) worst case on sorted input
  const mid = lo + ((hi - lo) >> 1);
  if (arr[mid] < arr[lo]) [arr[lo], arr[mid]] = [arr[mid], arr[lo]];
  if (arr[hi] < arr[lo]) [arr[lo], arr[hi]] = [arr[hi], arr[lo]];
  if (arr[hi] < arr[mid]) [arr[mid], arr[hi]] = [arr[hi], arr[mid]];
  [arr[mid], arr[hi]] = [arr[hi], arr[mid]];

  const pivot = arr[hi];
  let i = lo;
  for (let j = lo; j < hi; j++) {
    if (arr[j] < pivot) {
      [arr[i], arr[j]] = [arr[j], arr[i]];
      i++;
    }
  }
  [arr[i], arr[hi]] = [arr[hi], arr[i]];
  return i;
}

/** Quickselect — kth smallest in O(n) average */
function quickSelect(arr, k, lo = 0, hi = arr.length - 1) {
  if (lo === hi) return arr[lo];
  const p = partition(arr, lo, hi);
  if (p === k) return arr[p];
  return p > k ? quickSelect(arr, k, lo, p - 1) : quickSelect(arr, k, p + 1, hi);
}

/** Kth largest element */
const findKthLargest = (nums, k) => quickSelect([...nums], nums.length - k);

/** Counting sort — O(n + k), only for small integer ranges */
function countingSort(arr) {
  if (!arr.length) return arr;
  const min = Math.min(...arr);
  const max = Math.max(...arr);
  const counts = new Array(max - min + 1).fill(0);

  for (const n of arr) counts[n - min]++;

  const out = [];
  for (let i = 0; i < counts.length; i++) {
    for (let c = 0; c < counts[i]; c++) out.push(i + min);
  }
  return out;
}

/* ==================================================================
 *  SECTION 7 — INTERVALS
 * ================================================================== */

/** Merge overlapping intervals — O(n log n) */
function mergeIntervals(intervals) {
  if (!intervals.length) return [];
  const sorted = [...intervals].sort((a, b) => a[0] - b[0]);
  const result = [sorted[0].slice()];

  for (const [start, end] of sorted.slice(1)) {
    const last = result[result.length - 1];
    if (start <= last[1]) last[1] = Math.max(last[1], end);   // overlap → extend
    else result.push([start, end]);
  }
  return result;
}

/** Insert an interval into a sorted non-overlapping list — O(n) */
function insertInterval(intervals, newInterval) {
  const result = [];
  let [start, end] = newInterval;
  let i = 0;

  while (i < intervals.length && intervals[i][1] < start) result.push(intervals[i++]);

  while (i < intervals.length && intervals[i][0] <= end) {
    start = Math.min(start, intervals[i][0]);
    end = Math.max(end, intervals[i][1]);
    i++;
  }
  result.push([start, end]);

  while (i < intervals.length) result.push(intervals[i++]);
  return result;
}

/** Minimum meeting rooms required — O(n log n) */
function minMeetingRooms(intervals) {
  const starts = intervals.map((i) => i[0]).sort((a, b) => a - b);
  const ends = intervals.map((i) => i[1]).sort((a, b) => a - b);

  let rooms = 0;
  let maxRooms = 0;
  let s = 0;
  let e = 0;

  while (s < starts.length) {
    if (starts[s] < ends[e]) {
      rooms++;
      s++;
      maxRooms = Math.max(maxRooms, rooms);
    } else {
      rooms--;
      e++;
    }
  }
  return maxRooms;
}

/** Can a person attend all meetings? */
const canAttendMeetings = (intervals) =>
  [...intervals].sort((a, b) => a[0] - b[0]).every((iv, i, arr) => i === 0 || arr[i - 1][1] <= iv[0]);

/* ==================================================================
 *  SECTION 8 — MATRIX
 * ================================================================== */

/** Rotate a square matrix 90° clockwise, in place — O(n²) */
function rotateMatrix(matrix) {
  const n = matrix.length;
  // Transpose
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      [matrix[i][j], matrix[j][i]] = [matrix[j][i], matrix[i][j]];
    }
  }
  // Reverse each row
  for (const row of matrix) row.reverse();
  return matrix;
}

/** Spiral traversal — O(m×n) */
function spiralOrder(matrix) {
  if (!matrix.length) return [];
  const result = [];
  let top = 0;
  let bottom = matrix.length - 1;
  let left = 0;
  let right = matrix[0].length - 1;

  while (top <= bottom && left <= right) {
    for (let i = left; i <= right; i++) result.push(matrix[top][i]);
    top++;

    for (let i = top; i <= bottom; i++) result.push(matrix[i][right]);
    right--;

    if (top <= bottom) {
      for (let i = right; i >= left; i--) result.push(matrix[bottom][i]);
      bottom--;
    }
    if (left <= right) {
      for (let i = bottom; i >= top; i--) result.push(matrix[i][left]);
      left++;
    }
  }
  return result;
}

/** Set matrix zeros — O(1) extra space using the first row/column as markers */
function setZeroes(matrix) {
  const rows = matrix.length;
  const cols = matrix[0].length;
  let firstRowZero = matrix[0].some((v) => v === 0);
  let firstColZero = matrix.some((row) => row[0] === 0);

  for (let i = 1; i < rows; i++) {
    for (let j = 1; j < cols; j++) {
      if (matrix[i][j] === 0) {
        matrix[i][0] = 0;
        matrix[0][j] = 0;
      }
    }
  }

  for (let i = 1; i < rows; i++) {
    for (let j = 1; j < cols; j++) {
      if (matrix[i][0] === 0 || matrix[0][j] === 0) matrix[i][j] = 0;
    }
  }

  if (firstRowZero) matrix[0].fill(0);
  if (firstColZero) for (let i = 0; i < rows; i++) matrix[i][0] = 0;
  return matrix;
}

/** Search a 2D matrix (rows sorted, first of each row > last of previous) — O(log mn) */
function searchMatrix(matrix, target) {
  const rows = matrix.length;
  const cols = matrix[0].length;
  let lo = 0;
  let hi = rows * cols - 1;

  while (lo <= hi) {
    const mid = lo + ((hi - lo) >> 1);
    const value = matrix[Math.floor(mid / cols)][mid % cols];   // treat as 1D
    if (value === target) return true;
    if (value < target) lo = mid + 1;
    else hi = mid - 1;
  }
  return false;
}

/** Number of islands (DFS flood fill) — O(m×n) */
function numIslands(grid) {
  if (!grid.length) return 0;
  const rows = grid.length;
  const cols = grid[0].length;
  let count = 0;

  const sink = (r, c) => {
    if (r < 0 || c < 0 || r >= rows || c >= cols || grid[r][c] !== '1') return;
    grid[r][c] = '0';                 // mark visited
    sink(r + 1, c);
    sink(r - 1, c);
    sink(r, c + 1);
    sink(r, c - 1);
  };

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (grid[r][c] === '1') {
        count++;
        sink(r, c);
      }
    }
  }
  return count;
}

/* ==================================================================
 *  SECTION 9 — MISC CLASSICS
 * ================================================================== */

/** Majority element (Boyer-Moore voting) — O(n) time, O(1) space */
function majorityElement(nums) {
  let candidate = null;
  let count = 0;
  for (const n of nums) {
    if (count === 0) candidate = n;
    count += n === candidate ? 1 : -1;
  }
  return candidate;      // valid only if a majority is guaranteed to exist
}

/** Missing number in 0..n — XOR, no overflow risk */
function missingNumber(nums) {
  let xor = nums.length;
  for (let i = 0; i < nums.length; i++) xor ^= i ^ nums[i];
  return xor;
}

/** Find the duplicate (Floyd's cycle detection) — O(n) time, O(1) space */
function findDuplicate(nums) {
  let slow = nums[0];
  let fast = nums[0];
  do {
    slow = nums[slow];
    fast = nums[nums[fast]];
  } while (slow !== fast);

  slow = nums[0];
  while (slow !== fast) {
    slow = nums[slow];
    fast = nums[fast];
  }
  return slow;
}

/** Longest consecutive sequence — O(n) with a Set */
function longestConsecutive(nums) {
  const set = new Set(nums);
  let best = 0;

  for (const n of set) {
    if (set.has(n - 1)) continue;      // only start counting at sequence heads
    let length = 1;
    while (set.has(n + length)) length++;
    best = Math.max(best, length);
  }
  return best;
}

/** Rotate an array right by k — O(n) time, O(1) space via triple reversal */
function rotateArray(nums, k) {
  const n = nums.length;
  k = ((k % n) + n) % n;

  const reverse = (start, end) => {
    while (start < end) {
      [nums[start], nums[end]] = [nums[end], nums[start]];
      start++;
      end--;
    }
  };

  reverse(0, n - 1);
  reverse(0, k - 1);
  reverse(k, n - 1);
  return nums;
}

/** Next permutation — O(n) */
function nextPermutation(nums) {
  let i = nums.length - 2;
  while (i >= 0 && nums[i] >= nums[i + 1]) i--;     // find the first descent

  if (i >= 0) {
    let j = nums.length - 1;
    while (nums[j] <= nums[i]) j--;                 // find the next bigger element
    [nums[i], nums[j]] = [nums[j], nums[i]];
  }

  // Reverse the suffix to get the smallest arrangement
  let left = i + 1;
  let right = nums.length - 1;
  while (left < right) {
    [nums[left], nums[right]] = [nums[right], nums[left]];
    left++;
    right--;
  }
  return nums;
}

/* ==================================================================
 *  TESTS
 * ================================================================== */
function runTests() {
  let passed = 0;
  let failed = 0;

  const eq = (actual, expected) => JSON.stringify(actual) === JSON.stringify(expected);
  const test = (name, actual, expected) => {
    if (eq(actual, expected)) {
      passed++;
      console.log(`  ✅ ${name}`);
    } else {
      failed++;
      console.log(`  ❌ ${name}\n     expected: ${JSON.stringify(expected)}\n     got:      ${JSON.stringify(actual)}`);
    }
  };

  console.log('\n=== TWO POINTERS ===');
  test('twoSumSorted', twoSumSorted([2, 7, 11, 15], 9), [0, 1]);
  test('twoSumHash', twoSumHash([3, 2, 4], 6), [1, 2]);
  test('threeSum', threeSum([-1, 0, 1, 2, -1, -4]), [[-1, -1, 2], [-1, 0, 1]]);
  test('maxArea', maxArea([1, 8, 6, 2, 5, 4, 8, 3, 7]), 49);
  test('trapRainWater', trapRainWater([0, 1, 0, 2, 1, 0, 1, 3, 2, 1, 2, 1]), 6);
  test('removeDuplicates', removeDuplicates([1, 1, 2, 2, 3]), 3);
  test('moveZeroes', moveZeroes([0, 1, 0, 3, 12]), [1, 3, 12, 0, 0]);
  test('sortColors', sortColors([2, 0, 2, 1, 1, 0]), [0, 0, 1, 1, 2, 2]);

  console.log('\n=== SLIDING WINDOW ===');
  test('maxSumSubarray', maxSumSubarray([2, 1, 5, 1, 3, 2], 3), 9);
  test('longestUniqueSubstring', longestUniqueSubstring('abcabcbb'), 3);
  test('longestUniqueSubstring pwwkew', longestUniqueSubstring('pwwkew'), 3);
  test('minSubArrayLen', minSubArrayLen(7, [2, 3, 1, 2, 4, 3]), 2);
  test('characterReplacement', characterReplacement('AABABBA', 1), 4);
  test('maxSlidingWindow', maxSlidingWindow([1, 3, -1, -3, 5, 3, 6, 7], 3), [3, 3, 5, 5, 6, 7]);

  console.log('\n=== PREFIX SUM ===');
  const ps = new PrefixSum([1, 2, 3, 4, 5]);
  test('PrefixSum.rangeSum(1,3)', ps.rangeSum(1, 3), 9);
  test('subarraySum', subarraySum([1, 1, 1], 2), 2);
  test('subarraySum negatives', subarraySum([1, -1, 0], 0), 3);
  test('productExceptSelf', productExceptSelf([1, 2, 3, 4]), [24, 12, 8, 6]);

  console.log('\n=== BINARY SEARCH ===');
  test('binarySearch', binarySearch([1, 3, 5, 7, 9], 7), 3);
  test('binarySearch missing', binarySearch([1, 3, 5], 4), -1);
  test('lowerBound', lowerBound([1, 2, 2, 2, 3], 2), 1);
  test('upperBound', upperBound([1, 2, 2, 2, 3], 2), 4);
  test('searchRotated', searchRotated([4, 5, 6, 7, 0, 1, 2], 0), 4);
  test('findMinRotated', findMinRotated([4, 5, 6, 7, 0, 1, 2]), 0);
  test('minEatingSpeed', minEatingSpeed([3, 6, 7, 11], 8), 4);

  console.log('\n=== KADANE / DP ===');
  test('maxSubArray', maxSubArray([-2, 1, -3, 4, -1, 2, 1, -5, 4]), 6);
  test('maxSubArrayWithIndices', maxSubArrayWithIndices([-2, 1, -3, 4, -1, 2, 1, -5, 4]).subarray, [4, -1, 2, 1]);
  test('maxProduct', maxProduct([2, 3, -2, 4]), 6);
  test('maxProduct negatives', maxProduct([-2, 0, -1]), 0);
  test('maxProfit', maxProfit([7, 1, 5, 3, 6, 4]), 5);
  test('lengthOfLIS', lengthOfLIS([10, 9, 2, 5, 3, 7, 101, 18]), 4);

  console.log('\n=== SORTING ===');
  test('mergeSort', mergeSort([5, 2, 9, 1, 7, 3]), [1, 2, 3, 5, 7, 9]);
  test('quickSort', quickSort([5, 2, 9, 1, 7, 3]), [1, 2, 3, 5, 7, 9]);
  test('quickSort sorted input', quickSort([1, 2, 3, 4, 5]), [1, 2, 3, 4, 5]);
  test('findKthLargest', findKthLargest([3, 2, 1, 5, 6, 4], 2), 5);
  test('countingSort', countingSort([4, 2, 2, 8, 3, 3, 1]), [1, 2, 2, 3, 3, 4, 8]);

  console.log('\n=== INTERVALS ===');
  test('mergeIntervals', mergeIntervals([[1, 3], [2, 6], [8, 10], [15, 18]]), [[1, 6], [8, 10], [15, 18]]);
  test('insertInterval', insertInterval([[1, 3], [6, 9]], [2, 5]), [[1, 5], [6, 9]]);
  test('minMeetingRooms', minMeetingRooms([[0, 30], [5, 10], [15, 20]]), 2);
  test('canAttendMeetings', canAttendMeetings([[7, 10], [2, 4]]), true);

  console.log('\n=== MATRIX ===');
  test('rotateMatrix', rotateMatrix([[1, 2, 3], [4, 5, 6], [7, 8, 9]]), [[7, 4, 1], [8, 5, 2], [9, 6, 3]]);
  test('spiralOrder', spiralOrder([[1, 2, 3], [4, 5, 6], [7, 8, 9]]), [1, 2, 3, 6, 9, 8, 7, 4, 5]);
  test('setZeroes', setZeroes([[1, 1, 1], [1, 0, 1], [1, 1, 1]]), [[1, 0, 1], [0, 0, 0], [1, 0, 1]]);
  test('searchMatrix', searchMatrix([[1, 3, 5, 7], [10, 11, 16, 20], [23, 30, 34, 60]], 3), true);
  test('numIslands', numIslands([
    ['1', '1', '0', '0'],
    ['1', '1', '0', '0'],
    ['0', '0', '1', '0'],
    ['0', '0', '0', '1'],
  ]), 3);

  console.log('\n=== MISC ===');
  test('majorityElement', majorityElement([2, 2, 1, 1, 1, 2, 2]), 2);
  test('missingNumber', missingNumber([3, 0, 1]), 2);
  test('findDuplicate', findDuplicate([1, 3, 4, 2, 2]), 2);
  test('longestConsecutive', longestConsecutive([100, 4, 200, 1, 3, 2]), 4);
  test('rotateArray', rotateArray([1, 2, 3, 4, 5, 6, 7], 3), [5, 6, 7, 1, 2, 3, 4]);
  test('nextPermutation', nextPermutation([1, 2, 3]), [1, 3, 2]);
  test('nextPermutation last', nextPermutation([3, 2, 1]), [1, 2, 3]);

  console.log(`\n${'='.repeat(50)}`);
  console.log(`  ${passed} passed, ${failed} failed`);
  console.log('='.repeat(50));
  if (failed > 0) process.exitCode = 1;
}

if (require.main === module) runTests();

module.exports = {
  twoSumSorted, twoSumHash, threeSum, maxArea, trapRainWater, removeDuplicates,
  moveZeroes, sortColors, maxSumSubarray, longestUniqueSubstring, minSubArrayLen,
  characterReplacement, maxSlidingWindow, PrefixSum, subarraySum, productExceptSelf,
  binarySearch, lowerBound, upperBound, searchRotated, findMinRotated, minEatingSpeed,
  maxSubArray, maxSubArrayWithIndices, maxProduct, maxProfit, lengthOfLIS,
  mergeSort, quickSort, quickSelect, findKthLargest, countingSort,
  mergeIntervals, insertInterval, minMeetingRooms, canAttendMeetings,
  rotateMatrix, spiralOrder, setZeroes, searchMatrix, numIslands,
  majorityElement, missingNumber, findDuplicate, longestConsecutive,
  rotateArray, nextPermutation,
};
