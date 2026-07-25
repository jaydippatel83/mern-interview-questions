/**
 * ============================================================
 *  DSA — STRINGS
 * ============================================================
 *  Palindromes · Anagrams · Sliding window · Pattern matching
 *  Parsing · Dynamic programming · Trie
 *
 *  Run:  node strings.js
 * ============================================================
 */

/* ==================================================================
 *  SECTION 1 — PALINDROMES
 * ================================================================== */

/** Valid palindrome (alphanumeric only) — O(n) time, O(1) space */
function isPalindrome(s) {
  const isAlnum = (c) => /[a-z0-9]/i.test(c);
  let left = 0;
  let right = s.length - 1;

  while (left < right) {
    while (left < right && !isAlnum(s[left])) left++;
    while (left < right && !isAlnum(s[right])) right--;
    if (s[left].toLowerCase() !== s[right].toLowerCase()) return false;
    left++;
    right--;
  }
  return true;
}

/** Valid palindrome allowing ONE deletion — O(n) */
function validPalindromeII(s) {
  const check = (l, r) => {
    while (l < r) {
      if (s[l] !== s[r]) return false;
      l++;
      r--;
    }
    return true;
  };

  let left = 0;
  let right = s.length - 1;
  while (left < right) {
    if (s[left] !== s[right]) {
      // Try skipping either side
      return check(left + 1, right) || check(left, right - 1);
    }
    left++;
    right--;
  }
  return true;
}

/** Longest palindromic substring — expand around centre, O(n²) time, O(1) space */
function longestPalindrome(s) {
  if (s.length < 2) return s;
  let start = 0;
  let maxLen = 1;

  const expand = (l, r) => {
    while (l >= 0 && r < s.length && s[l] === s[r]) {
      if (r - l + 1 > maxLen) {
        start = l;
        maxLen = r - l + 1;
      }
      l--;
      r++;
    }
  };

  for (let i = 0; i < s.length; i++) {
    expand(i, i);        // odd length centre
    expand(i, i + 1);    // even length centre
  }
  return s.slice(start, start + maxLen);
}

/** Count all palindromic substrings — O(n²) */
function countSubstrings(s) {
  let count = 0;
  const expand = (l, r) => {
    while (l >= 0 && r < s.length && s[l] === s[r]) {
      count++;
      l--;
      r++;
    }
  };
  for (let i = 0; i < s.length; i++) {
    expand(i, i);
    expand(i, i + 1);
  }
  return count;
}

/** Can the characters form a palindrome? — O(n) */
function canFormPalindrome(s) {
  const counts = new Map();
  for (const ch of s) counts.set(ch, (counts.get(ch) ?? 0) + 1);
  // At most ONE character may have an odd count (the middle)
  let odd = 0;
  for (const c of counts.values()) if (c % 2) odd++;
  return odd <= 1;
}

/* ==================================================================
 *  SECTION 2 — ANAGRAMS & FREQUENCY
 * ================================================================== */

/** Valid anagram — O(n) time, O(1) space (fixed alphabet) */
function isAnagram(s, t) {
  if (s.length !== t.length) return false;
  const counts = new Map();
  for (const ch of s) counts.set(ch, (counts.get(ch) ?? 0) + 1);
  for (const ch of t) {
    const c = counts.get(ch);
    if (!c) return false;
    counts.set(ch, c - 1);
  }
  return true;
}

/** Group anagrams — O(n · k log k) where k is the average word length */
function groupAnagrams(words) {
  const groups = new Map();
  for (const word of words) {
    const key = [...word].sort().join('');
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(word);
  }
  return [...groups.values()];
}

/** Find all anagram start indices of p in s — sliding window, O(n) */
function findAnagrams(s, p) {
  if (p.length > s.length) return [];

  const need = new Array(26).fill(0);
  const window = new Array(26).fill(0);
  const idx = (c) => c.charCodeAt(0) - 97;

  for (const ch of p) need[idx(ch)]++;

  const result = [];
  for (let i = 0; i < s.length; i++) {
    window[idx(s[i])]++;
    if (i >= p.length) window[idx(s[i - p.length])]--;    // slide

    if (i >= p.length - 1 && need.every((v, j) => v === window[j])) {
      result.push(i - p.length + 1);
    }
  }
  return result;
}

