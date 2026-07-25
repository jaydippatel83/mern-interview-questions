/**
 * ============================================================
 *  DSA — LINKED LISTS
 * ============================================================
 *  Singly · Doubly · Reversal · Cycle detection · Merging
 *  Stack / Queue / LRU built on lists
 *
 *  Run:  node linked-list.js
 * ============================================================
 */

/* ==================================================================
 *  NODE DEFINITIONS
 * ================================================================== */

class ListNode {
  constructor(val = 0, next = null) {
    this.val = val;
    this.next = next;
  }
}

class DoublyNode {
  constructor(val = 0, prev = null, next = null) {
    this.val = val;
    this.prev = prev;
    this.next = next;
  }
}

/* ==================================================================
 *  HELPERS
 * ================================================================== */

/** Build a list from an array */
function buildList(values) {
  const dummy = new ListNode();
  let tail = dummy;
  for (const v of values) {
    tail.next = new ListNode(v);
    tail = tail.next;
  }
  return dummy.next;
}

/** Convert a list back to an array (with a cycle guard) */
function toArray(head, limit = 10_000) {
  const out = [];
  let node = head;
  let steps = 0;
  while (node && steps++ < limit) {
    out.push(node.val);
    node = node.next;
  }
  return out;
}

/** Print a list */
const printList = (head) => toArray(head).join(' → ') || '(empty)';

/* ==================================================================
 *  SECTION 1 — SINGLY LINKED LIST CLASS
 * ================================================================== */

class LinkedList {
  #head = null;
  #tail = null;
  #size = 0;

