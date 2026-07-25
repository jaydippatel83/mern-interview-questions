# 🎨 CSS Interview Questions

> Box model · Specificity · Flexbox · Grid · Positioning · Responsive · Animations · Architecture

---

## Table of Contents

1. [Fundamentals](#fundamentals)
2. [Selectors & Specificity](#selectors--specificity)
3. [Box Model & Layout](#box-model--layout)
4. [Positioning](#positioning)
5. [Flexbox](#flexbox)
6. [CSS Grid](#css-grid)
7. [Responsive Design](#responsive-design)
8. [Units & Values](#units--values)
9. [Transitions & Animations](#transitions--animations)
10. [Modern CSS](#modern-css)
11. [Architecture & Performance](#architecture--performance)
12. [Rapid Fire](#rapid-fire)

---

# Fundamentals

## What is the CSS box model?

### Answer

Every element is a rectangular box made of four layers, inside out:

```
┌──────────── margin ────────────┐
│ ┌────────── border ──────────┐ │
│ │ ┌──────── padding ───────┐ │ │
│ │ │       content          │ │ │
│ │ └────────────────────────┘ │ │
│ └────────────────────────────┘ │
└────────────────────────────────┘
```

### Why do we use it?

Every sizing bug — "why is my 50% + 50% wrapping?" — comes from misunderstanding which layers `width` includes.

### When should we use it?

Two modes:

- **`content-box`** (default) — `width` = content only. Total = `width + padding + border`.
- **`border-box`** — `width` = content + padding + border. What you set is what you get.

### Example

```css
/* Universal reset — used in essentially every real project */
*, *::before, *::after { box-sizing: border-box; }

.a { box-sizing: content-box; width: 200px; padding: 20px; border: 5px solid; }
/* rendered width = 200 + 40 + 10 = 250px */

.b { box-sizing: border-box; width: 200px; padding: 20px; border: 5px solid; }
/* rendered width = 200px, content shrinks to 150px */
```

**Interview Tip:** Margin is **not** part of the box's rendered width — it's the space *around* it, and it collapses vertically. That distinction is the follow-up question.

**Common Mistakes:** Forgetting `*::before, *::after` in the reset, so pseudo-elements still use `content-box`.

---

## What is margin collapsing?

### Answer

Adjacent **vertical** margins merge into one, equal to the largest of them — not their sum. Horizontal margins never collapse.

Three cases:
1. **Adjacent siblings** — bottom of one meets top of the next.
2. **Parent and first/last child** — child's margin escapes the parent.
3. **Empty element** — its own top and bottom margins collapse together.

### Why do we use it?

It exists so consecutive paragraphs don't accumulate huge gaps. But it causes the classic "my child's margin pushed the parent down" bug.

### When should we use it?

Know how to **stop** it: a BFC (Block Formatting Context) on the parent, `padding`, `border`, `display:flex/grid`, `overflow:hidden`, or `position:absolute`.

### Example

```css
.a { margin-bottom: 30px; }
.b { margin-top: 20px; }
/* gap between them = 30px, NOT 50px */

/* Parent–child collapse */
.parent { background: pink; }       /* child margin escapes */
.child  { margin-top: 50px; }

/* Fixes */
.parent { display: flow-root; }     /* cleanest modern fix */
.parent { overflow: hidden; }       /* old trick */
.parent { padding-top: 1px; }       /* hacky */
```

**Interview Tip:** Flex and Grid children **never** collapse margins — that alone is a reason modern layouts feel more predictable.

**Common Mistakes:** Debugging for an hour before realising `overflow:hidden` fixed it because it created a BFC, not because of clipping.

---

## What is a Block Formatting Context (BFC)?

### Answer

An independent layout region where block boxes lay out and floats are contained. Inside a BFC, layout doesn't affect the outside and vice versa.

### Why do we use it?

A BFC:
- Contains floats (parent wraps its floated children — the old clearfix problem)
- Prevents margin collapsing through it
- Stops a box from overlapping a float

### When should we use it?

Triggers: `overflow` other than `visible`, `display: flow-root | flex | grid | inline-block | table-cell`, `position: absolute | fixed`, `float` other than `none`, `contain: layout`.

### Example

```css
/* Parent collapses to 0 height without this */
.container { display: flow-root; }   /* purpose-built, no side effects */
.child { float: left; height: 100px; }
```

**Interview Tip:** `display: flow-root` was added specifically to create a BFC with no side effects — knowing it beats reciting `overflow:hidden`.

**Common Mistakes:** Using `overflow:hidden` for BFC and then wondering why a dropdown/tooltip is clipped.

---

## What is the difference between `inline`, `block`, `inline-block` and `flow-root`?

### Answer

| `display` | New line | Width/height | Vertical margin | Creates BFC |
|---|---|---|---|---|
| `block` | Yes | Yes | Yes | No |
| `inline` | No | **Ignored** | Effectively no | No |
| `inline-block` | No | Yes | Yes | Yes |
| `flow-root` | Yes | Yes | Yes (contained) | **Yes** |
| `none` | Removed from layout entirely | — | — | — |

### Example

```css
span { display: inline-block; width: 100px; height: 40px; } /* now sizable */
.card { display: flow-root; }  /* block box that contains its floats/margins */
```

**Interview Tip:** `display` is now two values — `display: inline flow-root` is the spec form of `inline-block`. Mentioning the two-value syntax signals you follow modern CSS.

**Common Mistakes:** Setting `height` on an `<a>` or `<span>` and being surprised nothing happens.

---

# Selectors & Specificity

## How does CSS specificity work?

### Answer

Specificity is a four-part tuple `(inline, id, class, type)` compared left to right:

| Selector | Specificity |
|---|---|
| `!important` | overrides everything (not part of the tuple) |
| `style="…"` inline | `1,0,0,0` |
| `#id` | `0,1,0,0` |
| `.class`, `[attr]`, `:hover`, `:not(x)`* | `0,0,1,0` |
| `div`, `::before` | `0,0,0,1` |
| `*`, `:where()` | `0,0,0,0` |

\* `:not()`, `:is()`, `:has()` take the specificity of their **most specific argument**. `:where()` is always zero.

### Why do we use it?

When two rules target the same element, specificity — then source order — decides the winner. Not "the last rule" alone.

### When should we use it?

Keep specificity flat (single classes) so overriding is easy. That's the whole point of BEM and utility CSS.

### Example

```css
#nav .item a       { color: red; }    /* 0,1,2,1 → wins */
.nav .item a:hover { color: blue; }   /* 0,0,3,1 */
a                  { color: green; }  /* 0,0,0,1 */

/* Zero-specificity defaults — easy to override */
:where(.btn) { padding: 8px 16px; }

/* :is() keeps specificity of the heaviest argument */
:is(#main, .side) p { color: teal; }  /* 0,1,0,1 */
```

**Interview Tip:** Specificity components never "carry" — 11 classes (`0,0,11,0`) still lose to one id (`0,1,0,0`).

**Common Mistakes:** Fighting specificity with `!important`, which forces the next dev to use `!important` too. The real fix is lowering the original selector.

---

## What is the CSS cascade and what is the order of precedence?

### Answer

When multiple declarations apply, the winner is decided in this order:

1. **Origin & importance** — user-agent < user < author < author `!important` < user `!important` < transitions/animations
2. **Cascade layers** (`@layer`) — later layers win; unlayered styles beat layered ones
3. **Specificity**
4. **Source order** — last one wins

### Why do we use it?

It explains why a library's styles beat yours even with the same specificity, and why `@layer` is the modern fix.

### Example

```css
@layer reset, base, components, utilities;

@layer reset      { * { margin: 0; } }
@layer components { .btn { background: blue; } }   /* 0,0,1,0 */
@layer utilities  { .bg-red { background: red; } } /* 0,0,1,0 → wins, later layer */
```

**Interview Tip:** `@layer` lets a low-specificity utility beat a high-specificity component selector — it inverts the usual rules and is the cleanest way to integrate a third-party stylesheet.

**Common Mistakes:** Assuming inline styles always win — an author `!important` in a stylesheet beats a plain inline style.

---

## What are combinators in CSS?

### Answer

| Combinator | Syntax | Matches |
|---|---|---|
| Descendant | `A B` | any B inside A, at any depth |
| Child | `A > B` | B that is a direct child of A |
| Adjacent sibling | `A + B` | the B immediately after A |
| General sibling | `A ~ B` | all Bs after A, same parent |
| Column | `A \|\| B` | table column (limited support) |

### Example

```css
ul li          { }  /* every li inside, including nested lists */
ul > li        { }  /* only top-level lis */
h2 + p         { margin-top: 0; }        /* first paragraph after a heading */
input:checked ~ .panel { display: block; } /* CSS-only toggles */
```

**Interview Tip:** `~` and `+` only look **forward** among siblings. Until `:has()`, CSS had no way to look backward or upward — that's why it's called "the parent selector".

**Common Mistakes:** Using descendant selectors deeply (`.a .b .c .d`), which is both slow to override and brittle.

---

## What is `:has()` and why is it a big deal?

### Answer

`:has()` is the **parent/relational selector** — it styles an element based on what it contains or what follows it.

### Why do we use it?

For 20 years this required JavaScript. Now it's one selector.

### When should we use it?

Card variants based on content, form validation styling, layout that reacts to children.

### Example

```css
/* Card that contains an image gets a different layout */
.card:has(img) { grid-template-columns: 120px 1fr; }

/* Label turns red when its input is invalid and not empty */
label:has(input:invalid:not(:placeholder-shown)) { color: crimson; }

/* Hide the empty-state when the list has items */
.wrapper:has(.item) .empty-state { display: none; }

/* Previous sibling styling — was impossible before */
.row:has(+ .row:hover) { opacity: .5; }
```

**Interview Tip:** `:has()` takes the specificity of its most specific argument, and it is **not** forgiving of invalid selectors the way `:is()` is.

**Common Mistakes:** Overusing it on huge DOM trees — it's fast in modern engines but a `body:has(...)` that toggles global layout can force large invalidations.

---

## What is the difference between pseudo-classes and pseudo-elements?

### Answer

- **Pseudo-class** (`:`) — targets an existing element in a particular **state**: `:hover`, `:focus`, `:nth-child()`, `:checked`, `:disabled`, `:first-of-type`.
- **Pseudo-element** (`::`) — creates or targets a **sub-part** of an element that isn't in the DOM: `::before`, `::after`, `::first-line`, `::placeholder`, `::selection`, `::marker`, `::backdrop`.

### Example

```css
a:hover { text-decoration: underline; }

.required::after { content: " *"; color: red; }

input::placeholder { color: #999; }
::selection { background: yellow; }
li::marker { color: teal; }
dialog::backdrop { background: rgb(0 0 0 / .6); }
```

**Interview Tip:** `::before`/`::after` need a `content` property (even `content:""`) to render at all, and they don't work on replaced elements like `<img>` or `<input>`.

**Common Mistakes:** `:focus` styles removed with `outline: none` — use `:focus-visible` so keyboard users keep a ring while mouse users don't see one.

---

## What is the difference between `:focus`, `:focus-visible` and `:focus-within`?

### Answer

- **`:focus`** — element has focus, whether by mouse, touch or keyboard.
- **`:focus-visible`** — focus that the browser decides *should* show an indicator (typically keyboard).
- **`:focus-within`** — element **or any descendant** has focus.

### Example

```css
button:focus { outline: none; }                        /* ❌ alone: inaccessible */
button:focus-visible { outline: 3px solid dodgerblue; outline-offset: 2px; } /* ✅ */

.form-field:focus-within { border-color: dodgerblue; } /* highlight the whole field */
```

**Interview Tip:** Removing focus outlines is one of the most common accessibility failures; `:focus-visible` is the correct answer to "designers hate the focus ring".

**Common Mistakes:** `*:focus { outline: none }` in a reset with no replacement.

---

# Box Model & Layout

## What is the difference between `visibility: hidden`, `display: none` and `opacity: 0`?

### Answer

| | `display:none` | `visibility:hidden` | `opacity:0` |
|---|---|---|---|
| Space in layout | Removed | Reserved | Reserved |
| Clickable | No | No | **Yes** |
| Screen reader | Hidden | Hidden | **Read** |
| Animatable | No | No (discrete) | Yes |
| Triggers reflow | Yes | No (repaint) | No (composite) |

### When should we use it?

- **Animate a fade** → `opacity` (+ `pointer-events:none` and `visibility` in the transition).
- **Remove entirely** → `display:none` or the `hidden` attribute.
- **Keep layout stable** → `visibility:hidden`.

### Example

```css
.tooltip {
  opacity: 0;
  visibility: hidden;
  transition: opacity .2s, visibility .2s;
}
.tooltip.open { opacity: 1; visibility: visible; }
```

**Interview Tip:** Modern CSS can animate to `display:none` using `transition-behavior: allow-discrete` plus `@starting-style` — a strong "I keep up" signal.

**Common Mistakes:** Using `opacity:0` to hide a modal — it stays keyboard-focusable and screen readers still announce it.

---

## What is `z-index` and what is a stacking context?

### Answer

`z-index` sets paint order on the z-axis, but **only within the same stacking context**. A stacking context is a self-contained layer: a child can never escape it, no matter how high its `z-index` is.

### Why do we use it?

The #1 real-world CSS bug: "my modal has `z-index: 9999` and is still behind the header."

### When is a stacking context created?

- Root `<html>`
- `position: relative|absolute` + a `z-index` other than `auto`
- `position: fixed` or `sticky` (always)
- `opacity` < 1
- `transform`, `filter`, `perspective`, `backdrop-filter`, `clip-path`, `mask`
- `will-change` on any of the above
- `isolation: isolate`
- flex/grid **item** with `z-index` other than `auto`
- `contain: paint|layout|strict|content`

### Example

```css
.header { position: relative; z-index: 10; }    /* context A */
.modal  { position: fixed;    z-index: 9999; }  /* if inside a transformed parent → trapped */

/* Deliberate isolation instead of z-index escalation */
.card { isolation: isolate; }
```

**Interview Tip:** `opacity: .99` on a parent silently creates a stacking context and traps every child — a legendary debugging story to tell.

**Common Mistakes:** The z-index arms race (`999`, `9999`, `99999`). The fix is auditing stacking contexts, not bigger numbers.

---

## How do you center a div, horizontally and vertically?

### Answer

Six ways, from best to legacy:

### Example

```css
/* 1. Flexbox — the default answer */
.parent { display: flex; justify-content: center; align-items: center; min-height: 100vh; }

/* 2. Grid — shortest */
.parent { display: grid; place-items: center; min-height: 100vh; }

/* 3. Grid with auto margins */
.parent { display: grid; }
.child  { margin: auto; }

/* 4. Absolute + transform — works with unknown size */
.parent { position: relative; }
.child  { position: absolute; inset: 50% auto auto 50%; transform: translate(-50%, -50%); }

/* 5. Absolute + inset:0 + margin:auto — needs a known size */
.child { position: absolute; inset: 0; margin: auto; width: 200px; height: 100px; }

/* 6. Horizontal only, block element with a width */
.child { width: 300px; margin-inline: auto; }
```

**Interview Tip:** `place-items: center` is the shortest correct answer. Then mention `transform: translate(-50%,-50%)` for cases where the element's size is unknown.

**Common Mistakes:** `text-align:center` + `vertical-align:middle` — the latter only affects inline/table-cell content.

---

## What is the difference between `width: auto`, `100%`, `fit-content`, `min-content` and `max-content`?

### Answer

| Value | Meaning |
|---|---|
| `auto` | Fill available space **minus** margins/padding/border (block boxes) |
| `100%` | 100% of the containing block's **content** width — can overflow with `content-box` |
| `min-content` | Narrowest possible without overflow (width of the longest word) |
| `max-content` | As wide as the content wants, no wrapping |
| `fit-content` | `min(max-content, max(min-content, available))` — shrink-wrap, capped |

### Example

```css
.a { width: auto; }         /* safe default for block elements */
.b { width: 100%; }         /* + box-sizing:border-box to avoid overflow */
.c { width: fit-content; margin-inline: auto; }  /* shrink-wrapped & centered */
.d { width: min-content; }  /* stacks each word */
```

**Interview Tip:** `width:100%` on an element with padding **overflows** in `content-box`. That's the strongest argument for a global `border-box` reset.

**Common Mistakes:** Using `width:100%` on flex items, which fights `flex-basis`; use `flex: 1` instead.

---

# Positioning

## Explain the CSS `position` values.

### Answer

| Value | Removed from flow | Positioned relative to | Scrolls with page |
|---|---|---|---|
| `static` (default) | No | — (offsets ignored) | Yes |
| `relative` | No (space kept) | Its own normal position | Yes |
| `absolute` | **Yes** | Nearest positioned ancestor (or initial containing block) | Yes |
| `fixed` | **Yes** | Viewport (or a transformed ancestor!) | **No** |
| `sticky` | No | Scroll container, between thresholds | Hybrid |

### Example

```css
.relative-parent { position: relative; }
.badge { position: absolute; top: -8px; right: -8px; }

.navbar { position: fixed; inset: 0 0 auto 0; }  /* top bar */

.table-header {
  position: sticky;
  top: 0;                 /* REQUIRED — sticky does nothing without a threshold */
  background: #fff;       /* otherwise content shows through */
  z-index: 1;
}
```

**Interview Tip:** `position: fixed` inside an ancestor with `transform`, `filter`, `perspective` or `will-change` becomes fixed **to that ancestor**, not the viewport. This breaks modals inside animated containers constantly.

**Common Mistakes:** `position: sticky` with no `top`/`bottom`; or a parent with `overflow: hidden|auto`, which silently kills stickiness.

---

## Why is my `position: sticky` not working?

### Answer

Checklist:

1. No threshold set (`top`, `bottom`, `left`, `right`) — required.
2. An **ancestor** has `overflow: hidden | auto | scroll` — sticky binds to the nearest scroll container.
3. The parent has no room — sticky only travels within its parent's box, so if the parent is exactly as tall as the element, it can't move.
4. The parent is `display: flex` and the item is stretched.
5. A fixed height on an ancestor clips the scroll range.

### Example

```css
/* ❌ nothing happens */
.side { position: sticky; }

/* ✅ */
.side { position: sticky; top: 1rem; }
.layout { display: grid; grid-template-columns: 1fr 300px; align-items: start; }
/* align-items:start matters — stretched items have no room to move */
```

**Interview Tip:** "Check every ancestor for `overflow`" is the answer that shows you've actually debugged this in production.

---

# Flexbox

## Explain Flexbox and its main properties.

### Answer

A **one-dimensional** layout model: you lay items along a main axis and align them along a cross axis.

### Container properties

```css
.container {
  display: flex;                 /* or inline-flex */
  flex-direction: row;           /* row | row-reverse | column | column-reverse */
  flex-wrap: wrap;               /* nowrap (default) | wrap | wrap-reverse */
  justify-content: space-between;/* main axis: flex-start|center|flex-end|space-between|space-around|space-evenly */
  align-items: center;           /* cross axis, per line: stretch|flex-start|center|flex-end|baseline */
  align-content: center;         /* cross axis, multiple lines — needs wrap */
  gap: 16px;                     /* row-gap column-gap */
}
```

### Item properties

```css
.item {
  flex-grow: 1;      /* share of free space */
  flex-shrink: 1;    /* how much it shrinks when short on space */
  flex-basis: 200px; /* starting size before grow/shrink */
  flex: 1 1 200px;   /* shorthand */
  align-self: flex-end;  /* override align-items for one item */
  order: 2;          /* visual order only — does NOT change DOM/tab order */
}
```

### Why do we use it?

Distribution of space along a single axis: navbars, toolbars, card rows, form rows, centering.

### When should we use it?

Content-driven, one-dimensional layouts. For two-dimensional page layouts, use Grid.

### Example

```css
/* Classic navbar */
.nav { display: flex; align-items: center; justify-content: space-between; gap: 24px; }
.nav .links { display: flex; gap: 16px; margin-left: auto; }

/* Cards that wrap and fill */
.cards { display: flex; flex-wrap: wrap; gap: 16px; }
.card  { flex: 1 1 300px; }   /* min 300px, grow to fill, wrap when needed */
```

**Interview Tip:** Know the `flex` shorthand defaults cold:
`flex: 1` → `1 1 0%` (equal columns, ignores content width)
`flex: auto` → `1 1 auto` (grows, but respects content size)
`flex: none` → `0 0 auto` (fixed)
The `0%` vs `auto` basis is the single most-asked Flexbox detail.

**Common Mistakes:** Using `order` for visual reordering — it doesn't change tab order, so keyboard users get a scrambled experience.

---

## What is the difference between `justify-content`, `align-items`, `align-content` and `align-self`?

### Answer

| Property | Axis | Applies to |
|---|---|---|
| `justify-content` | Main | Distributes items along the main axis |
| `align-items` | Cross | Aligns items within their line |
| `align-content` | Cross | Distributes **lines** (only with `flex-wrap: wrap` and multiple lines) |
| `align-self` | Cross | Overrides `align-items` for one item |
| `place-items` | Both | `align-items` + `justify-items` shorthand (Grid) |

### Example

```css
.row { display: flex; flex-wrap: wrap; height: 400px;
       align-items: center;      /* each item centered in its line */
       align-content: space-between; /* the lines spread top to bottom */
}
```

**Interview Tip:** `align-content` does nothing on a single-line flex container — a frequent "why isn't this working?" question.

**Common Mistakes:** Confusing which axis is "main" after `flex-direction: column` — then `justify-content` controls vertical and `align-items` controls horizontal.

---

## Why does my flex item overflow its container?

### Answer

Flex items have `min-width: auto` by default, meaning they refuse to shrink below their content's intrinsic size (a long word, a wide table, a `<pre>` block).

### Example

```css
.item {
  min-width: 0;      /* the fix — allows shrinking */
  overflow: hidden;
}
/* For columns: min-height: 0 */

/* Common with truncation */
.title { min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
```

**Interview Tip:** `min-width: 0` on flex items and `minmax(0, 1fr)` in Grid are the two magic incantations for overflow. Knowing both marks real experience.

**Common Mistakes:** Adding `overflow:hidden` alone — without `min-width:0` the item is still too wide, it just clips at the wrong size.

---

# CSS Grid

## Explain CSS Grid and its core properties.

### Answer

A **two-dimensional** layout system — rows and columns together.

### Container

```css
.grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  grid-template-rows: 100px auto;
  gap: 20px;                                  /* row-gap column-gap */
  grid-template-areas:
    "header header header"
    "side   main   main";
  justify-items: center;  /* inline axis, per item */
  align-items: center;    /* block axis, per item */
  justify-content: center;/* the whole grid within the container */
  place-items: center;    /* shorthand */
}
```

### Items

```css
.item {
  grid-column: 1 / 3;         /* or: 1 / span 2 */
  grid-row: 2 / 4;
  grid-area: header;          /* named area */
  justify-self: end;
  align-self: start;
}
```

### Why do we use it?

Whole-page layouts, dashboards, image galleries, any design where rows *and* columns must align.

### Example

```css
/* Holy grail layout in 8 lines */
.page {
  display: grid;
  min-height: 100vh;
  grid-template: "header header" auto
                 "side   main"   1fr
                 "footer footer" auto / 240px 1fr;
}
.header { grid-area: header; }
.side   { grid-area: side; }
.main   { grid-area: main; }
.footer { grid-area: footer; }

/* Responsive gallery with ZERO media queries */
.gallery {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 16px;
}
```

**Interview Tip:** `repeat(auto-fit, minmax(250px, 1fr))` is the single most useful line in modern CSS — be ready to explain each part.

**Common Mistakes:** Using `1fr` where content can overflow — use `minmax(0, 1fr)`, because `1fr` means `minmax(auto, 1fr)` and `auto` won't shrink below content size.

---

## What is the difference between `auto-fit` and `auto-fill`?

### Answer

Both repeat as many tracks as fit. The difference appears when there are **fewer items than tracks**:

- **`auto-fill`** — keeps the empty tracks. Items stay at their minimum size, leaving a gap on the right.
- **`auto-fit`** — collapses empty tracks to 0, so existing items stretch to fill the row.

### Example

```css
/* 2 items in a 1200px container, minmax(200px, 1fr) */
.a { grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); }
/* → 2 items at 200px each + 4 empty tracks */

.b { grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); }
/* → 2 items at 600px each, filling the row */
```

**Interview Tip:** "auto-fit stretches, auto-fill leaves ghosts" is the memorable one-liner.

**Common Mistakes:** Using `auto-fit` for a search-results grid where you *want* consistent card widths — `auto-fill` is correct there.

---

## What is `fr` and how does it differ from `%`?

### Answer

`fr` is a **fraction of the remaining free space**, calculated *after* gaps and fixed tracks are subtracted. `%` is a fraction of the total container width and does **not** account for `gap`.

### Example

```css
.a { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; } /* ✅ fits */
.b { display: grid; grid-template-columns: 33.33% 33.33% 33.33%; gap: 20px; } /* ❌ overflows by 40px */
```

**Interview Tip:** `fr` is why Grid rarely needs `calc()` — that's the practical selling point over old percentage layouts.

---

## When should you use Grid vs Flexbox?

### Answer

| | Flexbox | Grid |
|---|---|---|
| Dimensions | One (row **or** column) | Two (rows **and** columns) |
| Driven by | Content | Layout definition |
| Best for | Navbars, toolbars, button groups, centering | Page layout, dashboards, galleries, forms |
| Overlapping items | Awkward | Native (same row/column) |
| Gap support | Yes | Yes |

### Why do we use it?

They compose: Grid for the page skeleton, Flex for the contents of each region.

### Example

```css
.page   { display: grid; grid-template-columns: 240px 1fr; }  /* macro */
.toolbar{ display: flex; gap: 8px; align-items: center; }     /* micro */
```

**Interview Tip:** "Grid is layout-first, Flexbox is content-first" — one sentence that answers the whole question.

**Common Mistakes:** Treating it as either/or. Real apps use both, at different levels.

---

# Responsive Design

## What is responsive design and how do you implement it?

### Answer

Layouts that adapt to viewport size, input type and user preferences using fluid units, media queries, flexible images and mobile-first CSS.

### Example

```html
<meta name="viewport" content="width=device-width, initial-scale=1" />
```

```css
/* Mobile first: base styles are the smallest screen */
.container { padding: 16px; }

@media (min-width: 640px)  { .container { padding: 24px; } }
@media (min-width: 1024px) { .container { max-width: 1024px; margin-inline: auto; } }

/* Fluid type — no breakpoints needed */
h1 { font-size: clamp(1.75rem, 1.2rem + 2.5vw, 3rem); }

/* Intrinsic responsiveness */
.grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); }

/* Respect user preferences */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation-duration: .01ms !important; transition-duration: .01ms !important; }
}
@media (prefers-color-scheme: dark) { :root { --bg: #111; --fg: #eee; } }
```

**Interview Tip:** Argue for **mobile-first** with `min-width`: you start with the simplest layout and progressively add complexity, which produces less CSS and fewer overrides.

**Common Mistakes:** Missing the viewport meta tag (the page renders at 980px and zooms out); using device-specific breakpoints ("iPhone 14 is 390px") instead of content-driven ones.

---

## What are container queries?

### Answer

Media queries respond to the **viewport**. Container queries respond to the size of a **parent container**, so a component can adapt based on the space it was actually given.

### Why do we use it?

A card in a wide main area and the same card in a narrow sidebar should look different — impossible with media queries alone because the viewport is identical.

### When should we use it?

Any reusable component that appears in multiple layout slots. This is *the* enabler of truly reusable component CSS.

### Example

```css
.card-wrapper {
  container-type: inline-size;
  container-name: card;
}

.card { display: grid; gap: 12px; }

@container card (min-width: 400px) {
  .card { grid-template-columns: 150px 1fr; }
  .card h3 { font-size: 1.5rem; }
}

/* Container query units: cqw, cqh, cqi, cqb, cqmin, cqmax */
.card h3 { font-size: clamp(1rem, 5cqi, 2rem); }
```

**Interview Tip:** `container-type: inline-size` is what you want 95% of the time — `size` requires a fixed block size and often collapses the container.

**Common Mistakes:** Querying the element itself instead of a wrapper — an element cannot be its own container.

---

## What is the difference between `em`, `rem`, `%`, `vw/vh`, `ch` and `px`?

### Answer

| Unit | Relative to | Notes |
|---|---|---|
| `px` | Absolute (CSS pixel) | Predictable, ignores user font settings |
| `em` | **Parent's** font-size | Compounds when nested |
| `rem` | **Root** (`html`) font-size | No compounding — the default choice |
| `%` | Parent's corresponding property | Width→parent width, font-size→parent font-size |
| `vw` / `vh` | 1% of viewport width/height | `vh` jumps on mobile as the URL bar hides |
| `svh` / `lvh` / `dvh` | Small / large / dynamic viewport height | Fixes the mobile `100vh` problem |
| `ch` | Width of the `0` glyph | Great for `max-width: 65ch` readable line length |
| `ex`, `cap`, `lh` | Font metrics | Niche but exist |

### Example

```css
html { font-size: 100%; }       /* respects the user's browser setting — 16px default */
h1   { font-size: 2rem; }       /* 32px, scales with user preference */
.btn { padding: .5em 1em; }     /* scales WITH the button's own font-size */

.hero { min-height: 100dvh; }   /* not 100vh — avoids the mobile jump */
p     { max-width: 65ch; }      /* optimal reading measure */
```

**Interview Tip:** Never set `html { font-size: 62.5% }` to "make rem math easy" — it overrides a user who increased their default font size for accessibility.

**Common Mistakes:** `em` for font-size on nested lists, where sizes compound to unreadable extremes; `100vh` on mobile causing content to hide under the browser chrome.

---

# Units & Values

## What are CSS custom properties (variables)?

### Answer

User-defined properties (`--name`) that are **inherited**, live at runtime, and readable/writable from JavaScript — unlike Sass variables, which are compiled away.

### Why do we use it?

Theming, design tokens, runtime changes (dark mode, user-picked accent colour) without recompiling anything.

### When should we use it?

Design tokens, component-level configuration APIs, and any value that changes at runtime.

### Example

```css
:root {
  --brand: #2563eb;
  --space: 8px;
  --radius: 6px;
  --shadow: 0 1px 3px rgb(0 0 0 / .12);
}

[data-theme="dark"] {
  --brand: #60a5fa;
  --shadow: 0 1px 3px rgb(0 0 0 / .6);
}

.btn {
  --btn-bg: var(--brand);          /* component-level API */
  background: var(--btn-bg);
  padding: var(--space) calc(var(--space) * 2);
  border-radius: var(--radius);
}
.btn--danger { --btn-bg: crimson; } /* override one variable, not the rule */
```

```js
// Read & write from JS
getComputedStyle(document.documentElement).getPropertyValue('--brand');
document.documentElement.style.setProperty('--brand', '#e11d48');
```

```css
/* Typed custom properties — animatable! */
@property --angle {
  syntax: '<angle>';
  initial-value: 0deg;
  inherits: false;
}
.spin { background: linear-gradient(var(--angle), red, blue); transition: --angle 1s; }
```

**Interview Tip:** Custom properties **cascade and inherit**; Sass variables don't exist at runtime. That's the whole difference and the most common question.

**Common Mistakes:** Using them in media query conditions (`@media (min-width: var(--bp))` — not supported); forgetting a fallback: `var(--x, 16px)`.

---

## What is `calc()`, `clamp()`, `min()` and `max()`?

### Answer

Math functions that mix units at runtime.

- `calc()` — arithmetic across units
- `min(a, b)` — the smaller (sets a *maximum* in practice)
- `max(a, b)` — the larger (sets a *minimum*)
- `clamp(min, preferred, max)` — shorthand for `max(min, min(preferred, max))`

### Example

```css
.sidebar  { width: calc(100% - 240px); }
.section  { padding-inline: max(1rem, 5vw); }   /* never below 1rem */
.wrapper  { width: min(100% - 2rem, 1200px); }  /* responsive container, no media query */

h1 { font-size: clamp(1.5rem, 1rem + 3vw, 3.5rem); }  /* fluid type */
```

**Interview Tip:** `width: min(100% - 2rem, 1200px)` replaces the classic `max-width` + `padding` + `margin:auto` container pattern in one line.

**Common Mistakes:** Missing spaces around `+` and `-` in `calc()` — `calc(100%-20px)` is invalid (`-20px` parses as a signed number). `*` and `/` don't need spaces but be consistent.

---

# Transitions & Animations

## What is the difference between transition and animation?

### Answer

| | `transition` | `animation` (`@keyframes`) |
|---|---|---|
| Trigger | A state/property change | Runs automatically |
| Steps | Two (start → end) | Any number of keyframes |
| Loop | No | `infinite` supported |
| Control | Limited | `play-state`, `direction`, `fill-mode`, `delay` |
| Best for | Hover, focus, class toggles | Loaders, attention effects, complex sequences |

### Example

```css
/* Transition */
.btn {
  background: #2563eb;
  transition: background .2s ease, transform .2s ease;
}
.btn:hover { background: #1d4ed8; transform: translateY(-2px); }

/* Animation */
@keyframes pulse {
  0%, 100% { transform: scale(1);   opacity: 1; }
  50%      { transform: scale(1.1); opacity: .7; }
}
.badge {
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }
.spinner { animation: spin 1s linear infinite; }
```

### Longhand properties

```css
.x {
  transition-property: opacity;
  transition-duration: .3s;
  transition-timing-function: cubic-bezier(.4, 0, .2, 1);
  transition-delay: .1s;

  animation-name: pulse;
  animation-duration: 2s;
  animation-timing-function: ease;
  animation-delay: 0s;
  animation-iteration-count: infinite;
  animation-direction: alternate;
  animation-fill-mode: both;     /* keeps the first/last keyframe state */
  animation-play-state: running;
}
```

**Interview Tip:** `transition: all` is a performance and correctness smell — it animates properties you never intended (including newly added ones). Name your properties.

**Common Mistakes:** Transitioning `height: auto` — it doesn't work. Use `max-height`, `grid-template-rows: 0fr → 1fr`, or `calc-size()` in the newest browsers.

---

## Which CSS properties are cheap to animate and why?

### Answer

Only `transform` and `opacity` can be handled entirely by the **compositor** on the GPU, skipping layout and paint.

```
Layout (reflow) → Paint → Composite
  width, height, margin, padding, top, left  → all three  ❌ expensive
  color, background, box-shadow, border-radius → paint + composite ⚠️
  transform, opacity, filter                  → composite only ✅ cheap
```

### Why do we use it?

Animating `left` recalculates layout on **every frame**; at 60fps you have 16.6ms per frame and layout alone can blow it.

### Example

```css
/* ❌ janky */
.box { transition: left .3s; left: 0; }
.box.move { left: 200px; }

/* ✅ smooth */
.box { transition: transform .3s; }
.box.move { transform: translateX(200px); }

/* Hint the compositor — use sparingly */
.card { will-change: transform; }
```

**Interview Tip:** Mention `will-change` promotes an element to its own layer — powerful but memory-hungry; never apply it to hundreds of elements or leave it on permanently.

**Common Mistakes:** Animating `box-shadow` on hover for many cards — animate a pseudo-element's `opacity` instead.

---

## How do you respect `prefers-reduced-motion`?

### Answer

A media feature reflecting an OS-level setting for users with vestibular disorders.

### Example

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: .01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: .01ms !important;
    scroll-behavior: auto !important;
  }
}

/* Or opt in the other way */
@media (prefers-reduced-motion: no-preference) {
  .card { transition: transform .3s; }
}
```

**Interview Tip:** Bring this up unprompted when asked about animations — it's a strong senior/accessibility signal.

**Common Mistakes:** Removing motion entirely; users often still want a fast cross-fade, just not parallax and large movement.

---

# Modern CSS

## What is `aspect-ratio`?

### Answer

Sets the ratio between width and height so the browser computes the missing dimension — replacing the old `padding-top: 56.25%` hack.

### Example

```css
.video { aspect-ratio: 16 / 9; width: 100%; }
.avatar { aspect-ratio: 1; width: 48px; border-radius: 50%; object-fit: cover; }
```

**Interview Tip:** Pair with `object-fit: cover` so images fill the box without distortion, and mention it prevents CLS.

---

## What is `object-fit` and `object-position`?

### Answer

How a replaced element (`img`, `video`) fills its box:

- `fill` (default, distorts), `contain` (letterbox), `cover` (crops), `none`, `scale-down`.
- `object-position` sets the focal point.

### Example

```css
.thumb {
  width: 300px; height: 200px;
  object-fit: cover;
  object-position: center top;  /* keep faces in frame */
}
```

**Interview Tip:** `object-fit` is to `<img>` what `background-size` is to background images.

---

## What are logical properties?

### Answer

Direction-agnostic properties that follow writing mode instead of physical screen directions.

| Physical | Logical |
|---|---|
| `margin-left/right` | `margin-inline-start/end` |
| `margin-top/bottom` | `margin-block-start/end` |
| `width` / `height` | `inline-size` / `block-size` |
| `text-align: left` | `text-align: start` |
| `top/right/bottom/left` | `inset-block-start` … or `inset` shorthand |

### Why do we use it?

RTL support (Arabic, Hebrew) for free — no separate stylesheet.

### Example

```css
.card { margin-inline: auto; padding-block: 24px; padding-inline: 16px; }
.modal { position: fixed; inset: 0; }   /* top/right/bottom/left: 0 */
```

**Interview Tip:** `margin-inline: auto` is the modern `margin: 0 auto`, and `inset: 0` replaces four lines.

---

## What is `:root` and how do you implement dark mode?

### Answer

`:root` matches `<html>` with slightly higher specificity than the `html` type selector — the conventional home for global custom properties.

### Example

```css
:root {
  color-scheme: light dark;   /* native form controls & scrollbars adapt */
  --bg: #ffffff;
  --fg: #111111;
}

@media (prefers-color-scheme: dark) {
  :root { --bg: #0b0f19; --fg: #e5e7eb; }
}

/* Manual override wins over the system preference */
[data-theme="light"] { --bg: #ffffff; --fg: #111111; }
[data-theme="dark"]  { --bg: #0b0f19; --fg: #e5e7eb; }

body { background: var(--bg); color: var(--fg); }
```

```js
document.documentElement.dataset.theme = 'dark';
localStorage.setItem('theme', 'dark');
```

**Interview Tip:** Mention `color-scheme` — it's what makes native scrollbars, `<select>` menus and form controls switch to dark. Most candidates miss it. Also mention the "flash of wrong theme" fix: a tiny blocking inline script in `<head>` that sets the attribute before first paint.

**Common Mistakes:** Toggling a `.dark` class on `<body>` and having the page background flash white on load.

---

## What is `@supports`?

### Answer

Feature queries — apply CSS only when the browser supports a declaration.

### Example

```css
@supports (display: grid) {
  .layout { display: grid; }
}

@supports not (aspect-ratio: 1) {
  .box { padding-top: 56.25%; }   /* fallback */
}

@supports selector(:has(a)) {
  .card:has(img) { grid-template-columns: 120px 1fr; }
}
```

**Interview Tip:** Combine with progressive enhancement: write the fallback first, then enhance inside `@supports`.

---

# Architecture & Performance

## What is BEM and why use a naming convention?

### Answer

**Block__Element--Modifier** — a flat, predictable naming scheme.

- **Block** — standalone component: `.card`
- **Element** — a part of it: `.card__title`
- **Modifier** — a variant: `.card--featured`, `.card__title--large`

### Why do we use it?

Everything is a single class, so specificity stays flat (`0,0,1,0`) and overriding is trivial. Names document the relationship without nesting.

### Example

```html
<article class="card card--featured">
  <img class="card__image" src="…" alt="" />
  <h3 class="card__title card__title--large">Title</h3>
  <p class="card__text">…</p>
</article>
```

```css
.card { }
.card--featured { border-color: gold; }
.card__title { font-size: 1.25rem; }
.card__title--large { font-size: 1.5rem; }
```

**Interview Tip:** Contrast with alternatives: CSS Modules (compiler-scoped names), utility-first (Tailwind), CSS-in-JS (styled-components), and native scoping with `@scope`. Show you know the tradeoffs, not just one dogma.

**Common Mistakes:** `.card__body__title` — BEM elements never nest. Blocks nest; names stay two levels.

---

## How do you optimise CSS performance?

### Answer

1. **Reduce blocking CSS** — inline critical above-the-fold styles, load the rest async.
2. **Remove unused CSS** — PurgeCSS / Tailwind's JIT.
3. **Minify + compress** (Brotli).
4. **Avoid `@import` in CSS** — it serialises requests; bundle instead.
5. **Keep selectors shallow** — browsers match right-to-left, so `div ul li a` evaluates every `a` first.
6. **Animate only `transform`/`opacity`.**
7. **Use `content-visibility: auto`** to skip rendering offscreen sections.
8. **`contain`** to limit layout/paint invalidation scope.

### Example

```css
/* Skip rendering work for long offscreen lists */
.section {
  content-visibility: auto;
  contain-intrinsic-size: auto 500px;  /* prevents scrollbar jumping */
}

.widget { contain: layout paint; }
```

**Interview Tip:** `content-visibility: auto` can cut initial render time dramatically on long pages — a concrete, measurable answer most candidates don't have.

**Common Mistakes:** Micro-optimising selector speed (irrelevant in modern engines) while shipping 400KB of unused CSS (very relevant).

---

## What causes reflow (layout) and repaint?

### Answer

- **Reflow / layout** — geometry changes: `width`, `height`, `padding`, `margin`, `border`, `position`, `font-size`, adding/removing DOM nodes, or **reading** layout properties.
- **Repaint** — visual-only changes: `color`, `background`, `visibility`, `box-shadow`.
- **Composite** — `transform`, `opacity`.

### Layout thrashing

```js
// ❌ Forced synchronous layout — read/write interleaved, reflow per iteration
for (const el of items) {
  el.style.height = el.offsetHeight + 10 + 'px';
}

// ✅ Batch reads, then writes
const heights = items.map((el) => el.offsetHeight);   // read phase
items.forEach((el, i) => { el.style.height = heights[i] + 10 + 'px'; }); // write phase
```

Properties that force synchronous layout when read: `offsetTop/Left/Width/Height`, `clientTop/Left/Width/Height`, `scrollTop/Left/Width/Height`, `getComputedStyle()`, `getBoundingClientRect()`.

**Interview Tip:** Name it: "layout thrashing" or "forced synchronous layout". Mention `requestAnimationFrame` for batching writes.

**Common Mistakes:** Reading `getBoundingClientRect()` inside a scroll handler on every frame for every element.

---

## What is CSS-in-JS vs CSS Modules vs Tailwind vs plain CSS?

### Answer

| Approach | Scoping | Runtime cost | Dynamic styles | Notes |
|---|---|---|---|---|
| Plain CSS + BEM | Convention | None | Custom properties | Simple, requires discipline |
| CSS Modules | Compiler-hashed names | None | Custom properties | Great default for React/Next |
| CSS-in-JS (styled-components, Emotion) | Automatic | **Runtime** (unless zero-runtime) | Full JS | RSC-unfriendly; declining |
| Zero-runtime (vanilla-extract, Linaria, Panda) | Compiler | None | Build-time variants | Best of both |
| Tailwind (utility-first) | Atomic classes | None | Arbitrary values | Tiny CSS output, verbose markup |

### Why do we use it?

The real problem is **scoping and dead-code elimination**, not syntax.

**Interview Tip:** For Next.js App Router specifically, note that runtime CSS-in-JS doesn't work in Server Components — that's why the ecosystem moved to CSS Modules, Tailwind and zero-runtime libraries.

**Common Mistakes:** Choosing based on preference alone. Interviewers want the tradeoff reasoning: bundle size, SSR, DX, team size.

---

# Rapid Fire

**What is the difference between `rem` and `em` for spacing?**
`rem` gives consistent global rhythm; `em` scales with the component's own font-size, which is ideal for button padding.

**What does `* { margin: 0; padding: 0 }` do?**
A crude reset. Modern resets (Josh Comeau's, Normalize) are more surgical and also fix `box-sizing`, `line-height`, image defaults and form font inheritance.

**How do you truncate text to one line?**
`white-space: nowrap; overflow: hidden; text-overflow: ellipsis;` (plus `min-width: 0` if it's a flex item).

**How do you truncate to multiple lines?**
`display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden;` — or the newer standard `line-clamp: 3`.

**What is the difference between `nth-child` and `nth-of-type`?**
`nth-child(2)` matches an element that is the 2nd child *and* matches the selector; `nth-of-type(2)` counts only elements of that tag type.

**What does `pointer-events: none` do?**
Makes an element transparent to mouse/touch events; clicks pass through to what's underneath. Also disables its own `:hover`.

**What is `will-change`?**
A hint to promote an element to its own compositor layer before animating. Overuse consumes GPU memory — apply just before animating, remove after.

**What is the difference between `background-size: cover` and `contain`?**
`cover` fills the box and crops; `contain` fits entirely and may letterbox.

**What is a CSS sprite?**
Combining many images into one file and revealing parts with `background-position`. Largely obsolete under HTTP/2; SVG sprites/icon fonts replaced it.

**What is the difference between `visibility: collapse` and `hidden`?**
On table rows/columns, `collapse` removes the row like `display:none`; elsewhere it behaves as `hidden`.

**How do you create a triangle in CSS?**
Zero width/height plus thick transparent borders on three sides — or `clip-path: polygon(50% 0, 100% 100%, 0 100%)` today.

**What is `clip-path`?**
Clips an element to a shape (polygon, circle, inset, SVG path). Animatable and useful for reveal effects.

**What is `backdrop-filter`?**
Applies a filter (usually `blur`) to whatever is *behind* the element — the frosted-glass effect. Needs a semi-transparent background to be visible.

**What is `mix-blend-mode` vs `background-blend-mode`?**
The former blends an element with its backdrop; the latter blends an element's own multiple backgrounds together.

**What is `scroll-snap`?**
Native carousel/slide snapping: `scroll-snap-type: x mandatory` on the container, `scroll-snap-align: center` on the children.

**What is `overscroll-behavior`?**
`contain` stops scroll chaining (a modal scrolling the page behind it); `none` also disables pull-to-refresh.

**What is `accent-color`?**
One property to theme native checkboxes, radios, range sliders and progress bars.

**What is `:is()` vs `:where()`?**
Both group selectors. `:is()` takes its most specific argument's specificity; `:where()` is always zero — ideal for resets and library defaults.

**What is the `!important` order between two `!important` rules?**
Normal cascade rules apply among them: specificity, then source order. In cascade layers, `!important` order is **reversed** — earlier layers win.

**What is `@scope`?**
Native style scoping: `@scope (.card) to (.content) { … }` limits rules to a subtree with a donut hole — CSS Modules-like behaviour without a build step.

**Why doesn't `text-align: center` center a div?**
It centers **inline content** inside the box, not the box itself. Use `margin-inline: auto` or Flex/Grid centering.

**What is `line-height: 1.5` vs `150%` vs `1.5em`?**
The unitless `1.5` is inherited as a *ratio* and recalculated per element — the others inherit a computed pixel value, which breaks nested elements with different font sizes. Always use unitless.

**How do you style a broken image?**
`img::before`/`::after` render when the image fails to load (browser-dependent), or use `onerror` to swap a class.

**What is `currentColor`?**
A keyword resolving to the element's `color` value — perfect for SVG icons and borders that follow text colour automatically.

**What is `:empty`?**
Matches elements with no children *and no text*, including whitespace. Whitespace in your HTML makes it not match — a common surprise.

---

## 📌 Interview Checklist

- [ ] Explain specificity with a real example, including `:is()`/`:where()`
- [ ] Five ways to center; the best one for unknown-size children
- [ ] `flex: 1` vs `flex: auto` — what's the basis?
- [ ] `auto-fit` vs `auto-fill`
- [ ] Why does my `position: fixed` modal not cover the page?
- [ ] Which properties are cheap to animate and why?
- [ ] What creates a stacking context? Name five triggers.
- [ ] Container queries vs media queries — one sentence
- [ ] How do you implement dark mode without a flash?
- [ ] What is layout thrashing and how do you fix it?