/** First unique character — O(n) */
function firstUniqChar(s) {
  const counts = new Map();
  for (const ch of s) counts.set(ch, (counts.get(ch) ?? 0) + 1);
  for (let i = 0; i < s.length; i++) if (counts.get(s[i]) === 1) return i;
  return -1;
}

/** Top K frequent words — O(n log n) */
function topKFrequent(words, k) {
  const counts = new Map();
  for (const w of words) counts.set(w, (counts.get(w) ?? 0) + 1);

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))   // freq desc, then alphabetical
    .slice(0, k)
    .map(([word]) => word);
}

/** Ransom note — can note be built from magazine letters? O(n) */
function canConstruct(note, magazine) {
  const counts = new Map();
  for (const ch of magazine) counts.set(ch, (counts.get(ch) ?? 0) + 1);
  for (const ch of note) {
    const c = counts.get(ch);
    if (!c) return false;
    counts.set(ch, c - 1);
  }
  return true;
}

/* ==================================================================
 *  SECTION 3 — SLIDING WINDOW ON STRINGS
 * ================================================================== */

/** Longest substring without repeating characters — O(n) */
function lengthOfLongestSubstring(s) {
  const lastSeen = new Map();
  let start = 0;
  let best = 0;

  for (let end = 0; end < s.length; end++) {
    const ch = s[end];
    if (lastSeen.has(ch) && lastSeen.get(ch) >= start) {
      start = lastSeen.get(ch) + 1;
    }
    lastSeen.set(ch, end);
    best = Math.max(best, end - start + 1);
  }
  return best;
}

/** Minimum window substring containing all of t — O(n) */
function minWindow(s, t) {
  if (!s || !t || s.length < t.length) return '';

  const need = new Map();
  for (const ch of t) need.set(ch, (need.get(ch) ?? 0) + 1);

  let required = need.size;      // distinct chars still to satisfy
  let formed = 0;
  const window = new Map();

  let start = 0;
  let best = [Infinity, 0, 0];   // [length, left, right]

  for (let end = 0; end < s.length; end++) {
    const ch = s[end];
    window.set(ch, (window.get(ch) ?? 0) + 1);
    if (need.has(ch) && window.get(ch) === need.get(ch)) formed++;

    // Shrink while the window is still valid
    while (formed === required) {
      if (end - start + 1 < best[0]) best = [end - start + 1, start, end];

      const leftCh = s[start];
      window.set(leftCh, window.get(leftCh) - 1);
      if (need.has(leftCh) && window.get(leftCh) < need.get(leftCh)) formed--;
      start++;
    }
  }

  return best[0] === Infinity ? '' : s.slice(best[1], best[2] + 1);
}

/** Longest substring with at most K distinct characters — O(n) */
function longestKDistinct(s, k) {
  if (k === 0) return 0;
  const counts = new Map();
  let start = 0;
  let best = 0;

  for (let end = 0; end < s.length; end++) {
    counts.set(s[end], (counts.get(s[end]) ?? 0) + 1);

    while (counts.size > k) {
      const ch = s[start];
      counts.set(ch, counts.get(ch) - 1);
      if (counts.get(ch) === 0) counts.delete(ch);
      start++;
    }
    best = Math.max(best, end - start + 1);
  }
  return best;
}

/** Permutation in string — does s2 contain a permutation of s1? O(n) */
function checkInclusion(s1, s2) {
  return findAnagrams(s2, s1).length > 0;
}

/* ==================================================================
 *  SECTION 4 — PATTERN MATCHING
 * ================================================================== */

/** Naive substring search — O(n·m) */
function strStrNaive(haystack, needle) {
  if (!needle) return 0;
  for (let i = 0; i + needle.length <= haystack.length; i++) {
    let j = 0;
    while (j < needle.length && haystack[i + j] === needle[j]) j++;
    if (j === needle.length) return i;
  }
  return -1;
}

/** KMP substring search — O(n + m) */
function strStrKMP(haystack, needle) {
  if (!needle) return 0;
  if (needle.length > haystack.length) return -1;

  // Build the LPS (longest proper prefix that is also a suffix) table
  const lps = new Array(needle.length).fill(0);
  let len = 0;
  let i = 1;
  while (i < needle.length) {
    if (needle[i] === needle[len]) {
      lps[i++] = ++len;
    } else if (len > 0) {
      len = lps[len - 1];              // fall back, don't restart
    } else {
      lps[i++] = 0;
    }
  }

  // Search using the table — never re-examine haystack characters
  let h = 0;
  let n = 0;
  while (h < haystack.length) {
    if (haystack[h] === needle[n]) {
      h++;
      n++;
      if (n === needle.length) return h - n;
    } else if (n > 0) {
      n = lps[n - 1];
    } else {
      h++;
    }
  }
  return -1;
}

