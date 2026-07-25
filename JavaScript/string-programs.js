/**
 * ============================================================
 *  STRING PROGRAMS — JavaScript Interview Coding Questions
 * ============================================================
 *  Run:  node string-programs.js
 * ============================================================
 */

/* ------------------------------------------------------------------
 * 1. Reverse a string — 4 ways
 * ---------------------------------------------------------------- */
const reverseSplit = (s) => s.split('').reverse().join('');

const reverseSpread = (s) => [...s].reverse().join(''); // handles emoji/surrogate pairs

function reverseLoop(s) {
  let out = '';
  for (let i = s.length - 1; i >= 0; i--) out += s[i];
  return out;
}

const reverseRecursive = (s) => (s === '' ? '' : reverseRecursive(s.slice(1)) + s[0]);

// Unicode-safe (handles combining marks and ZWJ emoji sequences)
const reverseUnicode = (s) =>
  [...new Intl.Segmenter().segment(s)].map((x) => x.segment).reverse().join('');
// reverseSplit('👨‍👩‍👧') breaks the emoji; reverseUnicode does not

/* ------------------------------------------------------------------
 * 2. Palindrome check
 * ---------------------------------------------------------------- */
const isPalindrome = (s) => {
  const clean = s.toLowerCase().replace(/[^a-z0-9]/g, '');
  return clean === [...clean].reverse().join('');
};

// Two pointers — O(n) time, O(1) space
function isPalindromeTwoPointer(s) {
  const clean = s.toLowerCase().replace(/[^a-z0-9]/g, '');
  let l = 0;
  let r = clean.length - 1;
  while (l < r) {
    if (clean[l] !== clean[r]) return false;
    l++;
    r--;
  }
  return true;
}

/* ------------------------------------------------------------------
 * 3. Count character occurrences
 * ---------------------------------------------------------------- */
const charCount = (s) =>
  [...s].reduce((acc, ch) => ((acc[ch] = (acc[ch] || 0) + 1), acc), {});

const countVowels = (s) => (s.match(/[aeiou]/gi) || []).length;
const countConsonants = (s) => (s.match(/[b-df-hj-np-tv-z]/gi) || []).length;
const countWords = (s) => s.trim().split(/\s+/).filter(Boolean).length;

/* ------------------------------------------------------------------
 * 4. First non-repeating character
 * ---------------------------------------------------------------- */
function firstNonRepeating(s) {
  const counts = charCount(s);
  for (const ch of s) if (counts[ch] === 1) return ch;
  return null;
}
// firstNonRepeating('swiss') → 'w'

// First repeating character
function firstRepeating(s) {
  const seen = new Set();
  for (const ch of s) {
    if (seen.has(ch)) return ch;
    seen.add(ch);
  }
  return null;
}

/* ------------------------------------------------------------------
 * 5. Anagram check — O(n)
 * ---------------------------------------------------------------- */
function isAnagram(a, b) {
  const norm = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
  const x = norm(a);
  const y = norm(b);
  if (x.length !== y.length) return false;

  const counts = {};
  for (const ch of x) counts[ch] = (counts[ch] || 0) + 1;
  for (const ch of y) {
    if (!counts[ch]) return false;
    counts[ch]--;
  }
  return true;
}

// Group anagrams together
function groupAnagrams(words) {
  const map = new Map();
  for (const w of words) {
    const key = [...w.toLowerCase()].sort().join('');
    map.set(key, [...(map.get(key) || []), w]);
  }
  return [...map.values()];
}

/* ------------------------------------------------------------------
 * 6. Capitalize / title case / camelCase / kebab-case / snake_case
 * ---------------------------------------------------------------- */
const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();

const titleCase = (s) =>
  s.toLowerCase().replace(/\b\w/g, (ch) => ch.toUpperCase());

const toCamelCase = (s) =>
  s
    .replace(/[-_\s]+(.)?/g, (_, ch) => (ch ? ch.toUpperCase() : ''))
    .replace(/^./, (ch) => ch.toLowerCase());

const toPascalCase = (s) => {
  const camel = toCamelCase(s);
  return camel.charAt(0).toUpperCase() + camel.slice(1);
};

const toKebabCase = (s) =>
  s
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase();

const toSnakeCase = (s) => toKebabCase(s).replace(/-/g, '_');

/* ------------------------------------------------------------------
 * 7. Truncate with ellipsis
 * ---------------------------------------------------------------- */
const truncate = (s, max, suffix = '…') =>
  s.length <= max ? s : s.slice(0, max - suffix.length).trimEnd() + suffix;

// Truncate at word boundary
const truncateWords = (s, maxWords) => {
  const words = s.split(/\s+/);
  return words.length <= maxWords ? s : words.slice(0, maxWords).join(' ') + '…';
};