  get size() { return this.#size; }
  get head() { return this.#head; }
  get isEmpty() { return this.#size === 0; }

  /** O(1) */
  push(val) {
    const node = new ListNode(val);
    if (!this.#head) {
      this.#head = this.#tail = node;
    } else {
      this.#tail.next = node;
      this.#tail = node;
    }
    this.#size++;
    return this;
  }

  /** O(1) */
  unshift(val) {
    const node = new ListNode(val, this.#head);
    this.#head = node;
    if (!this.#tail) this.#tail = node;
    this.#size++;
    return this;
  }

  /** O(1) */
  shift() {
    if (!this.#head) return undefined;
    const val = this.#head.val;
    this.#head = this.#head.next;
    if (!this.#head) this.#tail = null;
    this.#size--;
    return val;
  }

  /** O(n) — this is why a doubly linked list exists */
  pop() {
    if (!this.#head) return undefined;
    if (this.#size === 1) return this.shift();

    let node = this.#head;
    while (node.next !== this.#tail) node = node.next;
    const val = this.#tail.val;
    node.next = null;
    this.#tail = node;
    this.#size--;
    return val;
  }

  /** O(n) */
  get(index) {
    if (index < 0 || index >= this.#size) return undefined;
    let node = this.#head;
    for (let i = 0; i < index; i++) node = node.next;
    return node.val;
  }

  /** O(n) */
  insert(index, val) {
    if (index < 0 || index > this.#size) return false;
    if (index === 0) return Boolean(this.unshift(val));
    if (index === this.#size) return Boolean(this.push(val));

    let prev = this.#head;
    for (let i = 0; i < index - 1; i++) prev = prev.next;
    prev.next = new ListNode(val, prev.next);
    this.#size++;
    return true;
  }

  /** O(n) */
  remove(index) {
    if (index < 0 || index >= this.#size) return undefined;
    if (index === 0) return this.shift();
    if (index === this.#size - 1) return this.pop();

    let prev = this.#head;
    for (let i = 0; i < index - 1; i++) prev = prev.next;
    const val = prev.next.val;
    prev.next = prev.next.next;
    this.#size--;
    return val;
  }

  /** O(n) */
  reverse() {
    let prev = null;
    let curr = this.#head;
    this.#tail = this.#head;

    while (curr) {
      const next = curr.next;
      curr.next = prev;
      prev = curr;
      curr = next;
    }
    this.#head = prev;
    return this;
  }

  toArray() { return toArray(this.#head); }

  *[Symbol.iterator]() {
    let node = this.#head;
    while (node) {
      yield node.val;
      node = node.next;
    }
  }
}

/* ==================================================================
 *  SECTION 2 — REVERSAL
 * ================================================================== */

/** Reverse a linked list, iteratively — O(n) time, O(1) space */
function reverseList(head) {
  let prev = null;
  let curr = head;

  while (curr) {
    const next = curr.next;    // save
    curr.next = prev;          // reverse the pointer
    prev = curr;               // advance prev
    curr = next;               // advance curr
  }
  return prev;                 // new head
}

/** Reverse recursively — O(n) time, O(n) stack space */
function reverseListRecursive(head) {
  if (!head || !head.next) return head;
  const newHead = reverseListRecursive(head.next);
  head.next.next = head;       // point the next node BACK at us
  head.next = null;
  return newHead;
}

/** Reverse between positions m and n (1-indexed) — O(n) */
function reverseBetween(head, left, right) {
  if (!head || left === right) return head;

  const dummy = new ListNode(0, head);
  let prev = dummy;
  for (let i = 1; i < left; i++) prev = prev.next;

  const start = prev.next;
  let curr = start.next;

  // Head-insertion: repeatedly move `curr` to just after `prev`
  for (let i = 0; i < right - left; i++) {
    start.next = curr.next;
    curr.next = prev.next;
    prev.next = curr;
    curr = start.next;
  }
  return dummy.next;
}

/** Reverse nodes in k-sized groups — O(n) */
function reverseKGroup(head, k) {
  // Check there are at least k nodes left
  let node = head;
  for (let i = 0; i < k; i++) {
    if (!node) return head;    // fewer than k → leave as-is
    node = node.next;
  }

  // Reverse the first k, then recurse on the rest
  let prev = reverseKGroup(node, k);
  let curr = head;
  for (let i = 0; i < k; i++) {
    const next = curr.next;
    curr.next = prev;
    prev = curr;
    curr = next;
  }
  return prev;
}

/** Swap adjacent pairs — O(n) */
function swapPairs(head) {
  const dummy = new ListNode(0, head);
  let prev = dummy;

  while (prev.next && prev.next.next) {
    const first = prev.next;
    const second = first.next;

    first.next = second.next;
    second.next = first;
    prev.next = second;

    prev = first;
  }
  return dummy.next;
}

/* ==================================================================
 *  SECTION 3 — TWO POINTERS / FAST & SLOW
 * ================================================================== */

/** Middle node — O(n) time, O(1) space */
function middleNode(head) {
  let slow = head;
  let fast = head;
  while (fast && fast.next) {
    slow = slow.next;
    fast = fast.next.next;     // moves twice as fast
  }
  return slow;                 // for even length, returns the SECOND middle
}

/** Detect a cycle (Floyd's tortoise and hare) — O(n) time, O(1) space */
function hasCycle(head) {
  let slow = head;
  let fast = head;
  while (fast && fast.next) {
    slow = slow.next;
    fast = fast.next.next;
    if (slow === fast) return true;
  }
  return false;
}

/** Find the node where the cycle begins — O(n) time, O(1) space */
function detectCycleStart(head) {
  let slow = head;
  let fast = head;

  // Phase 1: find the meeting point
  while (fast && fast.next) {
    slow = slow.next;
    fast = fast.next.next;
    if (slow === fast) {
      // Phase 2: distance from head to cycle start
      //          == distance from the meeting point to cycle start
      let ptr = head;
      while (ptr !== slow) {
        ptr = ptr.next;
        slow = slow.next;
      }
      return ptr;
    }
  }
  return null;
}

/** Nth node from the end — one pass, O(n) */
function removeNthFromEnd(head, n) {
  const dummy = new ListNode(0, head);
  let fast = dummy;
  let slow = dummy;

  for (let i = 0; i <= n; i++) fast = fast.next;   // gap of n+1

  while (fast) {
    fast = fast.next;
    slow = slow.next;
  }
  slow.next = slow.next.next;                       // skip the target
  return dummy.next;
}

/** Intersection of two lists — O(n+m) time, O(1) space */
function getIntersectionNode(headA, headB) {
  if (!headA || !headB) return null;

  let a = headA;
  let b = headB;

  // Each pointer traverses both lists — they align after at most 2 passes
  while (a !== b) {
    a = a ? a.next : headB;
    b = b ? b.next : headA;
  }
  return a;    // the intersection node, or null
}

/** Is it a palindrome? — O(n) time, O(1) space */
function isPalindromeList(head) {
  if (!head || !head.next) return true;

  // 1. Find the middle
  let slow = head;
  let fast = head;
  while (fast.next && fast.next.next) {
    slow = slow.next;
    fast = fast.next.next;
  }

  // 2. Reverse the second half
  let second = reverseList(slow.next);
  const secondHead = second;

  // 3. Compare
  let first = head;
  let result = true;
  while (second) {
    if (first.val !== second.val) {
      result = false;
      break;
    }
    first = first.next;
    second = second.next;
  }

  // 4. Restore the list (polite — interviewers like this)
  slow.next = reverseList(secondHead);
  return result;
}

/* ==================================================================
 *  SECTION 4 — MERGING & SORTING
 * ================================================================== */

/** Merge two sorted lists — O(n+m) time, O(1) space */
function mergeTwoLists(l1, l2) {
  const dummy = new ListNode();
  let tail = dummy;

  while (l1 && l2) {
    if (l1.val <= l2.val) {
      tail.next = l1;
      l1 = l1.next;
    } else {
      tail.next = l2;
      l2 = l2.next;
    }
    tail = tail.next;
  }
  tail.next = l1 ?? l2;         // attach whatever remains
  return dummy.next;
}

/** Merge k sorted lists — divide and conquer, O(n log k) */
function mergeKLists(lists) {
  if (!lists.length) return null;

  while (lists.length > 1) {
    const merged = [];
    for (let i = 0; i < lists.length; i += 2) {
      merged.push(mergeTwoLists(lists[i], lists[i + 1] ?? null));
    }
    lists = merged;
  }
  return lists[0];
}

/** Sort a linked list — merge sort, O(n log n) time, O(log n) stack */
function sortList(head) {
  if (!head || !head.next) return head;

  // Split at the middle
  let slow = head;
  let fast = head;
  let prev = null;
  while (fast && fast.next) {
    prev = slow;
    slow = slow.next;
    fast = fast.next.next;
  }
  prev.next = null;             // cut the list in two

  return mergeTwoLists(sortList(head), sortList(slow));
}

/** Add two numbers stored in reverse order — O(max(n,m)) */
function addTwoNumbers(l1, l2) {
  const dummy = new ListNode();
  let tail = dummy;
  let carry = 0;

  while (l1 || l2 || carry) {
    const sum = (l1?.val ?? 0) + (l2?.val ?? 0) + carry;
    carry = Math.floor(sum / 10);
    tail.next = new ListNode(sum % 10);
    tail = tail.next;
    l1 = l1?.next;
    l2 = l2?.next;
  }
  return dummy.next;
}

/* ==================================================================
 *  SECTION 5 — MANIPULATION
 * ================================================================== */

/** Remove all nodes with a given value — O(n) */
function removeElements(head, val) {
  const dummy = new ListNode(0, head);
  let curr = dummy;

  while (curr.next) {
    if (curr.next.val === val) curr.next = curr.next.next;
    else curr = curr.next;
  }
  return dummy.next;
}

/** Remove duplicates from a SORTED list — O(n) */
function deleteDuplicates(head) {
  let curr = head;
  while (curr?.next) {
    if (curr.val === curr.next.val) curr.next = curr.next.next;
    else curr = curr.next;
  }
  return head;
}

/** Remove ALL nodes that have duplicates (sorted list) — O(n) */
function deleteAllDuplicates(head) {
  const dummy = new ListNode(0, head);
  let prev = dummy;
  let curr = head;

  while (curr) {
    if (curr.next && curr.val === curr.next.val) {
      const dupVal = curr.val;
      while (curr && curr.val === dupVal) curr = curr.next;   // skip them ALL
      prev.next = curr;
    } else {
      prev = curr;
      curr = curr.next;
    }
  }
  return dummy.next;
}

/** Partition around a value: all < x before all >= x — O(n), stable */
function partitionList(head, x) {
  const beforeDummy = new ListNode();
  const afterDummy = new ListNode();
  let before = beforeDummy;
  let after = afterDummy;

  while (head) {
    if (head.val < x) {
      before.next = head;
      before = before.next;
    } else {
      after.next = head;
      after = after.next;
    }
    head = head.next;
  }
  after.next = null;                    // ⚠️ essential — avoids a cycle
  before.next = afterDummy.next;
  return beforeDummy.next;
}

/** Rotate right by k — O(n) */
function rotateRight(head, k) {
  if (!head || !head.next || k === 0) return head;

  // Measure and close into a ring
  let length = 1;
  let tail = head;
  while (tail.next) {
    tail = tail.next;
    length++;
  }
  tail.next = head;

  // Find the new tail
  k = k % length;
  let stepsToNewTail = length - k;
  let newTail = tail;
  while (stepsToNewTail--) newTail = newTail.next;

  const newHead = newTail.next;
  newTail.next = null;                  // break the ring
  return newHead;
}

/** Reorder: L0 → Ln → L1 → Ln-1 → … — O(n) */
function reorderList(head) {
  if (!head || !head.next) return head;

  // 1. Split at the middle
  let slow = head;
  let fast = head;
  while (fast.next && fast.next.next) {
    slow = slow.next;
    fast = fast.next.next;
  }

  // 2. Reverse the second half
  let second = reverseList(slow.next);
  slow.next = null;

  // 3. Interleave
  let first = head;
  while (second) {
    const n1 = first.next;
    const n2 = second.next;
    first.next = second;
    second.next = n1;
    first = n1;
    second = n2;
  }
  return head;
}

/** Odd-even reordering: all odd-INDEXED nodes then even-indexed — O(n) */
function oddEvenList(head) {
  if (!head || !head.next) return head;

  let odd = head;
  let even = head.next;
  const evenHead = even;

  while (even && even.next) {
    odd.next = even.next;
    odd = odd.next;
    even.next = odd.next;
    even = even.next;
  }
  odd.next = evenHead;
  return head;
}

/** Deep copy a list with random pointers — O(n) time, O(1) extra space */
function copyRandomList(head) {
  if (!head) return null;

  // 1. Interleave copies: A → A' → B → B' → …
  let curr = head;
  while (curr) {
    const copy = { val: curr.val, next: curr.next, random: null };
    curr.next = copy;
    curr = copy.next;
  }

  // 2. Wire up the random pointers using the interleaving
  curr = head;
  while (curr) {
    if (curr.random) curr.next.random = curr.random.next;
    curr = curr.next.next;
  }

  // 3. Separate the two lists
  const copyHead = head.next;
  curr = head;
  while (curr) {
    const copy = curr.next;
    curr.next = copy.next;
    copy.next = copy.next ? copy.next.next : null;
    curr = curr.next;
  }
  return copyHead;
}

/* ==================================================================
 *  SECTION 6 — DOUBLY LINKED LIST
 * ================================================================== */

class DoublyLinkedList {
  #head = null;
  #tail = null;
  #size = 0;

  get size() { return this.#size; }

  /** O(1) */
  push(val) {
    const node = new DoublyNode(val, this.#tail, null);
    if (this.#tail) this.#tail.next = node;
    else this.#head = node;
    this.#tail = node;
    this.#size++;
    return node;
  }

  /** O(1) */
  unshift(val) {
    const node = new DoublyNode(val, null, this.#head);
    if (this.#head) this.#head.prev = node;
    else this.#tail = node;
    this.#head = node;
    this.#size++;
    return node;
  }

  /** O(1) — the whole point of a doubly linked list */
  pop() {
    if (!this.#tail) return undefined;
    const val = this.#tail.val;
    this.#tail = this.#tail.prev;
    if (this.#tail) this.#tail.next = null;
    else this.#head = null;
    this.#size--;
    return val;
  }

  /** O(1) */
  shift() {
    if (!this.#head) return undefined;
    const val = this.#head.val;
    this.#head = this.#head.next;
    if (this.#head) this.#head.prev = null;
    else this.#tail = null;
    this.#size--;
    return val;
  }

  /** O(1) — remove a node you already hold a reference to */
  removeNode(node) {
    if (node.prev) node.prev.next = node.next;
    else this.#head = node.next;

    if (node.next) node.next.prev = node.prev;
    else this.#tail = node.prev;

    node.prev = node.next = null;
    this.#size--;
    return node.val;
  }

  /** O(1) — move an existing node to the tail (used by LRU) */
  moveToTail(node) {
    if (node === this.#tail) return;
    this.removeNode(node);
    this.#size++;                     // removeNode decremented it

    node.prev = this.#tail;
    node.next = null;
    if (this.#tail) this.#tail.next = node;
    else this.#head = node;
    this.#tail = node;
  }

  toArray() {
    const out = [];
    let node = this.#head;
    while (node) {
      out.push(node.val);
      node = node.next;
    }
    return out;
  }

  toArrayReverse() {
    const out = [];
    let node = this.#tail;
    while (node) {
      out.push(node.val);
      node = node.prev;
    }
    return out;
  }
}

/* ==================================================================
 *  SECTION 7 — STRUCTURES BUILT ON LINKED LISTS
 * ================================================================== */

/** Stack — O(1) push/pop using the head */
class Stack {
  #head = null;
  #size = 0;

  get size() { return this.#size; }
  get isEmpty() { return this.#size === 0; }

  push(val) {
    this.#head = new ListNode(val, this.#head);
    this.#size++;
    return this;
  }

  pop() {
    if (!this.#head) return undefined;
    const val = this.#head.val;
    this.#head = this.#head.next;
    this.#size--;
    return val;
  }

  peek() { return this.#head?.val; }
}

/** Queue — O(1) enqueue/dequeue with head and tail pointers */
class Queue {
  #head = null;
  #tail = null;
  #size = 0;

  get size() { return this.#size; }
  get isEmpty() { return this.#size === 0; }

  enqueue(val) {
    const node = new ListNode(val);
    if (this.#tail) this.#tail.next = node;
    else this.#head = node;
    this.#tail = node;
    this.#size++;
    return this;
  }

  dequeue() {
    if (!this.#head) return undefined;
    const val = this.#head.val;
    this.#head = this.#head.next;
    if (!this.#head) this.#tail = null;
    this.#size--;
    return val;
  }

  peek() { return this.#head?.val; }
}

/**
 * LRU Cache — O(1) get and put
 * Hash map for lookup + doubly linked list for recency ordering.
 * This is THE classic linked-list interview question.
 */
class LRUCache {
  #map = new Map();          // key → node
  #head = null;              // least recently used
  #tail = null;              // most recently used
  #size = 0;

  constructor(capacity) {
    this.capacity = capacity;
  }

  #remove(node) {
    if (node.prev) node.prev.next = node.next;
    else this.#head = node.next;
    if (node.next) node.next.prev = node.prev;
    else this.#tail = node.prev;
    this.#size--;
  }

  #addToTail(node) {
    node.prev = this.#tail;
    node.next = null;
    if (this.#tail) this.#tail.next = node;
    else this.#head = node;
    this.#tail = node;
    this.#size++;
  }

  get(key) {
    const node = this.#map.get(key);
    if (!node) return -1;
    this.#remove(node);
    this.#addToTail(node);      // mark as most recently used
    return node.value;
  }

  put(key, value) {
    const existing = this.#map.get(key);
    if (existing) {
      existing.value = value;
      this.#remove(existing);
      this.#addToTail(existing);
      return this;
    }

    if (this.#size >= this.capacity) {
      const lru = this.#head;
      this.#remove(lru);
      this.#map.delete(lru.key);
    }

    const node = { key, value, prev: null, next: null };
    this.#map.set(key, node);
    this.#addToTail(node);
    return this;
  }

  get keys() {
    const out = [];
    let node = this.#head;
    while (node) {
      out.push(node.key);
      node = node.next;
    }
    return out;    // least → most recently used
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

  console.log('\n=== LINKED LIST CLASS ===');
  const list = new LinkedList();
  list.push(1).push(2).push(3).unshift(0);
  test('push/unshift', list.toArray(), [0, 1, 2, 3]);
  test('size', list.size, 4);
  test('get(2)', list.get(2), 2);
  list.insert(2, 99);
  test('insert', list.toArray(), [0, 1, 99, 2, 3]);
  list.remove(2);
  test('remove', list.toArray(), [0, 1, 2, 3]);
  test('pop', list.pop(), 3);
  test('shift', list.shift(), 0);
  test('after pop/shift', list.toArray(), [1, 2]);
  test('reverse', list.reverse().toArray(), [2, 1]);
  test('iterable', [...list], [2, 1]);

  console.log('\n=== REVERSAL ===');
  test('reverseList', toArray(reverseList(buildList([1, 2, 3, 4, 5]))), [5, 4, 3, 2, 1]);
  test('reverseListRecursive', toArray(reverseListRecursive(buildList([1, 2, 3]))), [3, 2, 1]);
  test('reverseBetween(2,4)', toArray(reverseBetween(buildList([1, 2, 3, 4, 5]), 2, 4)), [1, 4, 3, 2, 5]);
  test('reverseKGroup(k=2)', toArray(reverseKGroup(buildList([1, 2, 3, 4, 5]), 2)), [2, 1, 4, 3, 5]);
  test('reverseKGroup(k=3)', toArray(reverseKGroup(buildList([1, 2, 3, 4, 5]), 3)), [3, 2, 1, 4, 5]);
  test('swapPairs', toArray(swapPairs(buildList([1, 2, 3, 4]))), [2, 1, 4, 3]);

  console.log('\n=== FAST & SLOW POINTERS ===');
  test('middleNode odd', middleNode(buildList([1, 2, 3, 4, 5])).val, 3);
  test('middleNode even', middleNode(buildList([1, 2, 3, 4])).val, 3);
  test('removeNthFromEnd', toArray(removeNthFromEnd(buildList([1, 2, 3, 4, 5]), 2)), [1, 2, 3, 5]);
  test('isPalindromeList true', isPalindromeList(buildList([1, 2, 2, 1])), true);
  test('isPalindromeList false', isPalindromeList(buildList([1, 2, 3])), false);

  // Build a cycle: 1 → 2 → 3 → 4 → back to 2
  const cyclic = buildList([1, 2, 3, 4]);
  const cycleStart = cyclic.next;         // node with value 2
  let last = cyclic;
  while (last.next) last = last.next;
  last.next = cycleStart;

  test('hasCycle true', hasCycle(cyclic), true);
  test('hasCycle false', hasCycle(buildList([1, 2, 3])), false);
  test('detectCycleStart', detectCycleStart(cyclic).val, 2);

  // Intersection
  const shared = buildList([8, 4, 5]);
  const listA = buildList([4, 1]);
  listA.next.next = shared;
  const listB = buildList([5, 6, 1]);
  listB.next.next.next = shared;
  test('getIntersectionNode', getIntersectionNode(listA, listB).val, 8);
  test('no intersection', getIntersectionNode(buildList([1, 2]), buildList([3, 4])), null);

  console.log('\n=== MERGING & SORTING ===');
  test('mergeTwoLists', toArray(mergeTwoLists(buildList([1, 3, 5]), buildList([2, 4, 6]))), [1, 2, 3, 4, 5, 6]);
  test('mergeKLists', toArray(mergeKLists([
    buildList([1, 4, 5]),
    buildList([1, 3, 4]),
    buildList([2, 6]),
  ])), [1, 1, 2, 3, 4, 4, 5, 6]);
  test('sortList', toArray(sortList(buildList([4, 2, 1, 3]))), [1, 2, 3, 4]);
  test('sortList negatives', toArray(sortList(buildList([-1, 5, 3, 4, 0]))), [-1, 0, 3, 4, 5]);
  test('addTwoNumbers 342+465', toArray(addTwoNumbers(buildList([2, 4, 3]), buildList([5, 6, 4]))), [7, 0, 8]);
  test('addTwoNumbers carry', toArray(addTwoNumbers(buildList([9, 9]), buildList([1]))), [0, 0, 1]);

  console.log('\n=== MANIPULATION ===');
  test('removeElements', toArray(removeElements(buildList([1, 2, 6, 3, 6]), 6)), [1, 2, 3]);
  test('deleteDuplicates', toArray(deleteDuplicates(buildList([1, 1, 2, 3, 3]))), [1, 2, 3]);
  test('deleteAllDuplicates', toArray(deleteAllDuplicates(buildList([1, 2, 3, 3, 4, 4, 5]))), [1, 2, 5]);
  test('partitionList', toArray(partitionList(buildList([1, 4, 3, 2, 5, 2]), 3)), [1, 2, 2, 4, 3, 5]);
  test('rotateRight', toArray(rotateRight(buildList([1, 2, 3, 4, 5]), 2)), [4, 5, 1, 2, 3]);
  test('reorderList', toArray(reorderList(buildList([1, 2, 3, 4, 5]))), [1, 5, 2, 4, 3]);
  test('oddEvenList', toArray(oddEvenList(buildList([1, 2, 3, 4, 5]))), [1, 3, 5, 2, 4]);

  console.log('\n=== DOUBLY LINKED LIST ===');
  const dll = new DoublyLinkedList();
  dll.push(1);
  dll.push(2);
  dll.push(3);
  dll.unshift(0);
  test('DLL forward', dll.toArray(), [0, 1, 2, 3]);
  test('DLL reverse', dll.toArrayReverse(), [3, 2, 1, 0]);
  test('DLL pop O(1)', dll.pop(), 3);
  test('DLL shift O(1)', dll.shift(), 0);
  test('DLL after', dll.toArray(), [1, 2]);

  console.log('\n=== STACK & QUEUE ===');
  const stack = new Stack();
  stack.push(1).push(2).push(3);
  test('Stack LIFO', [stack.pop(), stack.pop(), stack.peek()], [3, 2, 1]);

  const queue = new Queue();
  queue.enqueue('a').enqueue('b').enqueue('c');
  test('Queue FIFO', [queue.dequeue(), queue.dequeue(), queue.peek()], ['a', 'b', 'c']);

  console.log('\n=== LRU CACHE ===');
  const lru = new LRUCache(2);
  lru.put(1, 1);
  lru.put(2, 2);
  test('LRU get(1)', lru.get(1), 1);
  lru.put(3, 3);                       // evicts key 2 (least recently used)
  test('LRU evicted 2', lru.get(2), -1);
  test('LRU keys order', lru.keys, [1, 3]);
  lru.put(4, 4);                       // evicts key 1
  test('LRU evicted 1', lru.get(1), -1);
  test('LRU still has 3', lru.get(3), 3);
  test('LRU still has 4', lru.get(4), 4);

  console.log(`\n${'='.repeat(50)}`);
  console.log(`  ${passed} passed, ${failed} failed`);
  console.log('='.repeat(50));
  if (failed > 0) process.exitCode = 1;
}

if (require.main === module) runTests();

module.exports = {
  ListNode, DoublyNode, buildList, toArray, printList,
  LinkedList, DoublyLinkedList, Stack, Queue, LRUCache,
  reverseList, reverseListRecursive, reverseBetween, reverseKGroup, swapPairs,
  middleNode, hasCycle, detectCycleStart, removeNthFromEnd, getIntersectionNode,
  isPalindromeList, mergeTwoLists, mergeKLists, sortList, addTwoNumbers,
  removeElements, deleteDuplicates, deleteAllDuplicates, partitionList,
  rotateRight, reorderList, oddEvenList, copyRandomList,
};