/** Rabin-Karp rolling hash search — O(n + m) average */
function strStrRabinKarp(haystack, needle) {
  if (!needle) return 0;
  const m = needle.length;
  const n = haystack.length;
  if (m > n) return -1;

  const BASE = 256;
  const MOD = 1_000_000_007;

  let highOrder = 1;
  for (let i = 0; i < m - 1; i++) highOrder = (highOrder * BASE) % MOD;

  let needleHash = 0;
  let windowHash = 0;
  for (let i = 0; i < m; i++) {
    needleHash = (needleHash * BASE + needle.charCodeAt(i)) % MOD;
    windowHash = (windowHash * BASE + haystack.charCodeAt(i)) % MOD;
  }

  for (let i = 0; i <= n - m; i++) {
    if (windowHash === needleHash && haystack.slice(i, i + m) === needle) return i;

    if (i < n - m) {
      // Roll: remove the leading char, add the trailing one
      windowHash =
        ((windowHash - haystack.charCodeAt(i) * highOrder) * BASE +
          haystack.charCodeAt(i + m)) % MOD;
      if (windowHash < 0) windowHash += MOD;
    }
  }
  return -1;
}

/** Wildcard pattern matching (? and *) — DP, O(n·m) */
function isMatchWildcard(s, p) {
  const dp = Array.from({ length: s.length + 1 }, () =>
    new Array(p.length + 1).fill(false)
  );
  dp[0][0] = true;

  for (let j = 1; j <= p.length; j++) {
    if (p[j - 1] === '*') dp[0][j] = dp[0][j - 1];
  }

  for (let i = 1; i <= s.length; i++) {
    for (let j = 1; j <= p.length; j++) {
      if (p[j - 1] === '*') {
        dp[i][j] = dp[i - 1][j] || dp[i][j - 1];        // match many or zero
      } else if (p[j - 1] === '?' || p[j - 1] === s[i - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      }
    }
  }
  return dp[s.length][p.length];
}

/* ==================================================================
 *  SECTION 5 — PARSING & MANIPULATION
 * ================================================================== */

/** Reverse words in a string — O(n) */
const reverseWords = (s) => s.trim().split(/\s+/).reverse().join(' ');

/** Valid parentheses — O(n) with a stack */
function isValidParentheses(s) {
  const pairs = { ')': '(', ']': '[', '}': '{' };
  const stack = [];

  for (const ch of s) {
    if (ch === '(' || ch === '[' || ch === '{') {
      stack.push(ch);
    } else if (pairs[ch]) {
      if (stack.pop() !== pairs[ch]) return false;
    }
  }
  return stack.length === 0;
}

/** Longest valid parentheses substring — O(n) with a stack of indices */
function longestValidParentheses(s) {
  const stack = [-1];      // sentinel base index
  let best = 0;

  for (let i = 0; i < s.length; i++) {
    if (s[i] === '(') {
      stack.push(i);
    } else {
      stack.pop();
      if (stack.length === 0) stack.push(i);    // new base
      else best = Math.max(best, i - stack[stack.length - 1]);
    }
  }
  return best;
}

/** Minimum removals to make parentheses valid — O(n) */
function minRemoveToMakeValid(s) {
  const chars = [...s];
  const stack = [];

  for (let i = 0; i < chars.length; i++) {
    if (chars[i] === '(') stack.push(i);
    else if (chars[i] === ')') {
      if (stack.length) stack.pop();
      else chars[i] = '';                       // unmatched closer
    }
  }
  for (const i of stack) chars[i] = '';         // unmatched openers
  return chars.join('');
}

/** String to integer (atoi) — handles whitespace, sign, overflow */
function myAtoi(s) {
  const INT_MAX = 2 ** 31 - 1;
  const INT_MIN = -(2 ** 31);

  let i = 0;
  while (i < s.length && s[i] === ' ') i++;

  let sign = 1;
  if (s[i] === '+' || s[i] === '-') {
    sign = s[i] === '-' ? -1 : 1;
    i++;
  }

  let num = 0;
  while (i < s.length && s[i] >= '0' && s[i] <= '9') {
    num = num * 10 + (s.charCodeAt(i) - 48);
    if (sign * num <= INT_MIN) return INT_MIN;
    if (sign * num >= INT_MAX) return INT_MAX;
    i++;
  }
  return sign * num;
}

/** Compress a string (run-length) — O(n) */
function compressString(s) {
  if (!s) return s;
  let out = '';
  let count = 1;

  for (let i = 1; i <= s.length; i++) {
    if (i < s.length && s[i] === s[i - 1]) {
      count++;
    } else {
      out += s[i - 1] + (count > 1 ? count : '');
      count = 1;
    }
  }
  return out.length < s.length ? out : s;
}

/** Longest common prefix — O(n·m) */
function longestCommonPrefix(strs) {
  if (!strs.length) return '';
  let prefix = strs[0];
  for (let i = 1; i < strs.length; i++) {
    while (!strs[i].startsWith(prefix)) {
      prefix = prefix.slice(0, -1);
      if (!prefix) return '';
    }
  }
  return prefix;
}

/** Encode and decode a list of strings (length-prefixed) */
const encodeStrings = (strs) => strs.map((s) => `${s.length}#${s}`).join('');

function decodeStrings(encoded) {
  const result = [];
  let i = 0;
  while (i < encoded.length) {
    let j = i;
    while (encoded[j] !== '#') j++;
    const len = Number(encoded.slice(i, j));
    result.push(encoded.slice(j + 1, j + 1 + len));
    i = j + 1 + len;
  }
  return result;
}

/** Roman numeral conversions */
function intToRoman(num) {
  const map = [
    [1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'],
    [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'],
    [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I'],
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

function romanToInt(s) {
  const values = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };
  let total = 0;
  for (let i = 0; i < s.length; i++) {
    // Subtractive notation: IV, IX, XL, XC, CD, CM
    total += values[s[i + 1]] > values[s[i]] ? -values[s[i]] : values[s[i]];
  }
  return total;
}

/** Basic calculator (+, -, *, / with precedence) — O(n) with a stack */
function calculate(s) {
  const stack = [];
  let num = 0;
  let sign = '+';

  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (ch >= '0' && ch <= '9') num = num * 10 + Number(ch);

    if ((ch < '0' && ch !== ' ') || i === s.length - 1) {
      if (sign === '+') stack.push(num);
      else if (sign === '-') stack.push(-num);
      else if (sign === '*') stack.push(stack.pop() * num);
      else if (sign === '/') stack.push(Math.trunc(stack.pop() / num));
      sign = ch;
      num = 0;
    }
  }
  return stack.reduce((a, b) => a + b, 0);
}

/* ==================================================================
 *  SECTION 6 — DYNAMIC PROGRAMMING ON STRINGS
 * ================================================================== */

/** Edit distance (Levenshtein) — O(n·m) time, O(min(n,m)) space possible */
function editDistance(word1, word2) {
  const m = word1.length;
  const n = word2.length;
  const dp = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] =
        word1[i - 1] === word2[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(
              dp[i - 1][j],       // delete
              dp[i][j - 1],       // insert
              dp[i - 1][j - 1]    // replace
            );
    }
  }
  return dp[m][n];
}

/** Longest common subsequence — O(n·m) */
function longestCommonSubsequence(a, b) {
  const dp = Array.from({ length: a.length + 1 }, () =>
    new Array(b.length + 1).fill(0)
  );

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1] + 1
          : Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }
  return dp[a.length][b.length];
}