/* ------------------------------------------------------------------
 * 8. Longest word / longest substring without repeats
 * ---------------------------------------------------------------- */
const longestWord = (s) =>
  s.split(/\s+/).reduce((a, b) => (b.length > a.length ? b : a), '');

// Sliding window — O(n)
function longestUniqueSubstring(s) {
  const lastSeen = new Map();
  let start = 0;
  let best = 0;
  let bestStr = '';
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (lastSeen.has(ch) && lastSeen.get(ch) >= start) start = lastSeen.get(ch) + 1;
    lastSeen.set(ch, i);
    if (i - start + 1 > best) {
      best = i - start + 1;
      bestStr = s.slice(start, i + 1);
    }
  }
  return { length: best, substring: bestStr };
}
// longestUniqueSubstring('abcabcbb') → { length: 3, substring: 'abc' }

/* ------------------------------------------------------------------
 * 9. Reverse words in a sentence
 * ---------------------------------------------------------------- */
const reverseWords = (s) => s.trim().split(/\s+/).reverse().join(' ');

// Reverse each word, keep order
const reverseEachWord = (s) =>
  s.split(' ').map((w) => [...w].reverse().join('')).join(' ');

/* ------------------------------------------------------------------
 * 10. Remove duplicate characters
 * ---------------------------------------------------------------- */
const removeDuplicateChars = (s) => [...new Set(s)].join('');

/* ------------------------------------------------------------------
 * 11. Check if two strings are rotations of each other
 * ---------------------------------------------------------------- */
const isRotation = (a, b) => a.length === b.length && (a + a).includes(b);
// isRotation('abcde', 'cdeab') → true

/* ------------------------------------------------------------------
 * 12. String compression (run-length encoding)
 * ---------------------------------------------------------------- */
function compress(s) {
  let out = '';
  let count = 1;
  for (let i = 0; i <= s.length; i++) {
    if (s[i] === s[i - 1]) count++;
    else if (i > 0) {
      out += s[i - 1] + (count > 1 ? count : '');
      count = 1;
    }
  }
  return out.length < s.length ? out : s;
}
// compress('aaabccdddd') → 'a3bc2d4'

function decompress(s) {
  return s.replace(/([a-z])(\d*)/gi, (_, ch, n) => ch.repeat(Number(n) || 1));
}

/* ------------------------------------------------------------------
 * 13. Valid parentheses — stack
 * ---------------------------------------------------------------- */
function isValidParens(s) {
  const pairs = { ')': '(', ']': '[', '}': '{' };
  const stack = [];
  for (const ch of s) {
    if (['(', '[', '{'].includes(ch)) stack.push(ch);
    else if (pairs[ch]) {
      if (stack.pop() !== pairs[ch]) return false;
    }
  }
  return stack.length === 0;
}

/* ------------------------------------------------------------------
 * 14. Longest common prefix
 * ---------------------------------------------------------------- */
function longestCommonPrefix(strs) {
  if (!strs.length) return '';
  let prefix = strs[0];
  for (const s of strs.slice(1)) {
    while (!s.startsWith(prefix)) {
      prefix = prefix.slice(0, -1);
      if (!prefix) return '';
    }
  }
  return prefix;
}

/* ------------------------------------------------------------------
 * 15. Count substring occurrences (including overlapping)
 * ---------------------------------------------------------------- */
function countOccurrences(str, sub, overlapping = false) {
  if (!sub) return 0;
  let count = 0;
  let pos = 0;
  while ((pos = str.indexOf(sub, pos)) !== -1) {
    count++;
    pos += overlapping ? 1 : sub.length;
  }
  return count;
}
// countOccurrences('aaaa', 'aa')        → 2
// countOccurrences('aaaa', 'aa', true)  → 3

/* ------------------------------------------------------------------
 * 16. Longest palindromic substring — expand around center, O(n²)
 * ---------------------------------------------------------------- */
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
    expand(i, i);     // odd length
    expand(i, i + 1); // even length
  }
  return s.slice(start, start + maxLen);
}

/* ------------------------------------------------------------------
 * 17. String to number conversions (atoi)
 * ---------------------------------------------------------------- */
function myAtoi(s) {
  const match = s.trim().match(/^[+-]?\d+/);
  if (!match) return 0;
  const num = parseInt(match[0], 10);
  const INT_MAX = 2 ** 31 - 1;
  const INT_MIN = -(2 ** 31);
  return Math.min(Math.max(num, INT_MIN), INT_MAX);
}

/* ------------------------------------------------------------------
 * 18. Template / string interpolation engine
 * ---------------------------------------------------------------- */
