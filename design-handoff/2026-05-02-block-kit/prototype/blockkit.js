/* =============================================================
   Block Kit v2 — drag + slot-snap
   Mechanism: every horizontal .line has invisible .slot dividers
   between siblings. While dragging, the nearest slot lights up;
   on drop, the block (cloned from palette or moved from canvas)
   is inserted at that slot with a snap-in animation.
   ============================================================= */

(() => {
  const $ = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));

  /* ---------- Palette templates ---------- */
  const T = {
    // Identifier (variabele): cursive math-style, e.g. x, W, b, θ
    ident: (name, sub, sup) => mk(`<div class="block role-source is-symbol" data-kind="ident">
      <span class="glyph">${name}</span>${sub ? `<span class="sub">${sub}</span>` : ""}${sup ? `<span class="sup">${sup}</span>` : ""}
    </div>`),
    // Number literal: monospace
    number: (v) => mk(`<div class="block role-source" data-kind="num"><span class="num">${v}</span></div>`),
    // Operator symbol: +, −, ·, /, =
    sym: (s, role="operator") => mk(`<div class="block role-${role} is-symbol" data-kind="sym"><span class="glyph">${s}</span></div>`),
    // Relation (=, ≔, <, ≤): dezelfde shape, andere role
    rel: (s) => mk(`<div class="block role-relation is-symbol" data-kind="rel"><span class="glyph">${s}</span></div>`),
    // Function-name pill (ReLU, ∇, exp, log, sin)
    fnName: (n) => mk(`<div class="block role-function is-pill" data-kind="fn"><span class="name">${n}</span></div>`),
    // Stochastic sample
    stoch: (n) => mk(`<div class="block role-stochastic is-pill" data-kind="stoch"><span class="glyph">${n}</span></div>`),
    // Control keyword (if, then, else, while, for, repeat)
    kw: (n) => mk(`<div class="block role-control is-pill" data-kind="kw"><span class="name">${n}</span></div>`),
    // Parenthesis pair — visueel als één blok dat een mini-line bevat
    paren: () => {
      const el = mk(`<div class="fn role-operator" data-kind="paren">
        <span class="fn-glyph">(</span>
        <div class="line fn-arg" data-dropzone="paren-arg" style="margin:0; min-height:32px;"><div class="slot"></div></div>
        <span class="fn-glyph">)</span>
      </div>`);
      return el;
    },
    // Fraction \frac{a}{b}
    frac: () => {
      return mk(`<div class="fn role-operator" data-kind="frac" style="flex-direction:column; padding:4px 8px;">
        <div class="line fn-arg is-numerator" data-dropzone="num" style="margin:0; min-height:28px;"><div class="slot"></div></div>
        <div class="line fn-arg is-denominator" data-dropzone="den" style="margin:0; min-height:28px;"><div class="slot"></div></div>
      </div>`);
    },
    // Sum ∑_{i=1}^{n}
    sum: () => {
      return mk(`<div class="fn role-operator" data-kind="sum">
        <div class="fn-arg is-stack">
          <span class="superlabel">n</span>
          <span class="fn-glyph">∑</span>
          <span class="sublabel">i=1</span>
        </div>
      </div>`);
    },
  };

  function mk(html) {
    const t = document.createElement("template");
    t.innerHTML = html.trim();
    return t.content.firstChild;
  }

  /* ---------- Drag state ---------- */
  let drag = null;          // { el, ghost, fromPalette, originParent, originNext }
  let activeSlot = null;

  document.addEventListener("pointerdown", (e) => {
    const block = e.target.closest(".block, .fn");
    if (!block) return;
    const fromPalette = !!block.closest(".palette");
    e.preventDefault();

    let dragEl;
    if (fromPalette) {
      const tpl = block.dataset.tpl;
      const args = JSON.parse(block.dataset.args || "[]");
      dragEl = T[tpl](...args);
    } else {
      dragEl = block;
    }

    const r = (fromPalette ? block : dragEl).getBoundingClientRect();
    const offX = e.clientX - r.left;
    const offY = e.clientY - r.top;

    // Place dragEl in body, absolutely positioned.
    if (!fromPalette) {
      drag = {
        el: dragEl,
        fromPalette: false,
        originParent: dragEl.parentNode,
        originNext: dragEl.nextSibling,
      };
    } else {
      drag = { el: dragEl, fromPalette: true };
    }
    document.body.appendChild(dragEl);
    dragEl.style.position = "fixed";
    dragEl.style.left = (e.clientX - offX) + "px";
    dragEl.style.top = (e.clientY - offY) + "px";
    dragEl.style.margin = "0";
    dragEl.style.pointerEvents = "none";
    dragEl.classList.add("is-dragging");
    drag.offX = offX;
    drag.offY = offY;
    dragEl.setPointerCapture?.(e.pointerId);
  });

  document.addEventListener("pointermove", (e) => {
    if (!drag) return;
    drag.el.style.left = (e.clientX - drag.offX) + "px";
    drag.el.style.top = (e.clientY - drag.offY) + "px";
    updateActiveSlot(e.clientX, e.clientY);
    updateTrash(e.clientX, e.clientY);
  });

  document.addEventListener("pointerup", (e) => {
    if (!drag) return;
    const onTrash = isOverTrash(e.clientX, e.clientY);
    const targetSlot = activeSlot;

    // Reset drag styling.
    drag.el.style.position = "";
    drag.el.style.left = "";
    drag.el.style.top = "";
    drag.el.style.pointerEvents = "";
    drag.el.style.margin = "";
    drag.el.classList.remove("is-dragging");

    if (onTrash) {
      drag.el.remove();
    } else if (targetSlot) {
      // Insert before the slot's nextSibling = put block right before that slot.
      // Then re-thread slots so dividers always sit between blocks.
      const line = targetSlot.parentElement;
      line.insertBefore(drag.el, targetSlot);
      drag.el.classList.add("just-snapped");
      setTimeout(() => drag.el.classList.remove("just-snapped"), 320);
      ensureSlots(line);
    } else if (drag.fromPalette) {
      drag.el.remove();
    } else {
      // No target: restore to origin.
      drag.originParent.insertBefore(drag.el, drag.originNext);
    }
    if (activeSlot) activeSlot.classList.remove("is-active");
    activeSlot = null;
    document.querySelector(".trash")?.classList.remove("is-active");
    drag = null;
  });

  /* ---------- Slot management ---------- */

  function ensureSlots(line) {
    // Remove all slots, then re-insert one between each pair of children
    // (and at start + end). Keeps the markup canonical and easy to reason about.
    $$(":scope > .slot", line).forEach(s => s.remove());
    const kids = $$(":scope > :not(.line-gutter)", line);
    // Insert at the start (after gutter if any).
    const gutter = $(":scope > .line-gutter", line);
    const first = mkSlot();
    if (gutter) gutter.after(first);
    else line.insertBefore(first, line.firstChild);
    for (const k of kids) {
      const s = mkSlot();
      k.after(s);
    }
  }
  function mkSlot() {
    const s = document.createElement("div");
    s.className = "slot";
    return s;
  }

  function updateActiveSlot(cx, cy) {
    if (activeSlot) activeSlot.classList.remove("is-active");
    activeSlot = null;
    let bestDist = 60; // px threshold
    for (const slot of $$(".line .slot")) {
      // Only consider slots whose line is on the canvas, not the palette.
      if (slot.closest(".palette")) continue;
      const r = slot.getBoundingClientRect();
      const sx = (r.left + r.right) / 2;
      const sy = (r.top + r.bottom) / 2;
      const d = Math.hypot(cx - sx, cy - sy);
      // Prefer slots on the same line (within vertical distance).
      const yDist = Math.abs(cy - sy);
      const score = d + yDist * 0.5; // bias toward same-line
      if (yDist > 80) continue;
      if (score < bestDist) {
        bestDist = score;
        activeSlot = slot;
      }
    }
    if (activeSlot) activeSlot.classList.add("is-active");
  }

  /* ---------- Trash ---------- */
  function isOverTrash(cx, cy) {
    const t = document.querySelector(".trash");
    if (!t) return false;
    const r = t.getBoundingClientRect();
    return cx >= r.left && cx <= r.right && cy >= r.top && cy <= r.bottom;
  }
  function updateTrash(cx, cy) {
    const t = document.querySelector(".trash");
    if (!t) return;
    t.classList.toggle("is-active", isOverTrash(cx, cy));
  }

  /* ---------- Theme toggle ---------- */
  $("#themeToggle")?.addEventListener("click", () => {
    const cur = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", cur);
  });

  /* ---------- Init: ensure every existing canvas line has slots ---------- */
  document.addEventListener("DOMContentLoaded", () => {
    $$(".canvas-inner .line").forEach(ensureSlots);
  });

  window.BlockKit = { T, ensureSlots };
})();