/** Word break — can s be segmented into dictionary words? O(n²·k) */
function wordBreak(s, wordDict) {
  const words = new Set(wordDict);
  const dp = new Array(s.length + 1).fill(false);
  dp[0] = true;

  for (let i = 1; i <= s.length; i++) {
    for (let j = 0; j < i; j++) {
      if (dp[j] && words.has(s.slice(j, i))) {
        dp[i] = true;
        break;
      }
    }
  }
  return dp[s.length];
}

/** Decode ways (A=1..Z=26) — O(n) */
function numDecodings(s) {
  if (!s || s[0] === '0') return 0;

  let prev2 = 1;    // ways to decode s[0..i-2]
  let prev1 = 1;    // ways to decode s[0..i-1]

  for (let i = 1; i < s.length; i++) {
    let current = 0;
    if (s[i] !== '0') current += prev1;                       // single digit
    const two = Number(s.slice(i - 1, i + 1));
    if (two >= 10 && two <= 26) current += prev2;             // two digits
    prev2 = prev1;
    prev1 = current;
  }
  return prev1;
}

/* ==================================================================
 *  SECTION 7 — TRIE
 * ================================================================== */

class TrieNode {
  constructor() {
    this.children = new Map();
    this.isEnd = false;
  }
}

/** Prefix tree — O(m) insert/search where m is the word length */
class Trie {
  constructor() {
    this.root = new TrieNode();
  }