const interpolate = (template, data) =>
  template.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, path) =>
    path.split('.').reduce((o, k) => o?.[k], data) ?? ''
  );
// interpolate('Hi {{user.name}}', { user: { name: 'Jaydip' } }) → 'Hi Jaydip'

/* ------------------------------------------------------------------
 * 19. Slugify a string (URL-friendly)
 * ---------------------------------------------------------------- */
const slugify = (s) =>
  s
    .normalize('NFD')                 // decompose accents: é → e + ́
    .replace(/[̀-ͯ]/g, '')  // strip the combining diacritical marks
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
// slugify('Héllo World! 2026') → 'hello-world-2026'

/* ------------------------------------------------------------------
 * 20. Mask sensitive data
 * ---------------------------------------------------------------- */
const maskEmail = (email) => {
  const [name, domain] = email.split('@');
  return `${name[0]}${'*'.repeat(Math.max(name.length - 2, 1))}${name.at(-1)}@${domain}`;
};

const maskCard = (num) => num.slice(-4).padStart(num.length, '*');
const maskPhone = (p) => p.replace(/\d(?=\d{4})/g, '*');

/* ------------------------------------------------------------------
 * 21. Validate email, URL, password, phone
 * ---------------------------------------------------------------- */
const isValidEmail = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s);

const isValidURL = (s) => {
  try {
    new URL(s);
    return true;
  } catch {
    return false;
  }
};

// 8+ chars, 1 upper, 1 lower, 1 digit, 1 special
const isStrongPassword = (s) =>
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/.test(s);

const isValidIndianPhone = (s) => /^(\+91[-\s]?)?[6-9]\d{9}$/.test(s);

/* ------------------------------------------------------------------
 * 22. Word frequency in a paragraph
 * ---------------------------------------------------------------- */
function wordFrequency(text) {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter(Boolean)
    .reduce((acc, w) => ((acc[w] = (acc[w] || 0) + 1), acc), {});
}

const topNWords = (text, n = 5) =>
  Object.entries(wordFrequency(text))
    .sort((a, b) => b[1] - a[1])
    .slice(0, n);

/* ------------------------------------------------------------------
 * 23. Levenshtein distance (edit distance) — DP
 * ---------------------------------------------------------------- */
