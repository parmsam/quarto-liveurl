/**
 * liveurl.js — Reveal.js plugin for attaching and viewing live URLs in slides
 *
 * Usage:
 *   Single URL (slide attribute):   ## My Slide {liveurl="https://example.com"}
 *   Multiple URLs (block syntax):   ::: {.liveurl}
 *                                   - [Label](https://example.com)
 *                                   :::
 *
 * Config (via _extension.yml or revealjs.liveurl in YAML front matter):
 *   button, shortcut, position, width, mode, openNewTabFallback, rememberLastUrl, global, sticky
 *
 * Global URL (available on every slide):
 *   liveurl:
 *     global: "paper.pdf"                          # single URL string
 *     global: { label: "Paper", url: "paper.pdf" } # with label
 *     global:                                       # multiple
 *       - { label: "Paper", url: "paper.pdf" }
 *       - { label: "Appendix", url: "appendix.pdf" }
 */
window.RevealLiveURL = function () {
  return {
    id: "RevealLiveURL",

    init: function (deck) {
      const config = deck.getConfig();
      const options = config.liveurl || {};

      // ── Settings with defaults ──────────────────────────────────────────────
      const settings = {
        button:             options.button             !== undefined ? options.button             : true,
        shortcut:           options.shortcut           || "u",
        position:           options.position           || "right",
        width:              options.width              || "42vw",
        mode:               options.mode               || "auto",
        openNewTabFallback: options.openNewTabFallback !== undefined ? options.openNewTabFallback : true,
        rememberLastUrl:    options.rememberLastUrl    !== undefined ? options.rememberLastUrl    : true,
        // sticky: keep the panel content unchanged on slide transitions so
        // stateful pages (LLM chats, live apps) aren't destroyed mid-presentation.
        // Re-renders normally when the panel is closed and re-opened.
        sticky:             options.sticky            || false,
      };

      // ── Parse presentation-level (global) URLs ──────────────────────────────
      // These are merged into every slide's URL list.
      const globalUrls = parseGlobalUrls(options.global);

      function parseGlobalUrls(raw) {
        if (!raw) return [];
        // String shorthand: global: "paper.pdf"
        if (typeof raw === "string") {
          return [{ label: "Presentation", url: raw, source: "global" }];
        }
        // Object shorthand: global: { label: "Paper", url: "paper.pdf" }
        if (!Array.isArray(raw) && typeof raw === "object" && raw.url) {
          return [{ label: raw.label || "", url: raw.url, source: "global" }];
        }
        // Array: global: [ "url" | { label, url } ]
        if (Array.isArray(raw)) {
          return raw
            .map((u) => {
              if (typeof u === "string") return { label: "", url: u, source: "global" };
              if (u && u.url) return { label: u.label || "", url: u.url, source: "global" };
              return null;
            })
            .filter(Boolean);
        }
        return [];
      }

      // ── Plugin state ────────────────────────────────────────────────────────
      let panelOpen   = false;
      let currentUrls = [];
      let activeUrl   = null;
      let currentView = "launcher"; // "launcher" | "iframe"

      // ── Build drawer DOM ────────────────────────────────────────────────────
      const revealEl = document.querySelector(".reveal");

      const drawer = document.createElement("div");
      drawer.id = "liveurl-drawer";
      drawer.className = `liveurl-drawer liveurl-pos-${settings.position}`;
      drawer.setAttribute("aria-hidden", "true");
      drawer.setAttribute("role", "complementary");
      drawer.setAttribute("aria-label", "Live URL panel");

      // Set explicit width (ignored for full-screen mode via CSS)
      if (settings.position !== "full") {
        drawer.style.setProperty("--liveurl-width", settings.width);
      }

      // Header row
      const drawerHeader = document.createElement("div");
      drawerHeader.className = "liveurl-header";

      const drawerTitle = document.createElement("span");
      drawerTitle.className = "liveurl-title";
      drawerTitle.textContent = "Live URL";

      const headerActions = document.createElement("div");
      headerActions.className = "liveurl-header-actions";

      // "Open in new tab" header button
      const newTabBtn = createIconBtn(
        `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
          <polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
        </svg>`,
        "Open active URL in new tab"
      );
      newTabBtn.id = "liveurl-newtab-btn";
      newTabBtn.addEventListener("click", () => {
        if (currentView === "launcher") {
          currentUrls.forEach((u) => openTab(u.url));
        } else if (activeUrl) {
          openTab(activeUrl);
        }
      });

      // Close button
      const closeBtn = createIconBtn(
        `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>`,
        `Close panel (${settings.shortcut})`
      );
      closeBtn.addEventListener("click", closePanel);

      // Back button — shown only when viewing an iframe reached from a multi-URL launcher
      const backBtn = createIconBtn(
        `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="15 18 9 12 15 6"/>
        </svg>`,
        "Back to URL list"
      );
      backBtn.id = "liveurl-back-btn";
      backBtn.style.display = "none";
      backBtn.addEventListener("click", () => renderLauncher(currentUrls));

      headerActions.append(newTabBtn, closeBtn);
      drawerHeader.append(backBtn, drawerTitle, headerActions);

      // Content area
      const drawerContent = document.createElement("div");
      drawerContent.className = "liveurl-content";

      drawer.append(drawerHeader, drawerContent);
      revealEl.appendChild(drawer);

      // ── Toolbar toggle button ───────────────────────────────────────────────
      if (settings.button) {
        const toolbarBtn = document.createElement("div");
        toolbarBtn.id = "liveurl-toggle";
        toolbarBtn.className = "liveurl-toolbar-btn";
        toolbarBtn.title = `Toggle Live URLs (${settings.shortcut})`;
        toolbarBtn.setAttribute("role", "button");
        toolbarBtn.setAttribute("tabindex", "0");
        toolbarBtn.innerHTML = `
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
          </svg>`;
        toolbarBtn.addEventListener("click", togglePanel);
        toolbarBtn.addEventListener("keydown", (e) => {
          if (e.key === "Enter" || e.key === " ") { e.preventDefault(); togglePanel(); }
        });
        revealEl.appendChild(toolbarBtn);
      }

      // ── Keyboard shortcut ───────────────────────────────────────────────────
      document.addEventListener("keydown", (e) => {
        if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
        if (e.key === settings.shortcut && !e.ctrlKey && !e.altKey && !e.metaKey) {
          togglePanel();
        }
      });

      // ── Panel open / close / toggle ─────────────────────────────────────────
      function openPanel() {
        panelOpen = true;
        drawer.classList.add("liveurl-open");
        drawer.setAttribute("aria-hidden", "false");
        setToolbarActive(true);
        adjustRevealLayout(true);
        // Always re-render on open so closing + reopening reflects the current
        // slide's URLs — important for sticky mode where slide changes don't
        // touch the panel content while it's open.
        renderPanel(currentUrls);
      }

      function closePanel() {
        panelOpen = false;
        drawer.classList.remove("liveurl-open");
        drawer.setAttribute("aria-hidden", "true");
        setToolbarActive(false);
        adjustRevealLayout(false);
      }

      // Shrink/restore the .reveal viewport so the slide never sits under the drawer.
      // "full" mode is an overlay by design — no layout adjustment needed.
      function adjustRevealLayout(open) {
        if (settings.position === "right") {
          revealEl.style.width = open ? `calc(100% - ${settings.width})` : "";
        } else if (settings.position === "left") {
          revealEl.style.width      = open ? `calc(100% - ${settings.width})` : "";
          revealEl.style.marginLeft = open ? settings.width : "";
        }
        deck.layout();
      }

      function togglePanel() {
        if (panelOpen) {
          closePanel();
        } else if (currentUrls.length > 0) {
          openPanel();
        }
      }

      function setToolbarActive(active) {
        const btn = document.getElementById("liveurl-toggle");
        if (btn) btn.classList.toggle("liveurl-active", active);
      }

      function setToolbarAvailable(hasUrls) {
        const btn = document.getElementById("liveurl-toggle");
        if (btn) {
          btn.style.opacity  = hasUrls ? "1"       : "0.3";
          btn.style.cursor   = hasUrls ? "pointer" : "not-allowed";
          btn.title          = hasUrls
            ? `Toggle Live URLs (${settings.shortcut})`
            : "No URLs on this slide";
        }
      }

      // ── Read URL data from slide ────────────────────────────────────────────
      function readSlideUrls(slide) {
        // Priority 1: ::: {.liveurl} block → Pandoc renders <div class="liveurl">
        // containing a <ul> of <a> links. Read them directly from the DOM.
        const divEl = slide.querySelector("div.liveurl");
        if (divEl) {
          const links = Array.from(divEl.querySelectorAll("a[href]"));
          if (links.length) {
            return links.map((a) => ({
              label: a.textContent.trim() || a.href,
              url:   a.getAttribute("href"),
            }));
          }
        }

        // Priority 2: ## Slide {data-liveurl="url"} header shorthand.
        // Quarto/Pandoc promotes data-* attributes from headers to <section>.
        const attr = slide.dataset.liveurl;
        if (attr) return [{ label: slide.dataset.liveurlLabel || "", url: attr }];

        return [];
      }

      // ── Render panel content ────────────────────────────────────────────────
      function renderPanel(urls) {
        drawerContent.innerHTML = "";

        const hasUrls = urls.length > 0;
        newTabBtn.style.visibility = hasUrls ? "visible" : "hidden";

        if (!hasUrls) {
          activeUrl = null;
          return;
        }

        const effectiveMode = settings.mode === "auto"
          ? (urls.length === 1 ? "iframe" : "launcher")
          : settings.mode;

        if (effectiveMode === "iframe") {
          renderIframe(urls[0].url, urls[0].label);
          activeUrl = urls[0].url;
        } else {
          renderLauncher(urls);
        }
      }

      // ── Iframe renderer ─────────────────────────────────────────────────────
      function renderIframe(url, label) {
        activeUrl = url;
        currentView = "iframe";
        drawerContent.innerHTML = "";
        // Show back button only when there's a launcher to return to
        backBtn.style.display = currentUrls.length > 1 ? "" : "none";
        newTabBtn.title = "Open in new tab";
        newTabBtn.setAttribute("aria-label", "Open in new tab");

        const wrapper = document.createElement("div");
        wrapper.className = "liveurl-iframe-wrapper";

        const iframe = document.createElement("iframe");
        iframe.src   = url;
        iframe.title = label || url;
        iframe.className = "liveurl-iframe";
        // Permissive sandbox — sites can still block via X-Frame-Options
        iframe.setAttribute("sandbox",
          "allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
        );

        // Visible fallback hint — we cannot reliably detect X-Frame-Options failures
        const hint = document.createElement("div");
        hint.className = "liveurl-iframe-hint";
        hint.innerHTML = `Can't see it?
          <button class="liveurl-link-btn" data-url="${escAttr(url)}">Open in new tab</button>`;
        hint.querySelector("button").addEventListener("click", () => openTab(url));

        wrapper.append(iframe, hint);
        drawerContent.appendChild(wrapper);
      }

      // ── Launcher renderer ───────────────────────────────────────────────────
      function renderLauncher(urls) {
        backBtn.style.display = "none";
        currentView = "launcher";
        drawerContent.innerHTML = "";
        newTabBtn.title = "Open all in new tabs";
        newTabBtn.setAttribute("aria-label", "Open all in new tabs");
        const slideList  = urls.filter((u) => u.source !== "global");
        const globalList = urls.filter((u) => u.source === "global");
        const hasBoth    = slideList.length > 0 && globalList.length > 0;

        const container = document.createElement("div");
        container.className = "liveurl-launcher-container";

        if (hasBoth) {
          container.appendChild(renderLauncherSection("This slide", slideList));
          container.appendChild(renderLauncherSection("Presentation", globalList));
        } else {
          // Only one source — render flat, no section headings
          container.appendChild(renderLauncherSection(null, urls));
        }

        if (activeUrl === null && urls.length > 0) activeUrl = urls[0].url;
        drawerContent.appendChild(container);
      }

      function renderLauncherSection(heading, urls) {
        const section = document.createElement("div");
        section.className = "liveurl-section";

        if (heading) {
          const label = document.createElement("div");
          label.className = "liveurl-section-label";
          label.textContent = heading;
          section.appendChild(label);
        }

        const list = document.createElement("ul");
        list.className = "liveurl-launcher";

        urls.forEach((u, i) => {
          const item = document.createElement("li");
          item.className = "liveurl-launcher-item";

          // Main link button
          const linkBtn = document.createElement("button");
          linkBtn.className = "liveurl-launcher-link";
          linkBtn.textContent = u.label || u.url;
          linkBtn.addEventListener("click", () => {
            activeUrl = u.url;
            rememberUrl(u.url);

            if (settings.mode === "launcher") {
              openTab(u.url);
            } else {
              // Auto mode: switch to inline iframe
              renderIframe(u.url, u.label);
            }
          });

          // External open button
          const extBtn = createIconBtn(
            `<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
              <polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
            </svg>`,
            "Open in new tab"
          );
          extBtn.className += " liveurl-ext-btn";
          extBtn.addEventListener("click", () => openTab(u.url));

          const row = document.createElement("div");
          row.className = "liveurl-launcher-row";
          row.append(linkBtn, extBtn);
          item.appendChild(row);

          if (i === 0 && activeUrl === null) activeUrl = u.url;
          list.appendChild(item);
        });

        section.appendChild(list);
        return section;
      }

      // ── Slide change handler ────────────────────────────────────────────────
      function onSlideChanged(event) {
        const slide = event.currentSlide;

        // Tag slide-specific URLs so the launcher can group them separately
        const slideUrls = readSlideUrls(slide).map((u) => ({ ...u, source: "slide" }));

        // Merge: slide URLs first, global URLs appended
        currentUrls = [...slideUrls, ...globalUrls];

        // sticky + panel open: preserve the current iframe/page state across slides.
        // Only update metadata (badge, toolbar) — don't touch the content.
        if (settings.sticky && panelOpen) {
          refreshBadge(slide, slideUrls.length);
          setToolbarAvailable(currentUrls.length > 0);
          return;
        }

        // Auto-close only when there are no URLs at all (global URLs keep it open)
        if (currentUrls.length === 0 && panelOpen) closePanel();

        // Restore remembered URL for this presentation path
        if (settings.rememberLastUrl && currentUrls.length > 0) {
          const remembered = recallUrl();
          if (remembered && currentUrls.some((u) => u.url === remembered)) {
            activeUrl = remembered;
          }
        }

        renderPanel(currentUrls);
        // Badge reflects only slide-specific URLs — global ones are always present
        refreshBadge(slide, slideUrls.length);
        setToolbarAvailable(currentUrls.length > 0);
      }

      // ── Slide badge ─────────────────────────────────────────────────────────
      function refreshBadge(slide, slideUrlCount) {
        document.querySelectorAll(".liveurl-badge").forEach((b) => b.remove());

        // Only badge slides that have their own URLs; the global URL is omnipresent
        if (slideUrlCount > 0) {
          const badge = document.createElement("div");
          badge.className = "liveurl-badge";
          badge.title = `${slideUrlCount} slide URL${slideUrlCount > 1 ? "s" : ""}`;
          badge.textContent = slideUrlCount;
          slide.appendChild(badge);
        }
      }

      // ── localStorage helpers ────────────────────────────────────────────────
      function storageKey() {
        return `liveurl:${window.location.pathname}`;
      }

      function rememberUrl(url) {
        if (!settings.rememberLastUrl) return;
        try { localStorage.setItem(storageKey(), url); } catch (_) {}
      }

      function recallUrl() {
        try { return localStorage.getItem(storageKey()); } catch (_) { return null; }
      }

      // ── Utility helpers ─────────────────────────────────────────────────────
      function openTab(url) {
        window.open(url, "_blank", "noopener,noreferrer");
      }

      function escAttr(str) {
        return str.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
      }

      function createIconBtn(svgHtml, title) {
        const btn = document.createElement("button");
        btn.className = "liveurl-icon-btn";
        btn.title = title;
        btn.setAttribute("aria-label", title);
        btn.innerHTML = svgHtml;
        return btn;
      }

      // ── Attach to Reveal events ─────────────────────────────────────────────
      deck.on("slidechanged", onSlideChanged);
      deck.on("ready", () => {
        onSlideChanged({ currentSlide: deck.getCurrentSlide() });
      });
    },
  };
};
