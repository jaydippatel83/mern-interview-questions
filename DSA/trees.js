/**
 * ============================================================
 *  DSA — TREES, GRAPHS, HEAPS
 * ============================================================
 *  Binary trees · BST · Traversals · DFS/BFS · Heaps
 *  Graphs · Topological sort · Dijkstra · Union-Find
 *
 *  Run:  node trees.js
 * ============================================================
 */

/* ==================================================================
 *  NODE DEFINITIONS & HELPERS
 * ================================================================== */

class TreeNode {
  constructor(val = 0, left = null, right = null) {
    this.val = val;
    this.left = left;
    this.right = right;
  }
}

/** Build a tree from a level-order array (null = missing node) */
function buildTree(values) {
  if (!values.length || values[0] == null) return null;

  const root = new TreeNode(values[0]);
  const queue = [root];
  let i = 1;

  while (queue.length && i < values.length) {
    const node = queue.shift();

    if (i < values.length && values[i] != null) {
      node.left = new TreeNode(values[i]);
      queue.push(node.left);
    }
    i++;

    if (i < values.length && values[i] != null) {
      node.right = new TreeNode(values[i]);
      queue.push(node.right);
    }
    i++;
  }
  return root;
}

/** Serialise back to a level-order array (trailing nulls trimmed) */
function treeToArray(root) {
  if (!root) return [];
  const out = [];
  const queue = [root];

  while (queue.length) {
    const node = queue.shift();
    if (node) {
      out.push(node.val);
      queue.push(node.left, node.right);
    } else {
      out.push(null);
    }
  }
  while (out.length && out.at(-1) === null) out.pop();
  return out;
}

/* ==================================================================
 *  SECTION 1 — TRAVERSALS
 * ================================================================== */

/** Inorder (Left → Root → Right) — gives SORTED order for a BST */
function inorderRecursive(root, out = []) {
  if (!root) return out;
  inorderRecursive(root.left, out);
  out.push(root.val);
  inorderRecursive(root.right, out);
  return out;
}

/** Inorder, iterative — O(n) time, O(h) space */
function inorderIterative(root) {
  const out = [];
  const stack = [];
  let curr = root;

  while (curr || stack.length) {
    while (curr) {            // go as far left as possible
      stack.push(curr);
      curr = curr.left;
    }
    curr = stack.pop();
    out.push(curr.val);
    curr = curr.right;
  }
  return out;
}

/** Preorder (Root → Left → Right) — used for serialisation/cloning */
function preorderRecursive(root, out = []) {
  if (!root) return out;
  out.push(root.val);
  preorderRecursive(root.left, out);
  preorderRecursive(root.right, out);
  return out;
}

function preorderIterative(root) {
  if (!root) return [];
  const out = [];
  const stack = [root];

  while (stack.length) {
    const node = stack.pop();
    out.push(node.val);
    if (node.right) stack.push(node.right);   // right FIRST so left pops first
    if (node.left) stack.push(node.left);
  }
  return out;
}

/** Postorder (Left → Right → Root) — used for deletion / bottom-up computation */
function postorderRecursive(root, out = []) {
  if (!root) return out;
  postorderRecursive(root.left, out);
  postorderRecursive(root.right, out);
  out.push(root.val);
  return out;
}

function postorderIterative(root) {
  if (!root) return [];
  const out = [];
  const stack = [root];

  while (stack.length) {
    const node = stack.pop();
    out.unshift(node.val);                    // reverse of "root, right, left"
    if (node.left) stack.push(node.left);
    if (node.right) stack.push(node.right);
  }
  return out;
}

/** Level order (BFS) — returns an array of levels */
function levelOrder(root) {
  if (!root) return [];
  const result = [];
  let queue = [root];

  while (queue.length) {
    const level = [];
    const next = [];

    for (const node of queue) {
      level.push(node.val);
      if (node.left) next.push(node.left);
      if (node.right) next.push(node.right);
    }
    result.push(level);
    queue = next;
  }
  return result;
}

/** Zigzag level order */
function zigzagLevelOrder(root) {
  const levels = levelOrder(root);
  return levels.map((level, i) => (i % 2 ? level.reverse() : level));
}

