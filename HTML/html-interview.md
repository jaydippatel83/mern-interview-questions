# 🧱 HTML Interview Questions

> Semantics · Forms · Accessibility · SEO · Storage · Performance

---

## Table of Contents

1. [Basics & Document Structure](#basics--document-structure)
2. [Semantic HTML](#semantic-html)
3. [Forms & Validation](#forms--validation)
4. [Media & Graphics](#media--graphics)
5. [Accessibility (a11y)](#accessibility-a11y)
6. [SEO & Meta](#seo--meta)
7. [Storage & Browser APIs](#storage--browser-apis)
8. [Performance & Loading](#performance--loading)
9. [Rapid Fire](#rapid-fire)

---

# Basics & Document Structure

## What is `<!DOCTYPE html>` and what happens if you omit it?

### Answer

`<!DOCTYPE html>` is a **document type declaration**, not an HTML tag. It tells the browser to render the page in **standards mode** using the HTML5 parsing rules.

If you omit it, the browser falls back to **quirks mode**, where it emulates decades-old bugs from IE5/Netscape for backwards compatibility.

### Why do we use it?

Quirks mode changes real behaviour that will break your layout:

| Behaviour | Standards mode | Quirks mode |
|---|---|---|
| `box-sizing` default | `content-box` | `border-box`-ish for some elements |
| Height of `<html>`/`<body>` | `auto` | stretched to viewport |
| `line-height` on inline images | baseline-aligned | inconsistent |
| `document.compatMode` | `"CSS1Compat"` | `"BackCompat"` |

### When should we use it?

Always. It must be the **first line** of every HTML document, before any comment or whitespace-sensitive content.

### Example

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>My Page</title>
  </head>
  <body>
    <h1>Hello</h1>
  </body>
</html>
```

```js
// Verify in the console
document.compatMode; // "CSS1Compat" = standards, "BackCompat" = quirks
```

**Interview Tip:** If asked "is DOCTYPE an HTML tag?" — say no, it is a parser instruction. That single detail separates people who memorised boilerplate from people who understand it.

**Common Mistakes:** Writing legacy XHTML doctypes; putting a comment or a BOM above the doctype, which silently triggers quirks mode in older browsers.

---

## What is the difference between HTML and HTML5?

### Answer

HTML5 is the current living standard. Compared to HTML4/XHTML it adds:

- **Semantic elements** — `<header>`, `<nav>`, `<main>`, `<article>`, `<section>`, `<aside>`, `<footer>`, `<figure>`
- **Media** — native `<audio>`, `<video>` (no Flash)
- **Graphics** — `<canvas>`, inline `<svg>`
- **Form types** — `email`, `date`, `range`, `color`, `number`, plus `required`/`pattern` validation
- **APIs** — localStorage, sessionStorage, Geolocation, Web Workers, WebSockets, History API, Drag & Drop
- **Simplified doctype and charset** — `<!DOCTYPE html>`, `<meta charset="UTF-8">`
- **Error-tolerant parsing** — a defined recovery algorithm instead of undefined behaviour

### Why do we use it?

It removed the need for plugins, made documents machine-readable for search engines and screen readers, and standardised what browsers were already doing differently.

### When should we use it?

Every new project. There is no reason to author HTML4 today.

### Example

```html
<!-- HTML4 style -->
<div id="header"></div>
<div id="nav"></div>
<div class="article"></div>

<!-- HTML5 -->
<header></header>
<nav></nav>
<article></article>
```

**Interview Tip:** Frame HTML5 as "semantics + native media + APIs", not just "new tags".

**Common Mistakes:** Claiming HTML5 is a version number — it is a living standard maintained by WHATWG; versioning stopped after 5.2.

---

## What is the difference between block, inline and inline-block elements?

### Answer

| | Block | Inline | Inline-block |
|---|---|---|---|
| Starts new line | Yes | No | No |
| Takes full width | Yes | No (content width) | No (content width) |
| `width` / `height` respected | Yes | **No** | Yes |
| Vertical margin/padding | Yes | Padding renders but doesn't push siblings | Yes |
| Examples | `div`, `p`, `h1`, `section` | `span`, `a`, `strong`, `img*` | buttons, `input` |

`<img>` is technically `inline` but is a *replaced element*, so it does accept width/height.

### Why do we use it?

Understanding the default display avoids the classic "why won't my `<span>` take a height?" bug.

### When should we use it?

- **Block** for layout containers.
- **Inline** for text-level markup.
- **Inline-block** when you want elements side-by-side but still sizable — though Flexbox is usually a better answer today.

### Example

```html
<span style="width:200px; height:100px; background:tomato">
  width/height ignored
</span>

<span style="display:inline-block; width:200px; height:100px; background:teal">
  now it works
</span>
```

**Interview Tip:** Mention the ~4px whitespace gap between `inline-block` elements caused by newlines in the HTML source, and that `display:flex` on the parent removes it.

**Common Mistakes:** Putting a block element inside `<p>` — the parser auto-closes the paragraph and your DOM does not match your source.

---

## What is the difference between `<div>` and `<span>`?

### Answer

Both are **generic, non-semantic containers**. `<div>` is block-level and used for grouping layout regions; `<span>` is inline and used for styling a piece of text inside a line.

### Why do we use it?

When no semantic element fits, these are the neutral hooks for CSS and JS.

### When should we use it?

Only when nothing semantic applies. If the content is navigation use `<nav>`, if it is a self-contained post use `<article>`.

### Example

```html
<div class="card">
  <p>Total: <span class="price">₹1,499</span></p>
</div>
```

**Interview Tip:** "Div soup" is a real code-review comment. Say you reach for semantic elements first and `div` last.

**Common Mistakes:** Wrapping everything in `div`s and then adding ARIA roles to fake semantics that a native element gives for free.

---

## What are `data-*` attributes?

### Answer

Custom attributes prefixed with `data-` that store extra information on an element without inventing non-standard attributes. They are exposed in JS through `element.dataset`.

### Why do we use it?

They are valid HTML, do not collide with future spec attributes, and are readable from both CSS (`[data-state="open"]`) and JS.

### When should we use it?

For small bits of state or identifiers used by your own scripts — a row id, a modal target, an analytics label. **Not** for large data blobs (use JS state) and never for secrets.

### Example

```html
<button data-user-id="42" data-role="admin" class="btn">Delete</button>
```

```js
const btn = document.querySelector('.btn');
btn.dataset.userId; // "42"  (kebab-case → camelCase)
btn.dataset.role;   // "admin"
btn.dataset.role = 'editor'; // writes back to the DOM
```

```css
button[data-role="admin"] { border-color: crimson; }
```

**Interview Tip:** Note that `dataset` values are always **strings** — `data-count="0"` is truthy as `"0"`.

**Common Mistakes:** Storing sensitive data (prices to be trusted, permissions) in `data-*` — anyone can edit it in DevTools; always re-validate server-side.

---

## What is the difference between `id` and `class`?

### Answer

`id` is a **unique** identifier — one per document. `class` is a **reusable** grouping — many elements can share it, and one element can have many classes.

Specificity: `id` (0,1,0,0) beats `class` (0,0,1,0).

### Why do we use it?

`id` gives a stable anchor target (`#section`), a `label for=` target, and a fast `getElementById`. `class` gives reusable styling.

### When should we use it?

- Style with **classes**, always.
- Use `id` for anchors, form label association, and `aria-labelledby`/`aria-describedby` references.

### Example

```html
<label for="email">Email</label>
<input id="email" class="input input--lg" type="email" />
```

**Interview Tip:** Say "I don't style with IDs because the specificity is hard to override, and it fights any design-system convention."

**Common Mistakes:** Duplicating an `id` — `getElementById` silently returns only the first, and label association breaks.

---

## What is the difference between `<head>` and `<body>`?

### Answer

`<head>` holds **metadata** for the document — title, charset, viewport, stylesheets, scripts, SEO and social meta. Nothing in it renders (except `<title>` in the tab).
`<body>` holds the **rendered content**.

### Why do we use it?

The browser needs charset and viewport before it paints; putting them in `<head>` avoids re-parsing and layout shift.

### When should we use it?

`<meta charset>` must be within the **first 1024 bytes** of the document, so it goes first in `<head>`.

### Example

```html
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Products — Shop</title>
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link rel="stylesheet" href="/styles.css" />
</head>
```

**Interview Tip:** Explain *why* charset is first: the parser may have to restart if it discovers the encoding late.

**Common Mistakes:** Blocking render with synchronous third-party scripts at the top of `<head>`.

---

## What are void / self-closing elements?

### Answer

Elements that cannot have children or a closing tag: `<br>`, `<hr>`, `<img>`, `<input>`, `<meta>`, `<link>`, `<source>`, `<track>`, `<area>`, `<base>`, `<col>`, `<embed>`, `<wbr>`.

### Why do we use it?

They represent content that has no inner markup — a line break, an image reference, a metadata directive.

### When should we use it?

In HTML the trailing slash (`<br />`) is optional and ignored. In JSX/XHTML it is **required**.

### Example

```html
<img src="/logo.png" alt="Company logo" />
<input type="email" name="email" required />
<br />
```

**Interview Tip:** In HTML5, `<br/>` and `<br>` parse identically; the slash matters only in XML-based syntaxes like JSX.

**Common Mistakes:** Writing `<img></img>` — the closing tag is simply dropped by the parser.

---

## What is the difference between `<link>` and `<a>`?

### Answer

`<link>` is a **metadata** element in `<head>` describing a relationship to an external resource (stylesheet, icon, preload, canonical). `<a>` is a **user-clickable hyperlink** in the body.

### Why do we use it?

Browsers act on `<link>` automatically (fetch the CSS, preload the font). `<a>` waits for user intent.

### When should we use it?

```html
<link rel="stylesheet" href="/main.css" />
<link rel="canonical" href="https://site.com/product/1" />
<link rel="preload" as="font" href="/inter.woff2" type="font/woff2" crossorigin />
<link rel="icon" href="/favicon.svg" />
```

### Example

```html
<a href="/pricing" rel="noopener" target="_blank">See pricing</a>
```

**Interview Tip:** Know these `rel` values: `stylesheet`, `preload`, `prefetch`, `preconnect`, `dns-prefetch`, `canonical`, `icon`, `manifest`, `alternate`.

**Common Mistakes:** `target="_blank"` without `rel="noopener noreferrer"` in older browsers — the opened page gets `window.opener` access (reverse tabnabbing). Modern browsers imply `noopener`, but be explicit.

---

## What is the difference between `<script>`, `<script async>` and `<script defer>`?

### Answer

| | Blocks HTML parsing | Download | Execution order | Executes |
|---|---|---|---|---|
| `<script>` | **Yes** | blocking | document order | immediately when reached |
| `<script async>` | No | parallel | **whenever it finishes** (unordered) | as soon as downloaded |
| `<script defer>` | No | parallel | document order | after parsing, before `DOMContentLoaded` |
| `<script type="module">` | No | parallel | document order | deferred by default |

### Why do we use it?

A plain `<script>` in `<head>` stalls the parser and delays First Contentful Paint.

### When should we use it?

- **`defer`** — your app code that touches the DOM and depends on other scripts.
- **`async`** — independent third-party scripts (analytics) that don't depend on the DOM or each other.
- **plain** — almost never; only tiny inline critical scripts.

### Example

```html
<head>
  <script defer src="/app.js"></script>
  <script async src="https://analytics.example.com/a.js"></script>
</head>
```

**Interview Tip:** Draw the timeline — parse ▸ download ▸ execute — for all three. Interviewers love that answer.

**Common Mistakes:** Using `async` on scripts with dependencies (jQuery + a plugin), producing intermittent "$ is not defined" errors that only appear on slow networks.

---

# Semantic HTML

## What is semantic HTML and why does it matter?

### Answer

Semantic HTML uses elements that describe the **meaning** of their content rather than its appearance — `<article>` instead of `<div class="article">`.

### Why do we use it?

1. **Accessibility** — screen readers build a landmark list from `<nav>`, `<main>`, `<header>`; users jump between them.
2. **SEO** — crawlers weight `<h1>`, `<article>`, `<time>` content.
3. **Maintainability** — the markup documents itself.
4. **Free behaviour** — `<button>` gets keyboard focus, Enter/Space activation and a role for nothing.

### When should we use it?

Always prefer the semantic element. Fall back to `div`/`span` only when no element fits.

### Example

```html
<body>
  <header>
    <nav aria-label="Main"><!-- links --></nav>
  </header>

  <main>
    <article>
      <h1>Understanding the Event Loop</h1>
      <p>Published <time datetime="2026-02-11">11 Feb 2026</time></p>
      <section><h2>The call stack</h2><p>…</p></section>
      <figure>
        <img src="/loop.png" alt="Diagram of the event loop phases" />
        <figcaption>Event loop phases</figcaption>
      </figure>
    </article>
    <aside><h2>Related</h2></aside>
  </main>

  <footer><p>&copy; 2026</p></footer>
</body>
```

**Interview Tip:** The killer line: *"a `<div onclick>` is not a button — it loses keyboard focus, Enter/Space, and the button role. I'd have to re-implement three things the platform gives me free."*

**Common Mistakes:** Using `<section>` without a heading (it must have one), or using it purely as a styling wrapper where `<div>` is correct.

---

## What is the difference between `<article>`, `<section>` and `<div>`?

### Answer

- **`<article>`** — self-contained, independently distributable content. If you could syndicate it in an RSS feed, it's an article. Blog post, product card, comment, tweet.
- **`<section>`** — a thematic grouping **with a heading**, part of a larger whole. Chapters of a document.
- **`<div>`** — no semantics, pure grouping for CSS/JS.

### Why do we use it?

They shape the document outline that assistive technology navigates.

### When should we use it?

Ask: *Does it make sense on its own?* → `article`. *Is it a titled part of something bigger?* → `section`. *Neither?* → `div`.

### Example

```html
<article class="post">
  <h2>MERN Interview Prep</h2>
  <section><h3>Frontend</h3><p>…</p></section>
  <section><h3>Backend</h3><p>…</p></section>

  <section class="comments">
    <h3>Comments</h3>
    <article class="comment"><h4>Jaydip</h4><p>Great post!</p></article>
  </section>
</article>
```

Note a comment is an `<article>` nested inside an `<article>` — that is correct.

**Interview Tip:** "Section needs a heading" is the one-line rule that shows you actually read the spec.

**Common Mistakes:** `<section>` used as a generic wrapper, creating a document outline full of unnamed sections.

---

## What is the correct use of heading tags `<h1>`–`<h6>`?

### Answer

Headings define the document outline. They must be used in **descending order without skipping** levels, and they are not font-size controls.

### Why do we use it?

Screen-reader users list headings to navigate a page; a broken hierarchy makes the page unusable. Search engines use them for structure.

### When should we use it?

- One `<h1>` per page (or per `<article>` in HTML5 outline terms — but stick to one for safety).
- Never jump `h2` → `h4`.
- If you need a smaller heading, change the CSS, not the tag.

### Example

```html
<h1>Full Stack Interview Handbook</h1>
  <h2>JavaScript</h2>
    <h3>Closures</h3>
    <h3>Promises</h3>
  <h2>React</h2>
    <h3>Hooks</h3>
```

```css
h3 { font-size: 1rem; } /* style, don't downgrade the tag */
```

**Interview Tip:** Mention you audit headings with the accessibility tree in Chrome DevTools or the "headings" list in a screen reader.

**Common Mistakes:** Multiple `<h1>`s in a component-based app because every card component ships its own `<h1>`.

---

## What are `<figure>` and `<figcaption>`?

### Answer

`<figure>` marks self-contained referenced content — an image, chart, code listing, quote — and `<figcaption>` gives it an accessible caption.

### Why do we use it?

The caption is programmatically associated with the media, so screen readers announce them together. A plain `<p>` under an image has no such link.

### When should we use it?

When the content is referenced from the main flow ("see Figure 2") and could be moved elsewhere without breaking meaning.

### Example

```html
<figure>
  <img src="/architecture.png" alt="Three-tier architecture: client, API, database" />
  <figcaption>Fig 2. Request flow through the API gateway.</figcaption>
</figure>
```

**Interview Tip:** `alt` describes the image for someone who can't see it; `figcaption` is visible to everyone. They should **not** be identical.

**Common Mistakes:** Duplicating the caption text in `alt`, which makes screen readers announce it twice.

---

## What is the difference between `<strong>`/`<b>` and `<em>`/`<i>`?

### Answer

| Tag | Meaning | Announced by screen reader |
|---|---|---|
| `<strong>` | strong importance / urgency | Yes, with emphasis |
| `<b>` | stylistically offset, no importance (keywords, product names) | No |
| `<em>` | stress emphasis that changes sentence meaning | Yes |
| `<i>` | alternate voice — foreign phrase, technical term, thought | No |

### Why do we use it?

`<strong>`/`<em>` carry semantics; `<b>`/`<i>` are purely presentational holdovers kept for legacy meaning.

### When should we use it?

Use `<strong>` for warnings and important text, `<em>` when the emphasis changes the meaning of the sentence, and CSS `font-weight`/`font-style` when it is purely visual.

### Example

```html
<p><strong>Warning:</strong> this deletes your account.</p>
<p>I <em>never</em> said she stole it.</p>
<p>The <i lang="la">status quo</i> remains.</p>
```

**Interview Tip:** "Never use `<b>` for headings" — heading weight comes from `<h*>` + CSS.

**Common Mistakes:** Using `<strong>` everywhere for bold styling, which makes screen readers shout the entire page.

---

# Forms & Validation

## What are the most important input types in HTML5?

### Answer

`text`, `email`, `password`, `number`, `tel`, `url`, `search`, `date`, `datetime-local`, `time`, `month`, `week`, `range`, `color`, `file`, `checkbox`, `radio`, `hidden`, `submit`.

### Why do we use it?

The type drives three things for free: the **mobile keyboard**, **native validation**, and the **UI widget** (date picker, colour picker, slider).

### When should we use it?

Always pick the most specific type. `type="email"` on mobile shows the `@` key — a real conversion win.

### Example

```html
<form>
  <label for="email">Email</label>
  <input id="email" type="email" name="email" required
         autocomplete="email" placeholder="you@example.com" />

  <label for="age">Age</label>
  <input id="age" type="number" name="age" min="18" max="99" step="1" />

  <label for="phone">Phone</label>
  <input id="phone" type="tel" name="phone"
         pattern="[0-9]{10}" inputmode="numeric" />

  <label for="vol">Volume</label>
  <input id="vol" type="range" min="0" max="100" value="50" />

  <button type="submit">Submit</button>
</form>
```

**Interview Tip:** Mention `inputmode` — it controls the mobile keyboard independently of `type`, useful for OTP fields (`inputmode="numeric"`).

**Common Mistakes:** `type="number"` for phone numbers or OTPs — it strips leading zeros and shows spinner arrows. Use `type="tel"` + `inputmode="numeric"`.

---

## What is the difference between `GET` and `POST` in a form?

### Answer

| | GET | POST |
|---|---|---|
| Data location | URL query string | request body |
| Length limit | ~2000 chars (browser/server) | practically unlimited |
| Cacheable / bookmarkable | Yes | No |
| Idempotent | Yes (should be) | No |
| Appears in history/logs | Yes | No |
| File upload | No | Yes (with `enctype="multipart/form-data"`) |

### Why do we use it?

Correct method choice affects security, caching and back-button behaviour.

### When should we use it?

- **GET** — search, filters, pagination: anything that only reads and should be shareable.
- **POST** — login, checkout, anything that changes server state.

### Example

```html
<form action="/search" method="get">
  <input name="q" /><button>Search</button>
</form>
<!-- → /search?q=react -->

<form action="/upload" method="post" enctype="multipart/form-data">
  <input type="file" name="avatar" /><button>Upload</button>
</form>
```

**Interview Tip:** Passwords over GET end up in server access logs, browser history and `Referer` headers — that's the memorable security answer.

**Common Mistakes:** Forgetting `enctype="multipart/form-data"` on file uploads — the server receives only the filename.

---

## What is the difference between client-side and server-side validation?

### Answer

**Client-side** (HTML attributes + JS) gives instant feedback and reduces round-trips. **Server-side** is the only validation that is actually *trustworthy*, because a client can be bypassed with curl or DevTools.

### Why do we use it?

Client-side is UX. Server-side is security. You need both.

### When should we use it?

Always validate on the server. Add client-side on top for responsiveness.

### Example

```html
<input type="email" required
       minlength="5" maxlength="64"
       pattern="[^@\s]+@[^@\s]+\.[a-z]{2,}"
       title="Enter a valid email address" />
```

```js
// Constraint Validation API
const input = document.querySelector('input');
input.addEventListener('input', () => {
  input.setCustomValidity(
    input.validity.patternMismatch ? 'Email looks invalid' : ''
  );
});
form.addEventListener('submit', (e) => {
  if (!form.checkValidity()) { e.preventDefault(); form.reportValidity(); }
});
```

**Interview Tip:** Name the Constraint Validation API properties: `validity.valueMissing`, `typeMismatch`, `patternMismatch`, `tooShort`, `rangeOverflow`, plus `setCustomValidity()`.

**Common Mistakes:** Trusting `required` as a security control; disabling the submit button as the only guard.

---

## What is the purpose of the `<label>` element and how do you associate it?

### Answer

`<label>` names a form control. Two ways to associate:

1. **Explicit** — `<label for="id">` matching the input's `id` (preferred).
2. **Implicit** — wrapping the input inside the label.

### Why do we use it?

- Screen readers announce the label when the field is focused.
- Clicking the label focuses/toggles the control — a much bigger tap target on mobile.

### When should we use it?

Every single form control needs one. A `placeholder` is **not** a label — it disappears when typing and often fails contrast requirements.

### Example

```html
<!-- Explicit (best) -->
<label for="username">Username</label>
<input id="username" name="username" />

<!-- Implicit -->
<label>
  <input type="checkbox" name="tos" /> I accept the terms
</label>
```

**Interview Tip:** If a design has no visible label, use `aria-label` or a visually-hidden class — never leave the control unnamed.

**Common Mistakes:** Using `placeholder` as the label; `for` pointing at a `name` instead of an `id`.

---

## What are `<fieldset>` and `<legend>`?

### Answer

`<fieldset>` groups related controls; `<legend>` is its caption — and it is the **first child**.

### Why do we use it?

For radio/checkbox groups, the individual labels ("Yes", "No") are meaningless alone. Screen readers announce the legend before each option, giving context: *"Delivery method — group — Standard, radio button 1 of 2."*

### When should we use it?

Any group of related inputs, especially radio groups and multi-step forms.

### Example

```html
<fieldset>
  <legend>Delivery method</legend>
  <label><input type="radio" name="ship" value="std" /> Standard</label>
  <label><input type="radio" name="ship" value="exp" /> Express</label>
</fieldset>
```

**Interview Tip:** Also mention `<fieldset disabled>` disables every control inside it — handy while a form is submitting.

**Common Mistakes:** Styling `<fieldset>` with Flexbox/Grid used to be buggy in older browsers; wrap contents in a `div` if you hit issues.

---

## What is the `autocomplete` attribute and why does it matter?

### Answer

A hint telling the browser (and password managers) what a field expects: `email`, `current-password`, `new-password`, `one-time-code`, `cc-number`, `street-address`, `postal-code`.

### Why do we use it?

It measurably increases form completion, enables password-manager integration, and `one-time-code` lets iOS/Android auto-fill an SMS OTP.

### When should we use it?

On every real-world form. Turn it off (`autocomplete="off"`) only for genuinely one-off fields like a captcha.

### Example

```html
<input type="email" name="email" autocomplete="email" />
<input type="password" name="password" autocomplete="current-password" />
<input type="password" name="new" autocomplete="new-password" />
<input type="text" name="otp" autocomplete="one-time-code" inputmode="numeric" />
```

**Interview Tip:** `autocomplete="off"` on password fields is an anti-pattern — browsers ignore it and it fights password managers, pushing users toward weaker passwords.

**Common Mistakes:** Custom names like `autocomplete="user-email"` — only spec tokens work.

---

# Media & Graphics

## What is the difference between `<canvas>` and `<svg>`?

### Answer

| | Canvas | SVG |
|---|---|---|
| Model | Raster, pixel bitmap | Vector, retained DOM |
| Elements in the DOM | No (one `<canvas>`) | Yes, every shape |
| Event handling | Manual hit-testing | Native per-shape events |
| Scaling | Blurs when scaled | Infinitely crisp |
| Performance | Great with **many thousands** of objects | Degrades past a few thousand nodes |
| Accessibility | Poor (needs fallback) | Good (`<title>`, `<desc>`, ARIA) |
| Best for | Games, video processing, particles, charts with huge data | Icons, logos, diagrams, interactive charts |

### Why do we use it?

Picking wrong costs you either performance (SVG with 50k points) or interactivity (Canvas where you need tooltips per element).

### When should we use it?

Icons and logos → SVG. Real-time game or image manipulation → Canvas.

### Example

```html
<svg width="100" height="100" role="img" aria-label="Green circle">
  <circle cx="50" cy="50" r="40" fill="green" />
</svg>

<canvas id="c" width="100" height="100"></canvas>
<script>
  const ctx = document.getElementById('c').getContext('2d');
  ctx.fillStyle = 'green';
  ctx.beginPath();
  ctx.arc(50, 50, 40, 0, Math.PI * 2);
  ctx.fill();
</script>
```

**Interview Tip:** Canvas `width`/`height` **attributes** set the bitmap size; CSS `width`/`height` stretch it. Setting only CSS gives you a blurry canvas — a classic gotcha.

**Common Mistakes:** Using Canvas for a logo, then getting a fuzzy image on retina screens.

---

## How do you make images responsive and performant?

### Answer

Combine `srcset` + `sizes` (resolution switching), `<picture>` (art direction / format fallback), plus `loading`, `decoding` and explicit dimensions.

### Why do we use it?

Images are usually the largest bytes on a page and the main driver of LCP. Serving a 2000px hero to a 360px phone wastes bandwidth and ranks worse.

### When should we use it?

- **`srcset`/`sizes`** — same image, different sizes.
- **`<picture>`** — different crops per breakpoint, or modern formats (AVIF/WebP) with a JPEG fallback.
- **`loading="lazy"`** — below-the-fold images only. Never on the LCP hero.

### Example

```html
<img
  src="/hero-800.jpg"
  srcset="/hero-400.jpg 400w, /hero-800.jpg 800w, /hero-1600.jpg 1600w"
  sizes="(max-width: 600px) 100vw, 50vw"
  width="1600" height="900"
  alt="Team collaborating in an office"
  fetchpriority="high" decoding="async" />

<picture>
  <source srcset="/banner.avif" type="image/avif" />
  <source srcset="/banner.webp" type="image/webp" />
  <img src="/banner.jpg" alt="Sale banner" loading="lazy" width="1200" height="400" />
</picture>
```

**Interview Tip:** Always set `width` and `height` (or `aspect-ratio`) — the browser reserves space and your Cumulative Layout Shift stays at 0.

**Common Mistakes:** `loading="lazy"` on the hero image, which *delays* LCP; omitting `sizes`, so the browser assumes `100vw` and downloads the largest source.

---

## What are the `<audio>` and `<video>` elements?

### Answer

Native media players with controls, multiple `<source>` fallbacks, and a full JS API (`play()`, `pause()`, `currentTime`, `volume`).

### Why do we use it?

No plugins, keyboard accessible, and integrated with OS media controls.

### When should we use it?

Any inline media. Use `<track>` for captions — required for accessibility compliance.

### Example

```html
<video controls width="640" poster="/thumb.jpg" preload="metadata" playsinline>
  <source src="/clip.webm" type="video/webm" />
  <source src="/clip.mp4" type="video/mp4" />
  <track kind="captions" src="/clip-en.vtt" srclang="en" label="English" default />
  Your browser does not support video.
</video>
```

### Key attributes

`controls`, `autoplay`, `muted`, `loop`, `poster`, `preload="none|metadata|auto"`, `playsinline`.

**Interview Tip:** Autoplay only works if the video is **muted** (`autoplay muted playsinline`) — browsers block autoplay with sound. Interviewers ask this constantly.

**Common Mistakes:** `preload="auto"` on many videos, which downloads megabytes before any interaction.

---

## What is the `<iframe>` and how do you secure it?

### Answer

An inline frame embedding another browsing context (another document) inside the current page.

### Why do we use it?

Third-party embeds — maps, videos, payment widgets, sandboxed user code.

### When should we use it?

Only for genuinely external content, and always with a sandbox for untrusted sources.

### Example

```html
<iframe
  src="https://www.youtube.com/embed/xyz"
  title="Product demo video"
  width="560" height="315"
  loading="lazy"
  referrerpolicy="no-referrer"
  sandbox="allow-scripts allow-same-origin allow-presentation"
  allow="accelerometer; encrypted-media; picture-in-picture"
  allowfullscreen>
</iframe>
```

### Security controls

- **`sandbox`** — removes all privileges, then re-grants only the listed ones.
- **`X-Frame-Options` / `frame-ancestors` CSP** — stops *your* site being framed (clickjacking).
- Never combine `allow-scripts` and `allow-same-origin` for untrusted content — together they let the frame remove its own sandbox.

**Interview Tip:** Mention iframes are heavy — they get their own event loop and document; lazy-load them.

**Common Mistakes:** Omitting `title`, which fails accessibility audits; a screen reader announces "frame" with no context.

---

# Accessibility (a11y)

## What is ARIA and what are the rules for using it?

### Answer

**ARIA** (Accessible Rich Internet Applications) is a set of `role`, `aria-*` state and property attributes that describe UI semantics to assistive technology when native HTML can't.

### Why do we use it?

Custom widgets — tabs, comboboxes, modals, tree views — have no native element. ARIA supplies the missing role and state.

### When should we use it?

The **first rule of ARIA: don't use ARIA.** If a native element exists, use it. Key rules:

1. Prefer native HTML.
2. Don't change native semantics (`<h2 role="button">` — wrap a real button instead).
3. All interactive ARIA controls must be keyboard operable.
4. Never put `aria-hidden="true"` on a focusable element.
5. Every interactive element needs an accessible name.

### Example

```html
<!-- Custom modal -->
<div role="dialog" aria-modal="true" aria-labelledby="t" aria-describedby="d">
  <h2 id="t">Delete project?</h2>
  <p id="d">This action cannot be undone.</p>
  <button>Cancel</button><button>Delete</button>
</div>

<!-- Live region: announced when content changes -->
<div role="status" aria-live="polite">3 items added to cart</div>

<!-- Toggle button state -->
<button aria-expanded="false" aria-controls="menu">Menu</button>
<ul id="menu" hidden>…</ul>
```

**Interview Tip:** "No ARIA is better than bad ARIA" — incorrect ARIA actively breaks screen readers, worse than plain HTML.

**Common Mistakes:** `role="button"` on a `<div>` without `tabindex="0"` and Enter/Space handlers — it announces as a button but cannot be used.

---

## What is `alt` text and when should it be empty?

### Answer

`alt` is the text alternative announced when an image cannot be seen or loaded.

### Why do we use it?

Screen-reader users, failed image loads, and search engines all depend on it. It's also a WCAG requirement.

### When should we use it?

- **Informative image** → describe the information, not the file: `alt="Bar chart: revenue doubled in Q4"`.
- **Decorative image** → `alt=""` (empty, but present) so screen readers skip it.
- **Image inside a link** → describe the *destination*: `alt="Home"`.
- **Never omit the attribute** — without it, screen readers read the filename aloud.

### Example

```html
<img src="/chart.png" alt="Revenue grew from ₹2L to ₹4L between Q3 and Q4" />
<img src="/divider.svg" alt="" />                    <!-- decorative -->
<a href="/"><img src="/logo.svg" alt="Acme home" /></a>
```

**Interview Tip:** "Empty alt and missing alt are completely different" is the answer that lands.

**Common Mistakes:** `alt="image"` / `alt="photo"` — noise; and starting with "Image of…" since the screen reader already says "image".

---

## What is `tabindex` and what do its values mean?

### Answer

| Value | Effect |
|---|---|
| `tabindex="0"` | Focusable in natural DOM order |
| `tabindex="-1"` | Focusable **only** by script (`.focus()`), not by Tab |
| `tabindex="1+"` | Jumps ahead of every `0` element — **avoid** |

### Why do we use it?

To make custom widgets keyboard-reachable and to move focus programmatically (e.g. into a modal, or to an error summary after failed submit).

### When should we use it?

- `0` on custom interactive elements.
- `-1` on containers you focus with JS (modal, skip-link target).
- Positive values essentially never — they create an unpredictable tab order that is impossible to maintain.

### Example

```html
<div role="button" tabindex="0" id="fake">Click me</div>

<script>
  fake.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fake.click(); }
  });
</script>

<!-- Focus target after form errors -->
<div id="errors" tabindex="-1" role="alert"></div>
```

**Interview Tip:** Follow this with focus-trapping in modals: save `document.activeElement`, trap Tab inside, restore focus on close.

**Common Mistakes:** Positive tabindex sprinkled through a codebase; adding `tabindex` to non-interactive text, creating dozens of useless tab stops.

---

## What is a skip link?

### Answer

A link — usually the first focusable element — that jumps past repeated navigation straight to the main content.

### Why do we use it?

Keyboard and screen-reader users otherwise tab through 30 nav links on **every** page.

### When should we use it?

On every site with a navigation bar. WCAG 2.4.1 "Bypass Blocks" requires it.

### Example

```html
<body>
  <a class="skip-link" href="#main">Skip to main content</a>
  <header>…</header>
  <main id="main" tabindex="-1">…</main>
</body>
```

```css
.skip-link {
  position: absolute;
  left: -9999px;
}
.skip-link:focus {
  left: 1rem; top: 1rem;
  background: #fff; padding: .5rem 1rem; z-index: 999;
}
```

**Interview Tip:** Note `tabindex="-1"` on the target — without it, some browsers move the scroll position but not the actual focus.

**Common Mistakes:** Hiding it with `display:none`, which removes it from the tab order entirely, defeating the purpose.

---

# SEO & Meta

## Which meta tags matter most for SEO and sharing?

### Answer

```html
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />

  <title>Full Stack Interview Handbook — 3000+ Questions</title>
  <meta name="description"
        content="Curated MERN, React, Node and DSA interview questions with answers and code." />
  <link rel="canonical" href="https://example.com/handbook" />
  <meta name="robots" content="index, follow" />

  <!-- Open Graph (Facebook, LinkedIn, WhatsApp, Slack) -->
  <meta property="og:title" content="Full Stack Interview Handbook" />
  <meta property="og:description" content="3000+ questions with answers." />
  <meta property="og:image" content="https://example.com/og.png" />
  <meta property="og:url" content="https://example.com/handbook" />
  <meta property="og:type" content="website" />

  <!-- Twitter / X -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="Full Stack Interview Handbook" />
  <meta name="twitter:image" content="https://example.com/og.png" />
</head>
```

### Why do we use it?

`title` and `description` drive click-through from search results; OG tags control the preview card when the link is pasted into any chat app.

### When should we use it?

Every public page, generated per-route (in Next.js, via the Metadata API).

**Interview Tip:** `<meta name="keywords">` has been ignored by Google since 2009 — saying so shows current knowledge.

**Common Mistakes:** Relative OG image URLs (must be absolute), and a missing `canonical` causing duplicate-content penalties across `?utm=` variants.

---

## What is the difference between `robots.txt`, meta robots and `X-Robots-Tag`?

### Answer

- **`robots.txt`** — controls **crawling** at the site level. A disallowed URL may still be indexed if linked from elsewhere.
- **`<meta name="robots">`** — controls **indexing** for that HTML page (`noindex`, `nofollow`, `noarchive`).
- **`X-Robots-Tag`** HTTP header — same directives, but works for non-HTML files (PDFs, images).

### Why do we use it?

Crawl control and index control are different problems; people conflate them constantly.

### When should we use it?

To keep a page out of Google, use `noindex` — **not** `robots.txt`. If you block crawling, the crawler never sees the `noindex`.

### Example

```
# robots.txt
User-agent: *
Disallow: /admin/
Sitemap: https://example.com/sitemap.xml
```

```html
<meta name="robots" content="noindex, nofollow" />
```

**Interview Tip:** The "blocked in robots.txt so it can't read your noindex" paradox is a favourite senior-level SEO question.

**Common Mistakes:** Shipping a staging `Disallow: /` to production — it silently deindexes the entire site.

---

## What is structured data / JSON-LD?

### Answer

Machine-readable schema.org markup describing what a page is about, usually embedded as JSON-LD in a `<script>` tag.

### Why do we use it?

It powers **rich results** — star ratings, FAQ dropdowns, breadcrumbs, product price and stock directly in search results.

### When should we use it?

Products, articles, FAQs, recipes, events, job postings, breadcrumbs, organisation info.

### Example

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [{
    "@type": "Question",
    "name": "What is the event loop?",
    "acceptedAnswer": {
      "@type": "Answer",
      "text": "The mechanism that lets JavaScript perform non-blocking I/O..."
    }
  }]
}
</script>
```

**Interview Tip:** Google recommends JSON-LD over microdata/RDFa because it doesn't tangle with your markup.

**Common Mistakes:** Structured data that doesn't match visible page content — that's a manual-action penalty.

---

# Storage & Browser APIs

## What is the difference between localStorage, sessionStorage and cookies?

### Answer

| | localStorage | sessionStorage | Cookies |
|---|---|---|---|
| Capacity | ~5–10 MB | ~5–10 MB | ~4 KB |
| Expiry | Never (until cleared) | On tab close | Configurable (`Max-Age`/`Expires`) |
| Sent to server | No | No | **Yes, every request** |
| Scope | Origin, all tabs | Origin, **that tab only** | Origin + path, configurable |
| Accessible to JS | Yes | Yes | Only if not `HttpOnly` |
| API | Sync, string-only | Sync, string-only | `document.cookie` / `Set-Cookie` |

### Why do we use it?

Auth tokens, preferences and drafts each need different lifetimes and security guarantees.

### When should we use it?

- **localStorage** — theme, language, non-sensitive cached data.
- **sessionStorage** — multi-step form state for one tab.
- **Cookies** — session/auth, because they can be `HttpOnly` + `Secure` + `SameSite`, invisible to XSS.
- **IndexedDB** — large structured/offline data.

### Example

```js
localStorage.setItem('theme', 'dark');
localStorage.getItem('theme');          // "dark"
localStorage.removeItem('theme');

// Objects must be serialised
localStorage.setItem('user', JSON.stringify({ id: 1 }));
const user = JSON.parse(localStorage.getItem('user') || 'null');

// Cross-tab sync (fires in OTHER tabs only)
window.addEventListener('storage', (e) => {
  if (e.key === 'theme') applyTheme(e.newValue);
});
```

```
Set-Cookie: token=abc; HttpOnly; Secure; SameSite=Strict; Max-Age=3600; Path=/
```

**Interview Tip:** "Where do you store a JWT?" → **HttpOnly cookie**, because localStorage is readable by any XSS payload. Then mention CSRF protection via `SameSite=Strict/Lax` + a CSRF token.

**Common Mistakes:** Storing tokens in localStorage; assuming `storage` events fire in the tab that made the change (they don't); hitting the quota with no `try/catch` (Safari private mode throws).

---

## What are Web Workers and Service Workers?

### Answer

- **Web Worker** — a background thread for CPU-heavy JS. No DOM access; communicates via `postMessage`.
- **Service Worker** — a proxy sitting between the page and the network. Intercepts `fetch`, enables offline caching, background sync and push notifications. HTTPS only.

### Why do we use it?

JS is single-threaded — a heavy loop freezes the UI. A Web Worker moves it off the main thread. A Service Worker makes an app work offline and installable (PWA).

### When should we use it?

- **Web Worker** — parsing huge JSON/CSV, image processing, crypto, big sorts.
- **Service Worker** — PWAs, offline support, precaching an app shell.

### Example

```js
// main.js
const worker = new Worker('/worker.js');
worker.postMessage({ numbers: bigArray });
worker.onmessage = (e) => console.log('sum:', e.data);

// worker.js
self.onmessage = (e) => {
  const sum = e.data.numbers.reduce((a, b) => a + b, 0);
  self.postMessage(sum);
};
```

```js
// service-worker.js
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open('v1').then((c) => c.addAll(['/', '/app.css'])));
});
self.addEventListener('fetch', (e) => {
  e.respondWith(caches.match(e.request).then((r) => r || fetch(e.request)));
});
```

**Interview Tip:** Workers can't touch the DOM, and data is **structured-cloned** across `postMessage` (copied, not shared) unless you use `Transferable` objects or `SharedArrayBuffer`.

**Common Mistakes:** Never updating a cached Service Worker, so users are stuck on an old build — always version your caches and clean up in `activate`.

---

## What is the difference between `defer`, `preload`, `prefetch` and `preconnect`?

### Answer

| Hint | What it does | Use for |
|---|---|---|
| `preload` | Fetch **now**, high priority, for the current page | Hero image, critical font, LCP resource |
| `prefetch` | Fetch at **idle**, low priority, for a *future* navigation | The next page's bundle |
| `preconnect` | Do DNS + TCP + TLS handshake early | Third-party origins you'll definitely hit |
| `dns-prefetch` | DNS lookup only (cheaper fallback) | Many third-party origins |

### Why do we use it?

They eliminate waterfall latency — the browser starts work before it discovers it needs to.

### When should we use it?

Sparingly. Preloading everything means prioritising nothing, and the browser warns about unused preloads.

### Example

```html
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link rel="preload" href="/inter.woff2" as="font" type="font/woff2" crossorigin />
<link rel="preload" href="/hero.avif" as="image" fetchpriority="high" />
<link rel="prefetch" href="/dashboard.js" as="script" />
```

**Interview Tip:** `crossorigin` is **mandatory** on font preloads — without it the browser fetches the font twice.

**Common Mistakes:** Preloading below-the-fold assets and starving the LCP resource of bandwidth.

---

# Performance & Loading

## What is the Critical Rendering Path?

### Answer

The sequence the browser follows to turn bytes into pixels:

```
HTML  → DOM  ─┐
              ├→ Render Tree → Layout (reflow) → Paint → Composite
CSS   → CSSOM ┘
```

- **CSS is render-blocking** — nothing paints until the CSSOM is built.
- **Synchronous JS is parser-blocking** — and must wait for any CSS above it, because it might query computed styles.

### Why do we use it?

Every performance optimisation — inlining critical CSS, deferring scripts, preloading fonts — is an attempt to shorten this path.

### When should we use it?

When explaining LCP/FCP regressions or optimising a slow first load.

### Example

```html
<head>
  <style>/* inlined critical above-the-fold CSS */</style>
  <link rel="preload" href="/full.css" as="style"
        onload="this.rel='stylesheet'" />
  <script defer src="/app.js"></script>
</head>
```

**Interview Tip:** Name the Core Web Vitals with thresholds: **LCP** < 2.5s, **INP** < 200ms, **CLS** < 0.1. (INP replaced FID in March 2024.)

**Common Mistakes:** Thinking `DOMContentLoaded` means "page is visible" — it fires when the DOM is parsed, before images and often before paint.

---

## How do you reduce Cumulative Layout Shift (CLS)?

### Answer

1. Always set `width`/`height` or `aspect-ratio` on images, video, iframes and ads.
2. Reserve space for dynamic content (banners, embeds) with min-heights or skeletons.
3. Use `font-display: optional` or `swap` **with a size-matched fallback** (`size-adjust`, `ascent-override`).
4. Never insert content above existing content after load.
5. Animate with `transform`/`opacity`, which don't trigger layout.

### Why do we use it?

CLS is a ranking signal and the reason users tap the wrong button when an ad loads.

### When should we use it?

Every project — it's the cheapest Core Web Vital to fix.

### Example

```html
<img src="/a.jpg" width="800" height="600" alt="…" />
```

```css
.hero { aspect-ratio: 16 / 9; }

@font-face {
  font-family: Inter;
  src: url(/inter.woff2) format('woff2');
  font-display: swap;
  size-adjust: 105%;   /* match fallback metrics → no reflow on swap */
}
```

**Interview Tip:** `aspect-ratio` + `width:100%` is the modern replacement for the old padding-top percentage hack.

**Common Mistakes:** Lazy-loading images without dimensions — every one shifts the page as it arrives.

---

# Rapid Fire

## Quick answers

**What is the DOM?**
The browser's in-memory tree representation of the parsed HTML, exposed to JS as objects. Note: the DOM ≠ the HTML source (the parser fixes invalid markup) and ≠ what's on screen (the render tree excludes `display:none`).

**What is the difference between `innerHTML`, `innerText` and `textContent`?**
`innerHTML` parses HTML (XSS risk). `textContent` returns all text including hidden elements, and is fast. `innerText` is layout-aware — it respects `display:none` and forces a reflow when read.

**What is the difference between `attributes` and `properties`?**
Attributes are the HTML source values (strings); properties are the live JS object values. `input.value` changes as you type but `input.getAttribute('value')` still shows the original.

**What is the difference between `<b>` and `<mark>`?**
`<mark>` indicates relevance/highlighting in the current context (e.g. search hits) and carries semantics; `<b>` is purely stylistic.

**What is the `hidden` attribute?**
A boolean attribute equivalent to `display:none`. Removed from the accessibility tree. `hidden="until-found"` reveals content when found via Ctrl+F.

**What does `contenteditable` do?**
Makes any element user-editable. Basis of rich-text editors, but the resulting HTML varies wildly per browser — production editors (Slate, ProseMirror, TipTap) wrap it heavily.

**What is the `<template>` element?**
Inert markup that is parsed but not rendered; clone it with `document.importNode(tpl.content, true)`. The basis of Web Components.

**What are Web Components?**
Custom Elements + Shadow DOM + `<template>`. Framework-agnostic reusable components with genuinely encapsulated styles.

**What is the Shadow DOM?**
An encapsulated DOM subtree with scoped styles. Outer CSS can't leak in (except inherited properties and `::part`/`::slotted`).

**What is the difference between `<ol>`, `<ul>` and `<dl>`?**
Ordered list (sequence matters), unordered list, and description list (term/definition pairs via `<dt>`/`<dd>`).

**What is the `<noscript>` tag?**
Content rendered only when JS is disabled or fails to load. Still relevant for SSR apps and analytics fallbacks.

**What is the difference between `<meta charset="UTF-8">` and `<meta http-equiv="Content-Type">`?**
The former is the HTML5 shorthand; both set the encoding, but the shorthand is shorter and must appear in the first 1024 bytes.

**What is the `download` attribute?**
`<a href="/f.pdf" download="report.pdf">` forces a download instead of navigation. Same-origin only (or requires `Content-Disposition`).

**What is the `ping` attribute?**
`<a ping="https://track.example/x">` sends a POST beacon on click — a standards-based alternative to click-tracking redirects.

**What is `rel="noopener noreferrer"`?**
`noopener` stops the new tab accessing `window.opener` (reverse tabnabbing); `noreferrer` also strips the `Referer` header.

**What is the difference between `<button>` and `<input type="submit">`?**
`<button>` can contain HTML (icons, spans) and defaults to `type="submit"` inside a form — always set `type="button"` explicitly on non-submitting buttons, or the form submits unexpectedly.

**What is `enctype`?**
The encoding of form data: `application/x-www-form-urlencoded` (default), `multipart/form-data` (file uploads), `text/plain` (never use).

**What is the difference between `visibility:hidden`, `display:none` and `opacity:0`?**
`display:none` removes it from layout and the a11y tree. `visibility:hidden` keeps its space, not interactive, hidden from screen readers. `opacity:0` keeps space **and** stays clickable and readable by screen readers.

**What is `srcset` vs `sizes`?**
`srcset` lists candidate images and their widths; `sizes` tells the browser how wide the image will *render* at each breakpoint so it can pick correctly — before CSS is applied.

**What is `loading="lazy"` vs IntersectionObserver?**
`loading="lazy"` is native, zero-JS, coarse. IntersectionObserver gives you full control (custom thresholds, root margin, non-image content).

**What is the `<base>` tag?**
Sets the base URL for all relative links in the document. Only one allowed; it has bitten many SPAs by breaking hash and relative routing.

**What is progressive enhancement?**
Build a working HTML baseline, then layer CSS and JS on top — the form still submits with JS disabled. The opposite of graceful degradation.

**Why does whitespace appear between inline-block elements?**
Newlines in the source are rendered as text nodes. Fix with `display:flex` on the parent, negative margin, or removing the whitespace/using comments.

---

## 📌 Interview Checklist

- [ ] Can you explain `defer` vs `async` with a timeline?
- [ ] Can you list five semantic elements and justify each?
- [ ] Where do you store a JWT and why?
- [ ] Which three things does `<button>` give you that `<div onclick>` doesn't?
- [ ] Name the Core Web Vitals and their thresholds.
- [ ] How do you make a custom dropdown keyboard-accessible?
- [ ] When is `alt=""` correct?
- [ ] What breaks if you skip the doctype?
