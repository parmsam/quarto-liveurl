# quarto-liveurl

A Quarto Reveal.js extension for attaching and viewing live URLs during presentations.

Attach one or more URLs to any slide. Toggle an overlay panel with a toolbar button or a keyboard shortcut to browse the URL inline — without leaving your deck.

---

## Features

- **Single or multiple URLs** per slide
- **iframe embed** (single URL) or **launcher list** (multiple URLs)
- **Toolbar button** and configurable **keyboard shortcut** (`u` by default)
- **"Open in new tab"** fallback for sites that block embedding
- **Slide badge** indicator on slides that have URLs attached
- **localStorage** persistence for last-visited URL
- **Optional QR code** display in launcher mode (requires bundled library)
- No external CDN dependencies at runtime

---

## Installation

```bash
quarto add samparmar/quarto-liveurl
```

Or copy `_extensions/liveurl/` into your project.

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

### 2. Attach a URL to a slide

**Shorthand — one URL via header attribute:**

```markdown
## Methods {data-liveurl="https://arxiv.org/abs/1234.5678"}
```

Quarto promotes `data-*` attributes from slide headers to the `<section>` element,
where the JS plugin reads them.

**Block syntax — one or more URLs:**

```markdown
::: {.liveurl}
- [Paper](https://arxiv.org/abs/1234.5678)
- [Demo App](https://myapp.shinyapps.io/demo)
- [Repo](https://github.com/org/repo)
:::
```

Uses standard Markdown link format: `- [Label](url)`. The div is hidden from the
slide by CSS; links are extracted at runtime by the JS plugin.

---

## Configuration

All options go under `liveurl:` in your front matter.

| Option               | Default     | Description                                              |
|----------------------|-------------|----------------------------------------------------------|
| `button`             | `true`      | Show toolbar toggle button                               |
| `shortcut`           | `"u"`       | Keyboard key to toggle the panel                         |
| `position`           | `"right"`   | Panel position: `right`, `left`, or `full`               |
| `width`              | `"42vw"`    | Panel width (ignored for `full` mode)                    |
| `mode`               | `"auto"`    | `auto` (1 URL→iframe, many→launcher), `iframe`, `launcher` |
| `openNewTabFallback` | `true`      | Show "Open in new tab" button in the panel header        |
| `rememberLastUrl`    | `true`      | Persist last-clicked URL per presentation in localStorage — see warning below |
| `qr`                 | `false`     | Render QR codes in launcher mode (requires qrcode.min.js)|
| `global`             | `[]`        | URL(s) available on every slide — string, object, or array |
| `sticky`             | `false`     | Keep panel content alive across slide transitions        |

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
      qr: false
      sticky: false
      global:
        - label: "Paper"
          url: "paper.pdf"
```

---

## localStorage warning

When `rememberLastUrl: true` (the default), the plugin writes to the browser's
`localStorage` after every URL click:

- **Key:** `liveurl:<presentation-path>` (e.g. `liveurl:/talks/my-talk.html`)
- **Value:** the URL string of the last clicked link
- **Scope:** the browser origin — not sent to any server
- **Persistence:** survives page refreshes and browser restarts until explicitly cleared

**What this means in practice:**

- Anyone with access to the browser can read the stored URL via DevTools →
  Application → Local Storage.
- For presentations on shared or public machines (conference kiosks, lab
  computers), this may expose which URLs you interacted with.
- The URL itself is stored — not the page content, credentials, or session data.

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

## QR Code support

QR code rendering requires the [qrcodejs](https://github.com/davidshimjs/qrcodejs) library:

1. Download `qrcode.min.js` from [qrcodejs releases](https://github.com/davidshimjs/qrcodejs)
2. Replace `_extensions/liveurl/qrcode.min.js` with the downloaded file
3. Set `qr: true` in your front matter

The plugin gracefully skips QR rendering if the library is absent.

---

## Notes on iframe embedding

Many sites (GitHub, Google, Twitter, etc.) send `X-Frame-Options: DENY` headers that
prevent iframe embedding. This is a browser security feature — the extension cannot
override it.

When a site blocks embedding you will see the browser's default "refused to connect"
message inside the iframe. Use the **"Open in new tab"** button (always visible in the
panel header) as a fallback.

---

## Examples

Live demos hosted on GitHub Pages:

- [Core Features](https://parmsam.github.io/quarto-liveurl/example.html) — single URL, multiple URLs, launcher, no-URL slides
- [Sticky & Global URL](https://parmsam.github.io/quarto-liveurl/example-sticky.html) — persistent panel across slide transitions

---

## License

MIT