/** Right side view — the last node of each level */
const rightSideView = (root) => levelOrder(root).map((level) => level.at(-1));

/* ==================================================================
 *  SECTION 2 — TREE PROPERTIES
 * ================================================================== */

/** Maximum depth — O(n) */
function maxDepth(root) {
  if (!root) return 0;
  return 1 + Math.max(maxDepth(root.left), maxDepth(root.right));
}

/** Minimum depth — to the nearest LEAF (not just a null child) */
function minDepth(root) {
  if (!root) return 0;
  if (!root.left) return 1 + minDepth(root.right);
  if (!root.right) return 1 + minDepth(root.left);
  return 1 + Math.min(minDepth(root.left), minDepth(root.right));
}

/** Is the tree height-balanced? — O(n) with early exit */
function isBalanced(root) {
  const height = (node) => {
    if (!node) return 0;
    const left = height(node.left);
    if (left === -1) return -1;              // propagate failure
    const right = height(node.right);
    if (right === -1) return -1;
    if (Math.abs(left - right) > 1) return -1;
    return 1 + Math.max(left, right);
  };
  return height(root) !== -1;
}

/** Are two trees identical? */
function isSameTree(p, q) {
  if (!p && !q) return true;
  if (!p || !q || p.val !== q.val) return false;
  return isSameTree(p.left, q.left) && isSameTree(p.right, q.right);
}

/** Is the tree symmetric (a mirror of itself)? */
function isSymmetric(root) {
  const mirror = (a, b) => {
    if (!a && !b) return true;
    if (!a || !b || a.val !== b.val) return false;
    return mirror(a.left, b.right) && mirror(a.right, b.left);   // note the crossing
  };
  return !root || mirror(root.left, root.right);
}

/** Invert (mirror) a tree */
function invertTree(root) {
  if (!root) return null;
  [root.left, root.right] = [invertTree(root.right), invertTree(root.left)];
  return root;
}

/** Diameter — longest path between ANY two nodes (may not pass through root) */
function diameterOfBinaryTree(root) {
  let diameter = 0;

  const depth = (node) => {
    if (!node) return 0;
    const left = depth(node.left);
    const right = depth(node.right);
    diameter = Math.max(diameter, left + right);   // path THROUGH this node
    return 1 + Math.max(left, right);
  };

  depth(root);
  return diameter;
}

/** Maximum path sum — any node to any node, values may be negative */
function maxPathSum(root) {
  let best = -Infinity;

  const gain = (node) => {
    if (!node) return 0;
    // Negative gains are worse than not taking the branch at all
    const left = Math.max(gain(node.left), 0);
    const right = Math.max(gain(node.right), 0);

    best = Math.max(best, node.val + left + right);   // path through this node
    return node.val + Math.max(left, right);          // what we can offer a parent
  };

  gain(root);
  return best;
}

/** Count all nodes */
const countNodes = (root) => (root ? 1 + countNodes(root.left) + countNodes(root.right) : 0);

/** All root-to-leaf paths */
function binaryTreePaths(root) {
  const paths = [];
  const dfs = (node, path) => {
    if (!node) return;
    const current = path ? `${path}->${node.val}` : String(node.val);
    if (!node.left && !node.right) {
      paths.push(current);
      return;
    }
    dfs(node.left, current);
    dfs(node.right, current);
  };
  dfs(root, '');
  return paths;
}

/** Does a root-to-leaf path sum to target? */
function hasPathSum(root, target) {
  if (!root) return false;
  if (!root.left && !root.right) return root.val === target;
  const remaining = target - root.val;
  return hasPathSum(root.left, remaining) || hasPathSum(root.right, remaining);
}

/** Count paths summing to target (any node to any descendant) — O(n) prefix sums */
function pathSumCount(root, target) {
  const prefixCounts = new Map([[0, 1]]);
  let count = 0;

  const dfs = (node, runningSum) => {
    if (!node) return;
    runningSum += node.val;

    count += prefixCounts.get(runningSum - target) ?? 0;
    prefixCounts.set(runningSum, (prefixCounts.get(runningSum) ?? 0) + 1);

    dfs(node.left, runningSum);
    dfs(node.right, runningSum);

    // Backtrack — this prefix isn't valid for sibling subtrees
    prefixCounts.set(runningSum, prefixCounts.get(runningSum) - 1);
  };

  dfs(root, 0);
  return count;
}