  insert(word) {
    let node = this.root;
    for (const ch of word) {
      if (!node.children.has(ch)) node.children.set(ch, new TrieNode());
      node = node.children.get(ch);
    }
    node.isEnd = true;
    return this;
  }

  #traverse(prefix) {
    let node = this.root;
    for (const ch of prefix) {
      if (!node.children.has(ch)) return null;
      node = node.children.get(ch);
    }
    return node;
  }

  search(word) {
    return this.#traverse(word)?.isEnd ?? false;
  }

  startsWith(prefix) {
    return this.#traverse(prefix) !== null;
  }

  /** All words with the given prefix — autocomplete */
  wordsWithPrefix(prefix, limit = 10) {
    const node = this.#traverse(prefix);
    if (!node) return [];

    const results = [];
    const dfs = (n, path) => {
      if (results.length >= limit) return;
      if (n.isEnd) results.push(prefix + path);
      for (const [ch, child] of n.children) dfs(child, path + ch);
    };
    dfs(node, '');
    return results;
  }

  /** Search with '.' as a single-character wildcard */
  searchPattern(pattern) {
    const dfs = (node, i) => {
      if (i === pattern.length) return node.isEnd;
      const ch = pattern[i];

      if (ch === '.') {
        for (const child of node.children.values()) {
          if (dfs(child, i + 1)) return true;
        }
        return false;
      }
      const child = node.children.get(ch);
      return child ? dfs(child, i + 1) : false;
    };
    return dfs(this.root, 0);
  }
}

/* ==================================================================
 *  TESTS
 * ================================================================== */
