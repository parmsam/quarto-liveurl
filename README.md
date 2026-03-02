# quarto-liveurl

A Quarto Reveal.js extension for attaching and viewing live URLs during presentations.

Attach one or more URLs to any slide. Toggle a side panel with a toolbar button or keyboard shortcut to browse URLs inline — the slide reflows to make room so nothing is covered.

## Examples

Live demos on GitHub Pages:

- [Core Features](https://parmsam.github.io/quarto-liveurl/example.html) — single URL, multiple URLs, launcher, no-URL slides
- [Sticky & Global URL](https://parmsam.github.io/quarto-liveurl/example-sticky.html) — persistent panel across slide transitions
- [Paper Summary](https://parmsam.github.io/quarto-liveurl/example-paper.html) — "Attention Is All You Need" summarised with the full paper open in the panel

---

## Features

- **Per-slide URLs** via a header attribute or fenced div block
- **Presentation-level (`global`) URLs** available on every slide
- **iframe embed** (single URL) or **launcher list** (multiple URLs)
- **Back navigation** — return to the URL list after opening an iframe
- **Slide reflow** — the panel sits beside the slide, never over it
- **Sticky mode** — keep a page loaded across slide transitions (LLM chats, live apps)
- **Toolbar button** and configurable **keyboard shortcut** (`u` by default)
- **"Open in new tab"** fallback for sites that block iframe embedding
- **Slide badge** indicator on slides that have attached URLs
- **localStorage** persistence for the last-visited URL (opt-out available)
- No external CDN dependencies at runtime

---

## Installation

```bash
quarto add parmsam/quarto-liveurl
```

Or copy `_extensions/liveurl/` directly into your project.

---

## Usage

### 1. Enable in front matter

```yaml
---
format:
  revealjs:
    liveurl:
      button: true
      shortcut: "u"
revealjs-plugins:
  - liveurl
---
```

### 2. Attach URLs to a slide

**Shorthand — one URL via header attribute:**

```markdown
## Methods {data-liveurl="https://arxiv.org/abs/1234.5678"}
```

Quarto promotes `data-*` attributes from slide headers to the `<section>` element where the plugin reads them.

**Block syntax — one or more URLs:**

```markdown
::: {.liveurl}
- [Paper](https://arxiv.org/abs/1234.5678)
- [Demo App](https://myapp.shinyapps.io/demo)
- [Repo](https://github.com/org/repo)
:::
```

Uses standard Markdown link format. The div is hidden from the slide by CSS; links are read at runtime by the JS plugin.

### 3. Global URL (every slide)

A `global` URL appears in the panel on every slide regardless of which slide is active. Useful for a reference document, paper PDF, or live dashboard that should always be reachable.

```yaml
liveurl:
  global: "paper.pdf"                        # string shorthand
  global:                                     # with label
    label: "Paper"
    url: "paper.pdf"
  global:                                     # multiple
    - label: "Paper"
      url: "paper.pdf"
    - label: "Appendix"
      url: "appendix.pdf"
```

When a slide has both its own URLs and global URLs, the launcher shows two labelled sections: **"This slide"** and **"Presentation"**.

### 4. Sticky panel

With `sticky: true`, navigating between slides does not reload or re-render the panel. The current page (scroll position, chat history, form state) is preserved until the panel is manually closed and reopened.

```yaml
liveurl:
  sticky: true
  global:
    label: "ChatGPT"
    url: "https://chat.openai.com"
```

Good use cases:

- LLM chat sessions — keep context across slides
- Live dashboards — avoid interrupting auto-refresh or streaming
- Interactive apps — preserve form inputs and selections
- Reference docs — let the audience read while you advance

To load a different URL while sticky is on: close the panel (`u`), navigate to the target slide, reopen (`u`).

---

## Configuration

All options go under `liveurl:` in your front matter.

| Option               | Default  | Description                                                               |
|----------------------|----------|---------------------------------------------------------------------------|
| `button`             | `true`   | Show toolbar toggle button                                                |
| `shortcut`           | `"u"`    | Keyboard key to toggle the panel                                          |
| `position`           | `"right"`| Panel position: `right`, `left`, or `full`                                |
| `width`              | `"42vw"` | Panel width (`right`/`left` only)                                         |
| `mode`               | `"auto"` | `auto` (1 URL → iframe, many → launcher), `iframe`, or `launcher`         |
| `openNewTabFallback` | `true`   | Show "Open in new tab" button in the panel header                         |
| `rememberLastUrl`    | `true`   | Persist last-clicked URL in localStorage — [see warning](#localstorage-warning) |
| `global`             | `[]`     | URL(s) available on every slide — string, `{label, url}`, or array        |
| `sticky`             | `false`  | Preserve panel content across slide transitions                           |

### Full example

```yaml
format:
  revealjs:
    liveurl:
      button: true
      shortcut: "u"
      position: "right"
      width: "42vw"
      mode: "auto"
      openNewTabFallback: true
      rememberLastUrl: true
      sticky: false
      global:
        - label: "Paper"
          url: "paper.pdf"
revealjs-plugins:
  - liveurl
```

---

## Panel navigation

In `auto` mode with multiple URLs, clicking a link opens it in an inline iframe. A **← back button** appears in the panel header to return to the URL list. The "Open in new tab" button (↗) in the header always opens the active URL externally.

---

## localStorage warning

When `rememberLastUrl: true` (the default), the plugin writes to the browser's `localStorage` after every URL click:

- **Key:** `liveurl:<presentation-path>` (e.g. `liveurl:/talks/my-talk.html`)
- **Value:** the URL string of the last clicked link
- **Scope:** browser-local only — not sent to any server
- **Persistence:** survives page refreshes and browser restarts until cleared

**What this means in practice:**

- Anyone with access to the browser can read the stored URL via DevTools → Application → Local Storage.
- On shared or public machines (conference kiosks, lab computers) this may expose which URLs you interacted with.
- The URL itself is stored — not page content, credentials, or session data.

**To disable:**

```yaml
liveurl:
  rememberLastUrl: false
```

**To clear manually** (browser DevTools console):

```js
localStorage.removeItem('liveurl:' + location.pathname)
```

---

## Notes on iframe embedding

Many sites (GitHub, Google, Twitter, etc.) send `X-Frame-Options: DENY` headers that prevent iframe embedding. This is a browser security feature the extension cannot override.

When a site blocks embedding, use the **"Open in new tab" (↗)** button in the panel header. A small "Can't see it?" hint also appears below the iframe.

---

## License

MIT