/* ==================================================================
 *  SECTION 3 — BINARY SEARCH TREE
 * ================================================================== */

class BST {
  #root = null;
  #size = 0;

  get root() { return this.#root; }
  get size() { return this.#size; }

  /** O(log n) average, O(n) worst (degenerate tree) */
  insert(val) {
    const node = new TreeNode(val);
    if (!this.#root) {
      this.#root = node;
      this.#size++;
      return this;
    }

    let curr = this.#root;
    while (true) {
      if (val === curr.val) return this;         // no duplicates
      if (val < curr.val) {
        if (!curr.left) {
          curr.left = node;
          this.#size++;
          return this;
        }
        curr = curr.left;
      } else {
        if (!curr.right) {
          curr.right = node;
          this.#size++;
          return this;
        }
        curr = curr.right;
      }
    }
  }

  /** O(log n) average */
  search(val) {
    let curr = this.#root;
    while (curr) {
      if (val === curr.val) return curr;
      curr = val < curr.val ? curr.left : curr.right;
    }
    return null;
  }

  contains(val) { return this.search(val) !== null; }

  /** O(log n) average — three cases: leaf, one child, two children */
  delete(val) {
    const removeNode = (node, val) => {
      if (!node) return null;

      if (val < node.val) {
        node.left = removeNode(node.left, val);
      } else if (val > node.val) {
        node.right = removeNode(node.right, val);
      } else {
        this.#size--;
        // Case 1 & 2: zero or one child
        if (!node.left) return node.right;
        if (!node.right) return node.left;

        // Case 3: two children — replace with the INORDER SUCCESSOR
        // (smallest value in the right subtree)
        let successor = node.right;
        while (successor.left) successor = successor.left;

        node.val = successor.val;
        this.#size++;                             // the recursive call will decrement
        node.right = removeNode(node.right, successor.val);
      }
      return node;
    };

    this.#root = removeNode(this.#root, val);
    return this;
  }

  min() {
    let curr = this.#root;
    while (curr?.left) curr = curr.left;
    return curr?.val;
  }

  max() {
    let curr = this.#root;
    while (curr?.right) curr = curr.right;
    return curr?.val;
  }

  /** Inorder traversal = sorted output */
  toSortedArray() { return inorderRecursive(this.#root); }

  height() { return maxDepth(this.#root); }
}

/** Validate a BST — O(n), passing down min/max bounds */
function isValidBST(root, min = -Infinity, max = Infinity) {
  if (!root) return true;
  // ⚠️ Checking only against the immediate parent is the classic WRONG answer
  if (root.val <= min || root.val >= max) return false;
  return isValidBST(root.left, min, root.val) && isValidBST(root.right, root.val, max);
}

/** Kth smallest in a BST — O(h + k) via inorder */
function kthSmallest(root, k) {
  const stack = [];
  let curr = root;

  while (curr || stack.length) {
    while (curr) {
      stack.push(curr);
      curr = curr.left;
    }
    curr = stack.pop();
    if (--k === 0) return curr.val;
    curr = curr.right;
  }
  return null;
}

/** Lowest common ancestor in a BST — O(h), exploits the ordering */
function lowestCommonAncestorBST(root, p, q) {
  let curr = root;
  while (curr) {
    if (p < curr.val && q < curr.val) curr = curr.left;
    else if (p > curr.val && q > curr.val) curr = curr.right;
    else return curr;             // split point — this is the LCA
  }
  return null;
}

/** LCA in a general binary tree — O(n) */
function lowestCommonAncestor(root, p, q) {
  if (!root || root === p || root === q) return root;

  const left = lowestCommonAncestor(root.left, p, q);
  const right = lowestCommonAncestor(root.right, p, q);

  if (left && right) return root;    // p and q are on different sides
  return left ?? right;
}

/** Sorted array → height-balanced BST — O(n) */
function sortedArrayToBST(nums) {
  const build = (lo, hi) => {
    if (lo > hi) return null;
    const mid = (lo + hi) >> 1;
    const node = new TreeNode(nums[mid]);
    node.left = build(lo, mid - 1);
    node.right = build(mid + 1, hi);
    return node;
  };
  return build(0, nums.length - 1);
}

/** Build a tree from preorder + inorder — O(n) */
function buildTreeFromTraversals(preorder, inorder) {
  const indexMap = new Map(inorder.map((v, i) => [v, i]));
  let preIndex = 0;

  const build = (left, right) => {
    if (left > right) return null;

    const rootVal = preorder[preIndex++];
    const node = new TreeNode(rootVal);
    const mid = indexMap.get(rootVal);

    node.left = build(left, mid - 1);      // must be built FIRST (preorder order)
    node.right = build(mid + 1, right);
    return node;
  };
  return build(0, inorder.length - 1);
}

/** Serialise / deserialise a tree */
function serialize(root) {
  const out = [];
  const dfs = (node) => {
    if (!node) {
      out.push('#');
      return;
    }
    out.push(String(node.val));
    dfs(node.left);
    dfs(node.right);
  };
  dfs(root);
  return out.join(',');
}

function deserialize(data) {
  const values = data.split(',');
  let i = 0;

  const build = () => {
    const v = values[i++];
    if (v === '#') return null;
    const node = new TreeNode(Number(v));
    node.left = build();
    node.right = build();
    return node;
  };
  return build();
}

/* ==================================================================
 *  SECTION 4 — HEAP / PRIORITY QUEUE
 * ================================================================== */

/**
 * Binary heap — O(log n) push/pop, O(1) peek.
 * Pass a comparator: (a, b) => a - b for a MIN heap.
 */
class Heap {
  #items = [];

  constructor(compare = (a, b) => a - b) {
    this.compare = compare;
  }

  get size() { return this.#items.length; }
  get isEmpty() { return this.#items.length === 0; }
  peek() { return this.#items[0]; }

  push(item) {
    this.#items.push(item);
    this.#bubbleUp(this.#items.length - 1);
    return this;
  }

  pop() {
    if (!this.#items.length) return undefined;
    const top = this.#items[0];
    const last = this.#items.pop();

    if (this.#items.length) {
      this.#items[0] = last;
      this.#bubbleDown(0);
    }
    return top;
  }

  #bubbleUp(i) {
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (this.compare(this.#items[i], this.#items[parent]) >= 0) break;
      [this.#items[i], this.#items[parent]] = [this.#items[parent], this.#items[i]];
      i = parent;
    }
  }

  #bubbleDown(i) {
    const n = this.#items.length;
    while (true) {
      const left = 2 * i + 1;
      const right = 2 * i + 2;
      let smallest = i;

      if (left < n && this.compare(this.#items[left], this.#items[smallest]) < 0) smallest = left;
      if (right < n && this.compare(this.#items[right], this.#items[smallest]) < 0) smallest = right;
      if (smallest === i) break;

      [this.#items[i], this.#items[smallest]] = [this.#items[smallest], this.#items[i]];
      i = smallest;
    }
  }

  /** Build a heap from an array in O(n), not O(n log n) */
  static heapify(array, compare) {
    const heap = new Heap(compare);
    heap.#items = [...array];
    for (let i = (heap.#items.length >> 1) - 1; i >= 0; i--) heap.#bubbleDown(i);
    return heap;
  }

  toArray() { return [...this.#items]; }
}

/** Kth largest element — O(n log k) with a min heap of size k */
function findKthLargest(nums, k) {
  const heap = new Heap((a, b) => a - b);     // min heap
  for (const n of nums) {
    heap.push(n);
    if (heap.size > k) heap.pop();            // keep only the k largest
  }
  return heap.peek();
}

/** Top K frequent elements — O(n log k) */
function topKFrequent(nums, k) {
  const counts = new Map();
  for (const n of nums) counts.set(n, (counts.get(n) ?? 0) + 1);

  const heap = new Heap((a, b) => a[1] - b[1]);   // min heap by frequency
  for (const entry of counts) {
    heap.push(entry);
    if (heap.size > k) heap.pop();
  }

  const result = [];
  while (!heap.isEmpty) result.unshift(heap.pop()[0]);
  return result;
}

/** Merge k sorted arrays — O(n log k) */
function mergeKSortedArrays(arrays) {
  const heap = new Heap((a, b) => a.val - b.val);

  arrays.forEach((arr, i) => {
    if (arr.length) heap.push({ val: arr[0], arrayIndex: i, elementIndex: 0 });
  });

  const result = [];
  while (!heap.isEmpty) {
    const { val, arrayIndex, elementIndex } = heap.pop();
    result.push(val);

    const next = arrays[arrayIndex][elementIndex + 1];
    if (next !== undefined) {
      heap.push({ val: next, arrayIndex, elementIndex: elementIndex + 1 });
    }
  }
  return result;
}

/* ==================================================================
 *  SECTION 5 — GRAPHS
 * ================================================================== */

/** Adjacency-list graph */
class Graph {
  #adj = new Map();

  constructor(directed = false) {
    this.directed = directed;
  }

  addVertex(v) {
    if (!this.#adj.has(v)) this.#adj.set(v, new Map());
    return this;
  }

  addEdge(u, v, weight = 1) {
    this.addVertex(u).addVertex(v);
    this.#adj.get(u).set(v, weight);
    if (!this.directed) this.#adj.get(v).set(u, weight);
    return this;
  }

  neighbors(v) { return [...(this.#adj.get(v)?.keys() ?? [])]; }
  weight(u, v) { return this.#adj.get(u)?.get(v); }
  get vertices() { return [...this.#adj.keys()]; }

  /** BFS — shortest path in an UNWEIGHTED graph, O(V + E) */
  bfs(start) {
    const visited = new Set([start]);
    const order = [];
    const queue = [start];

    while (queue.length) {
      const v = queue.shift();
      order.push(v);
      for (const n of this.neighbors(v)) {
        if (!visited.has(n)) {
          visited.add(n);
          queue.push(n);
        }
      }
    }
    return order;
  }

  /** DFS — O(V + E) */
  dfs(start) {
    const visited = new Set();
    const order = [];

    const visit = (v) => {
      if (visited.has(v)) return;
      visited.add(v);
      order.push(v);
      for (const n of this.neighbors(v)) visit(n);
    };

    visit(start);
    return order;
  }

  /** Shortest path (unweighted) via BFS with parent tracking */
  shortestPath(start, end) {
    if (start === end) return [start];

    const parent = new Map([[start, null]]);
    const queue = [start];

    while (queue.length) {
      const v = queue.shift();
      for (const n of this.neighbors(v)) {
        if (parent.has(n)) continue;
        parent.set(n, v);
        if (n === end) {
          // Reconstruct
          const path = [];
          for (let at = end; at !== null; at = parent.get(at)) path.unshift(at);
          return path;
        }
        queue.push(n);
      }
    }
    return null;
  }

  /** Dijkstra — shortest path with non-negative weights, O((V+E) log V) */
  dijkstra(start) {
    const dist = new Map(this.vertices.map((v) => [v, Infinity]));
    const prev = new Map();
    dist.set(start, 0);

    const heap = new Heap((a, b) => a[1] - b[1]);
    heap.push([start, 0]);
    const visited = new Set();

    while (!heap.isEmpty) {
      const [u, d] = heap.pop();
      if (visited.has(u)) continue;
      visited.add(u);

      for (const v of this.neighbors(u)) {
        const alt = d + this.weight(u, v);
        if (alt < dist.get(v)) {
          dist.set(v, alt);
          prev.set(v, u);
          heap.push([v, alt]);
        }
      }
    }
    return { dist, prev };
  }

  /** Cycle detection */
  hasCycle() {
    const visited = new Set();

    if (this.directed) {
      const inStack = new Set();
      const visit = (v) => {
        visited.add(v);
        inStack.add(v);
        for (const n of this.neighbors(v)) {
          if (!visited.has(n)) {
            if (visit(n)) return true;
          } else if (inStack.has(n)) {
            return true;                    // back edge → cycle
          }
        }
        inStack.delete(v);
        return false;
      };
      return this.vertices.some((v) => !visited.has(v) && visit(v));
    }

    const visit = (v, parent) => {
      visited.add(v);
      for (const n of this.neighbors(v)) {
        if (!visited.has(n)) {
          if (visit(n, v)) return true;
        } else if (n !== parent) {
          return true;                      // visited and not the parent → cycle
        }
      }
      return false;
    };
    return this.vertices.some((v) => !visited.has(v) && visit(v, null));
  }
}

/** Topological sort (Kahn's algorithm) — O(V + E) */
function topologicalSort(numNodes, edges) {
  const adj = Array.from({ length: numNodes }, () => []);
  const inDegree = new Array(numNodes).fill(0);

  for (const [from, to] of edges) {
    adj[from].push(to);
    inDegree[to]++;
  }

  const queue = [];
  for (let i = 0; i < numNodes; i++) if (inDegree[i] === 0) queue.push(i);

  const order = [];
  while (queue.length) {
    const node = queue.shift();
    order.push(node);

    for (const next of adj[node]) {
      if (--inDegree[next] === 0) queue.push(next);
    }
  }

  // If not every node was output, there's a cycle
  return order.length === numNodes ? order : null;
}

/** Course schedule — can all courses be finished? */
const canFinishCourses = (numCourses, prerequisites) =>
  topologicalSort(numCourses, prerequisites.map(([a, b]) => [b, a])) !== null;

/** Union-Find (Disjoint Set) with path compression + union by rank */
class UnionFind {
  constructor(n) {
    this.parent = Array.from({ length: n }, (_, i) => i);
    this.rank = new Array(n).fill(0);
    this.count = n;                          // number of disjoint sets
  }

  /** Near O(1) amortised (inverse Ackermann) */
  find(x) {
    if (this.parent[x] !== x) {
      this.parent[x] = this.find(this.parent[x]);   // path compression
    }
    return this.parent[x];
  }

  union(x, y) {
    const rootX = this.find(x);
    const rootY = this.find(y);
    if (rootX === rootY) return false;              // already connected

    // Union by rank — attach the shorter tree under the taller
    if (this.rank[rootX] < this.rank[rootY]) {
      this.parent[rootX] = rootY;
    } else if (this.rank[rootX] > this.rank[rootY]) {
      this.parent[rootY] = rootX;
    } else {
      this.parent[rootY] = rootX;
      this.rank[rootX]++;
    }
    this.count--;
    return true;
  }

  connected(x, y) { return this.find(x) === this.find(y); }
}

/** Number of connected components */
function countComponents(n, edges) {
  const uf = new UnionFind(n);
  for (const [a, b] of edges) uf.union(a, b);
  return uf.count;
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

  //        1
  //       / \
  //      2   3
  //     / \
  //    4   5
  const tree = buildTree([1, 2, 3, 4, 5]);

  console.log('\n=== TRAVERSALS ===');
  test('inorderRecursive', inorderRecursive(tree), [4, 2, 5, 1, 3]);
  test('inorderIterative', inorderIterative(tree), [4, 2, 5, 1, 3]);
  test('preorderRecursive', preorderRecursive(tree), [1, 2, 4, 5, 3]);
  test('preorderIterative', preorderIterative(tree), [1, 2, 4, 5, 3]);
  test('postorderRecursive', postorderRecursive(tree), [4, 5, 2, 3, 1]);
  test('postorderIterative', postorderIterative(tree), [4, 5, 2, 3, 1]);
  test('levelOrder', levelOrder(tree), [[1], [2, 3], [4, 5]]);
  test('zigzagLevelOrder', zigzagLevelOrder(buildTree([3, 9, 20, null, null, 15, 7])), [[3], [20, 9], [15, 7]]);
  test('rightSideView', rightSideView(buildTree([1, 2, 3, null, 5, null, 4])), [1, 3, 4]);

  console.log('\n=== TREE PROPERTIES ===');
  test('maxDepth', maxDepth(tree), 3);
  test('minDepth', minDepth(buildTree([3, 9, 20, null, null, 15, 7])), 2);
  test('isBalanced true', isBalanced(tree), true);
  test('isBalanced false', isBalanced(buildTree([1, 2, null, 3, null, 4])), false);
  test('isSameTree', isSameTree(buildTree([1, 2, 3]), buildTree([1, 2, 3])), true);
  test('isSameTree false', isSameTree(buildTree([1, 2]), buildTree([1, null, 2])), false);
  test('isSymmetric', isSymmetric(buildTree([1, 2, 2, 3, 4, 4, 3])), true);
  test('isSymmetric false', isSymmetric(buildTree([1, 2, 2, null, 3, null, 3])), false);
  test('invertTree', treeToArray(invertTree(buildTree([4, 2, 7, 1, 3, 6, 9]))), [4, 7, 2, 9, 6, 3, 1]);
  test('diameterOfBinaryTree', diameterOfBinaryTree(tree), 3);
  test('maxPathSum', maxPathSum(buildTree([-10, 9, 20, null, null, 15, 7])), 42);
  test('maxPathSum negatives', maxPathSum(buildTree([-3])), -3);
  test('countNodes', countNodes(tree), 5);
  test('binaryTreePaths', binaryTreePaths(buildTree([1, 2, 3, null, 5])), ['1->2->5', '1->3']);
  test('hasPathSum', hasPathSum(buildTree([5, 4, 8, 11, null, 13, 4, 7, 2]), 22), true);
  test('pathSumCount', pathSumCount(buildTree([10, 5, -3, 3, 2, null, 11, 3, -2, null, 1]), 8), 3);

  console.log('\n=== BINARY SEARCH TREE ===');
  const bst = new BST();
  [50, 30, 70, 20, 40, 60, 80].forEach((v) => bst.insert(v));
  test('BST sorted output', bst.toSortedArray(), [20, 30, 40, 50, 60, 70, 80]);
  test('BST size', bst.size, 7);
  test('BST contains', bst.contains(40), true);
  test('BST missing', bst.contains(45), false);
  test('BST min/max', [bst.min(), bst.max()], [20, 80]);
  bst.delete(20);                                    // leaf
  test('BST delete leaf', bst.toSortedArray(), [30, 40, 50, 60, 70, 80]);
  bst.delete(30);                                    // one child
  test('BST delete one child', bst.toSortedArray(), [40, 50, 60, 70, 80]);
  bst.delete(70);                                    // two children
  test('BST delete two children', bst.toSortedArray(), [40, 50, 60, 80]);

  test('isValidBST true', isValidBST(buildTree([2, 1, 3])), true);
  test('isValidBST false', isValidBST(buildTree([5, 1, 4, null, null, 3, 6])), false);
  test('kthSmallest', kthSmallest(buildTree([5, 3, 6, 2, 4, null, null, 1]), 3), 3);
  test('lowestCommonAncestorBST', lowestCommonAncestorBST(buildTree([6, 2, 8, 0, 4, 7, 9]), 2, 8).val, 6);
  test('sortedArrayToBST balanced', isBalanced(sortedArrayToBST([1, 2, 3, 4, 5, 6, 7])), true);
  test('sortedArrayToBST valid', isValidBST(sortedArrayToBST([1, 2, 3, 4, 5])), true);
  test('buildTreeFromTraversals', treeToArray(buildTreeFromTraversals([3, 9, 20, 15, 7], [9, 3, 15, 20, 7])),
    [3, 9, 20, null, null, 15, 7]);
  test('serialize/deserialize', treeToArray(deserialize(serialize(tree))), [1, 2, 3, 4, 5]);

  console.log('\n=== HEAP ===');
  const minHeap = new Heap((a, b) => a - b);
  [5, 3, 8, 1, 9, 2].forEach((n) => minHeap.push(n));
  test('Heap peek (min)', minHeap.peek(), 1);
  test('Heap pop order', [minHeap.pop(), minHeap.pop(), minHeap.pop()], [1, 2, 3]);

  const maxHeap = new Heap((a, b) => b - a);
  [5, 3, 8, 1].forEach((n) => maxHeap.push(n));
  test('Heap max', maxHeap.pop(), 8);

  test('Heap.heapify', (() => {
    const h = Heap.heapify([9, 4, 7, 1, 8, 2], (a, b) => a - b);
    return [h.pop(), h.pop(), h.pop()];
  })(), [1, 2, 4]);

  test('findKthLargest', findKthLargest([3, 2, 1, 5, 6, 4], 2), 5);
  test('topKFrequent', topKFrequent([1, 1, 1, 2, 2, 3], 2), [1, 2]);
  test('mergeKSortedArrays', mergeKSortedArrays([[1, 4, 7], [2, 5, 8], [3, 6, 9]]),
    [1, 2, 3, 4, 5, 6, 7, 8, 9]);

  console.log('\n=== GRAPHS ===');
  const graph = new Graph();
  graph.addEdge('A', 'B').addEdge('A', 'C').addEdge('B', 'D').addEdge('C', 'D').addEdge('D', 'E');
  test('BFS', graph.bfs('A'), ['A', 'B', 'C', 'D', 'E']);
  test('DFS', graph.dfs('A'), ['A', 'B', 'D', 'C', 'E']);
  test('shortestPath', graph.shortestPath('A', 'E'), ['A', 'B', 'D', 'E']);
  test('hasCycle undirected', graph.hasCycle(), true);

  const dag = new Graph(true);
  dag.addEdge('A', 'B').addEdge('B', 'C');
  test('hasCycle DAG', dag.hasCycle(), false);
  dag.addEdge('C', 'A');
  test('hasCycle directed', dag.hasCycle(), true);

  const weighted = new Graph(true);
  weighted.addEdge('A', 'B', 4).addEdge('A', 'C', 2)
          .addEdge('C', 'B', 1).addEdge('B', 'D', 5)
          .addEdge('C', 'D', 8);
  const { dist } = weighted.dijkstra('A');
  test('dijkstra A→B', dist.get('B'), 3);      // A→C→B = 2+1
  test('dijkstra A→D', dist.get('D'), 8);      // A→C→B→D = 2+1+5

  test('topologicalSort', topologicalSort(4, [[0, 1], [0, 2], [1, 3], [2, 3]]), [0, 1, 2, 3]);
  test('topologicalSort cycle', topologicalSort(2, [[0, 1], [1, 0]]), null);
  test('canFinishCourses', canFinishCourses(2, [[1, 0]]), true);
  test('canFinishCourses cycle', canFinishCourses(2, [[1, 0], [0, 1]]), false);

  console.log('\n=== UNION-FIND ===');
  const uf = new UnionFind(5);
  uf.union(0, 1);
  uf.union(3, 4);
  test('UnionFind connected', uf.connected(0, 1), true);
  test('UnionFind not connected', uf.connected(0, 3), false);
  test('UnionFind count', uf.count, 3);
  test('countComponents', countComponents(5, [[0, 1], [1, 2], [3, 4]]), 2);

  console.log(`\n${'='.repeat(50)}`);
  console.log(`  ${passed} passed, ${failed} failed`);
  console.log('='.repeat(50));
  if (failed > 0) process.exitCode = 1;
}

if (require.main === module) runTests();

module.exports = {
  TreeNode, buildTree, treeToArray,
  inorderRecursive, inorderIterative, preorderRecursive, preorderIterative,
  postorderRecursive, postorderIterative, levelOrder, zigzagLevelOrder, rightSideView,
  maxDepth, minDepth, isBalanced, isSameTree, isSymmetric, invertTree,
  diameterOfBinaryTree, maxPathSum, countNodes, binaryTreePaths, hasPathSum, pathSumCount,
  BST, isValidBST, kthSmallest, lowestCommonAncestorBST, lowestCommonAncestor,
  sortedArrayToBST, buildTreeFromTraversals, serialize, deserialize,
  Heap, findKthLargest, topKFrequent, mergeKSortedArrays,
  Graph, topologicalSort, canFinishCourses, UnionFind, countComponents,
};