function runTests() {
  let passed = 0;
  let failed = 0;

  const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  const test = (name, actual, expected) => {
    if (eq(actual, expected)) {
      passed++;
      console.log(`  ✅ ${name}`);
    } else {
      failed++;
      console.log(`  ❌ ${name}\n     expected: ${JSON.stringify(expected)}\n     got:      ${JSON.stringify(actual)}`);
    }
  };

  console.log('\n=== PALINDROMES ===');
  test('isPalindrome', isPalindrome('A man, a plan, a canal: Panama'), true);
  test('isPalindrome false', isPalindrome('race a car'), false);
  test('validPalindromeII', validPalindromeII('abca'), true);
  test('longestPalindrome', longestPalindrome('babad'), 'bab');
  test('longestPalindrome even', longestPalindrome('cbbd'), 'bb');
  test('countSubstrings', countSubstrings('aaa'), 6);
  test('canFormPalindrome', canFormPalindrome('carerac'), true);

  console.log('\n=== ANAGRAMS ===');
  test('isAnagram', isAnagram('listen', 'silent'), true);
  test('isAnagram false', isAnagram('rat', 'car'), false);
  test('groupAnagrams', groupAnagrams(['eat', 'tea', 'tan', 'ate', 'nat', 'bat']),
    [['eat', 'tea', 'ate'], ['tan', 'nat'], ['bat']]);
  test('findAnagrams', findAnagrams('cbaebabacd', 'abc'), [0, 6]);
  test('firstUniqChar', firstUniqChar('loveleetcode'), 2);
  test('topKFrequent', topKFrequent(['i', 'love', 'leetcode', 'i', 'love', 'coding'], 2), ['i', 'love']);
  test('canConstruct', canConstruct('aa', 'aab'), true);

  console.log('\n=== SLIDING WINDOW ===');
  test('lengthOfLongestSubstring', lengthOfLongestSubstring('abcabcbb'), 3);
  test('lengthOfLongestSubstring bbbbb', lengthOfLongestSubstring('bbbbb'), 1);
  test('minWindow', minWindow('ADOBECODEBANC', 'ABC'), 'BANC');
  test('minWindow no match', minWindow('a', 'aa'), '');
  test('longestKDistinct', longestKDistinct('eceba', 2), 3);
  test('checkInclusion', checkInclusion('ab', 'eidbaooo'), true);

  console.log('\n=== PATTERN MATCHING ===');
  test('strStrNaive', strStrNaive('hello', 'll'), 2);
  test('strStrKMP', strStrKMP('sadbutsad', 'sad'), 0);
  test('strStrKMP not found', strStrKMP('leetcode', 'leeto'), -1);
  test('strStrKMP repeated', strStrKMP('aaaaab', 'aab'), 3);
  test('strStrRabinKarp', strStrRabinKarp('sadbutsad', 'but'), 3);
  test('isMatchWildcard', isMatchWildcard('adceb', '*a*b'), true);
  test('isMatchWildcard false', isMatchWildcard('acdcb', 'a*c?b'), false);

  console.log('\n=== PARSING ===');
  test('reverseWords', reverseWords('  the sky   is blue  '), 'blue is sky the');
  test('isValidParentheses', isValidParentheses('{[()]}'), true);
  test('isValidParentheses false', isValidParentheses('(]'), false);
  test('longestValidParentheses', longestValidParentheses(')()())'), 4);
  test('minRemoveToMakeValid', minRemoveToMakeValid('lee(t(c)o)de)'), 'lee(t(c)o)de');
  test('myAtoi', myAtoi('   -42abc'), -42);
  test('myAtoi overflow', myAtoi('91283472332'), 2147483647);
  test('compressString', compressString('aabcccccaaa'), 'a2bc5a3');
  test('longestCommonPrefix', longestCommonPrefix(['flower', 'flow', 'flight']), 'fl');
  test('encode/decode', decodeStrings(encodeStrings(['hello', 'wor#ld', ''])), ['hello', 'wor#ld', '']);
  test('intToRoman', intToRoman(1994), 'MCMXCIV');
  test('romanToInt', romanToInt('MCMXCIV'), 1994);
  test('calculate', calculate('3+2*2'), 7);
  test('calculate div', calculate(' 3/2 '), 1);
  test('calculate mixed', calculate('3+5 / 2'), 5);

  console.log('\n=== DYNAMIC PROGRAMMING ===');
  test('editDistance', editDistance('horse', 'ros'), 3);
  test('editDistance kitten', editDistance('kitten', 'sitting'), 3);
  test('longestCommonSubsequence', longestCommonSubsequence('abcde', 'ace'), 3);
  test('wordBreak', wordBreak('leetcode', ['leet', 'code']), true);
  test('wordBreak false', wordBreak('catsandog', ['cats', 'dog', 'sand', 'and', 'cat']), false);
  test('numDecodings', numDecodings('226'), 3);
  test('numDecodings leading zero', numDecodings('06'), 0);

  console.log('\n=== TRIE ===');
  const trie = new Trie();
  ['apple', 'app', 'application', 'apply', 'banana'].forEach((w) => trie.insert(w));
  test('Trie.search exact', trie.search('app'), true);
  test('Trie.search partial', trie.search('appl'), false);
  test('Trie.startsWith', trie.startsWith('appl'), true);
  test('Trie.wordsWithPrefix', trie.wordsWithPrefix('app').sort(), ['app', 'apple', 'application', 'apply']);
  test('Trie.searchPattern', trie.searchPattern('a..le'), true);
  test('Trie.searchPattern false', trie.searchPattern('b....a'), true);

  console.log(`\n${'='.repeat(50)}`);
  console.log(`  ${passed} passed, ${failed} failed`);
  console.log('='.repeat(50));
  if (failed > 0) process.exitCode = 1;
}

if (require.main === module) runTests();

module.exports = {
  isPalindrome, validPalindromeII, longestPalindrome, countSubstrings, canFormPalindrome,
  isAnagram, groupAnagrams, findAnagrams, firstUniqChar, topKFrequent, canConstruct,
  lengthOfLongestSubstring, minWindow, longestKDistinct, checkInclusion,
  strStrNaive, strStrKMP, strStrRabinKarp, isMatchWildcard,
  reverseWords, isValidParentheses, longestValidParentheses, minRemoveToMakeValid,
  myAtoi, compressString, longestCommonPrefix, encodeStrings, decodeStrings,
  intToRoman, romanToInt, calculate,
  editDistance, longestCommonSubsequence, wordBreak, numDecodings,
  Trie, TrieNode,
};