function levenshtein(a, b) {
  const dp = Array.from({ length: a.length + 1 }, (_, i) =>
    Array.from({ length: b.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[a.length][b.length];
}
// levenshtein('kitten', 'sitting') → 3

/* ------------------------------------------------------------------
 * 24. Escape HTML / prevent XSS
 * ---------------------------------------------------------------- */
const escapeHTML = (s) =>
  s.replace(/[&<>"']/g, (ch) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch])
  );

const stripTags = (s) => s.replace(/<\/?[^>]+(>|$)/g, '');

/* ------------------------------------------------------------------
 * 25. Number formatting
 * ---------------------------------------------------------------- */
const formatINR = (n) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(n);

// Indian comma system: last 3 digits, then groups of 2 → 12,34,567 (not 1,234,567)
function indianCommas(n) {
  const [intPart, decPart] = String(n).split('.');
  const sign = intPart.startsWith('-') ? '-' : '';
  const digits = sign ? intPart.slice(1) : intPart;

  const last3 = digits.slice(-3);
  const rest = digits.slice(0, -3);
  const grouped = rest
    ? `${rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',')},${last3}`
    : last3;

  return sign + grouped + (decPart ? `.${decPart}` : '');
}

const formatBytes = (bytes, decimals = 2) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / k ** i).toFixed(decimals))} ${sizes[i]}`;
};

const ordinal = (n) => {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};
// ordinal(1) → '1st', ordinal(23) → '23rd'

/* ------------------------------------------------------------------
 * 26. Check if a string contains all unique characters
 * ---------------------------------------------------------------- */
const hasAllUnique = (s) => new Set(s).size === s.length;

/* ------------------------------------------------------------------
 * 27. Pangram / isogram
 * ---------------------------------------------------------------- */
const isPangram = (s) =>
  new Set(s.toLowerCase().replace(/[^a-z]/g, '')).size === 26;

const isIsogram = (s) => {
  const clean = s.toLowerCase().replace(/[^a-z]/g, '');
  return new Set(clean).size === clean.length;
};

/* ------------------------------------------------------------------
 * 28. Caesar cipher
 * ---------------------------------------------------------------- */
const caesarCipher = (s, shift) =>
  s.replace(/[a-z]/gi, (ch) => {
    const base = ch === ch.toUpperCase() ? 65 : 97;
    return String.fromCharCode(((ch.charCodeAt(0) - base + shift + 26) % 26) + base);
  });

/* ------------------------------------------------------------------
 * 29. Extract data with regex
 * ---------------------------------------------------------------- */
const extractEmails = (text) => text.match(/[\w.+-]+@[\w-]+\.[\w.]+/g) || [];
const extractURLs = (text) => text.match(/https?:\/\/[^\s<>"]+/g) || [];
const extractHashtags = (text) => text.match(/#\w+/g) || [];
const extractNumbers = (text) => (text.match(/-?\d+(\.\d+)?/g) || []).map(Number);

/* ------------------------------------------------------------------
 * 30. Padding, repeating and trimming
 * ---------------------------------------------------------------- */
const padZero = (n, len = 2) => String(n).padStart(len, '0');
const repeatString = (s, n) => s.repeat(n);
const centerText = (s, width, fill = ' ') => {
  const total = width - s.length;
  if (total <= 0) return s;
  const left = Math.floor(total / 2);
  return fill.repeat(left) + s + fill.repeat(total - left);
};

/* ==================================================================
 *  QUICK TESTS
 * ================================================================== */
if (require.main === module) {
  console.log('reverseSplit       ', reverseSplit('hello'));                 // olleh
  console.log('isPalindrome       ', isPalindrome('A man, a plan, a canal: Panama')); // true
  console.log('charCount          ', charCount('hello'));
  console.log('firstNonRepeating  ', firstNonRepeating('swiss'));            // w
  console.log('isAnagram          ', isAnagram('listen', 'silent'));         // true
  console.log('groupAnagrams      ', groupAnagrams(['eat', 'tea', 'tan', 'ate', 'nat']));
  console.log('toCamelCase        ', toCamelCase('hello-world_foo bar'));    // helloWorldFooBar
  console.log('toKebabCase        ', toKebabCase('helloWorldFooBar'));       // hello-world-foo-bar
  console.log('truncate           ', truncate('The quick brown fox', 10));   // The quic…
  console.log('longestUnique      ', longestUniqueSubstring('abcabcbb'));    // {length:3,substring:'abc'}
  console.log('reverseWords       ', reverseWords('the sky is blue'));       // blue is sky the
  console.log('isRotation         ', isRotation('abcde', 'cdeab'));          // true
  console.log('compress           ', compress('aaabccdddd'));                // a3bc2d4
  console.log('isValidParens      ', isValidParens('{[()]}'));               // true
  console.log('longestCommonPrefix', longestCommonPrefix(['flower', 'flow', 'flight'])); // fl
  console.log('longestPalindrome  ', longestPalindrome('babad'));            // bab
  console.log('interpolate        ', interpolate('Hi {{user.name}}', { user: { name: 'Jaydip' } }));
  console.log('slugify            ', slugify('Héllo World! 2026'));          // hello-world-2026
  console.log('maskEmail          ', maskEmail('jaydippatel@gmail.com'));
  console.log('isStrongPassword   ', isStrongPassword('Passw0rd!'));         // true
  console.log('topNWords          ', topNWords('the cat the dog the bird', 2));
  console.log('levenshtein        ', levenshtein('kitten', 'sitting'));      // 3
  console.log('formatINR          ', formatINR(1234567.5));
  console.log('indianCommas       ', indianCommas(1234567));                 // 12,34,567
  console.log('formatBytes        ', formatBytes(1536000));                  // 1.46 MB
  console.log('ordinal            ', ordinal(23));                           // 23rd
  console.log('isPangram          ', isPangram('The quick brown fox jumps over the lazy dog')); // true
  console.log('caesarCipher       ', caesarCipher('Hello', 3));              // Khoor
  console.log('extractEmails      ', extractEmails('mail me at a@b.com or c@d.org'));
}

module.exports = {
  reverseSplit, reverseSpread, reverseLoop, reverseRecursive, reverseUnicode,
  isPalindrome, isPalindromeTwoPointer, charCount, countVowels, countConsonants,
  countWords, firstNonRepeating, firstRepeating, isAnagram, groupAnagrams,
  capitalize, titleCase, toCamelCase, toPascalCase, toKebabCase, toSnakeCase,
  truncate, truncateWords, longestWord, longestUniqueSubstring, reverseWords,
  reverseEachWord, removeDuplicateChars, isRotation, compress, decompress,
  isValidParens, longestCommonPrefix, countOccurrences, longestPalindrome,
  myAtoi, interpolate, slugify, maskEmail, maskCard, maskPhone, isValidEmail,
  isValidURL, isStrongPassword, isValidIndianPhone, wordFrequency, topNWords,
  levenshtein, escapeHTML, stripTags, formatINR, indianCommas, formatBytes,
  ordinal, hasAllUnique, isPangram, isIsogram, caesarCipher, extractEmails,
  extractURLs, extractHashtags, extractNumbers, padZero, repeatString, centerText,
};
