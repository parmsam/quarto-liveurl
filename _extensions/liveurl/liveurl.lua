--[[
  liveurl.lua — retained for reference; not activated by default.

  The extension reads URL data directly from the rendered HTML at runtime
  (no Lua filter required):

    • ::: {.liveurl} blocks → Pandoc renders <div class="liveurl"><ul><li><a>…
      The JS plugin reads <a href> elements from it; CSS hides the div.

    • ## Slide {data-liveurl="url"} → Quarto promotes data-* attributes from
      slide headers to the <section> element; JS reads slide.dataset.liveurl.

  This file exists as a starting point if you need to pre-process liveurl data
  at build time (e.g. to validate URLs, resolve relative paths, or support
  additional authoring syntax).

  To activate it, add to _extension.yml under contributes:
    filters:
      - liveurl.lua
  And add to your document front matter:
    filters:
      - liveurl
--]]
