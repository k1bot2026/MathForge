/* =============================================================
   Block Kit v2 — UX layer (selection, tooltips, eval-window,
   palette search, line controls).
   Loaded after blockkit.js; reuses the same DOM hooks.
   ============================================================= */
(() => {
  const $ = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));

  /* ---------- Block metadata for tooltips ----------
     Maps a representative key (glyph or name) to a small info card.
     Real impl reads this off the block definition; here we hardcode
     the most common entries so the demo feels alive. */
  const META = {
    "x":      { role: "source",   name: "x",      kind: "Variable",  shape: "ℝⁿ",      what: "Input vector." },
    "y":      { role: "source",   name: "y",      kind: "Variable",  shape: "ℝᵐ",      what: "Output of a linear layer." },
    "W":      { role: "source",   name: "W",      kind: "Parameter", shape: "ℝᵐˣⁿ",   what: "Weight matrix; learned." },
    "b":      { role: "source",   name: "b",      kind: "Parameter", shape: "ℝᵐ",      what: "Bias vector; learned." },
    "θ":      { role: "source",   name: "θ",      kind: "Parameter", shape: "ℝᵏ",      what: "Model parameters at step t." },
    "η":      { role: "source",   name: "η",      kind: "Hyperparam",shape: "ℝ⁺",      what: "Learning rate." },
    "L":      { role: "source",   name: "L",      kind: "Function",  shape: "ℝᵏ → ℝ", what: "Loss function over θ." },
    "ε":      { role: "source",   name: "ε",      kind: "Constant",  shape: "ℝ⁺",      what: "Convergence tolerance." },
    "0.01":   { role: "source",   name: "0.01",   kind: "Literal",   shape: "ℝ",       what: "Numeric constant." },
    "+":      { role: "operator", name: "+",      kind: "Operator",  effect: "Element-wise addition.", impact: "Shapes must broadcast." },
    "−":      { role: "operator", name: "−",      kind: "Operator",  effect: "Element-wise subtraction.", impact: "Shapes must broadcast." },
    "·":      { role: "operator", name: "·",      kind: "Operator",  effect: "Multiplication; matmul on matrices, scalar otherwise.", impact: "Inner dims must agree for matmul." },
    "⊗":      { role: "operator", name: "⊗",      kind: "Operator",  effect: "Outer / Kronecker product.", impact: "Result shape = product of inputs." },
    "=":      { role: "relation", name: "=",      kind: "Relation",  effect: "Asserts equality between LHS and RHS." },
    "≔":      { role: "relation", name: "≔",      kind: "Assignment", effect: "Bind LHS to value of RHS." },
    "<":      { role: "relation", name: "<",      kind: "Comparison" },
    "≤":      { role: "relation", name: "≤",      kind: "Comparison" },
    "∇":      { role: "function", name: "∇",      kind: "Function",  effect: "Gradient operator.", impact: "Returns vector in same space as input." },
    "ReLU":   { role: "function", name: "ReLU",   kind: "Function",  effect: "max(0, x), element-wise.", impact: "Non-linearity; zero gradient where x ≤ 0." },
    "exp":    { role: "function", name: "exp",    kind: "Function",  effect: "Element-wise exponential." },
    "log":    { role: "function", name: "log",    kind: "Function",  effect: "Element-wise natural log.", impact: "Undefined for x ≤ 0." },
    "if":     { role: "control",  name: "if",     kind: "Control" },
    "then":   { role: "control",  name: "then",   kind: "Control" },
    "else":   { role: "control",  name: "else",   kind: "Control" },
    "while":  { role: "control",  name: "while",  kind: "Control" },
    "for":    { role: "control",  name: "for",    kind: "Control" },
    "stop":   { role: "control",  name: "stop",   kind: "Control" },
    "continue":{role: "control",  name: "continue", kind: "Control" },
    "step":   { role: "control",  name: "step",   kind: "Control" },
    "𝒩(0,1)": { role: "stochastic", name: "𝒩(0,1)", kind: "Sample", effect: "Standard normal draw.", impact: "Re-evaluates each tick." },
  };

  function blockKey(el) {
    const g = el.querySelector(".glyph")?.textContent?.trim();
    const n = el.querySelector(".name")?.textContent?.trim();
    const num = el.querySelector(".num")?.textContent?.trim();
    return g || n || num || "";
  }

  /* ---------- Tooltip ---------- */
  const tip = document.createElement("div");
  tip.className = "tooltip";
  tip.setAttribute("role", "tooltip");
  document.body.appendChild(tip);
  let tipFor = null;

  function showTip(el, x, y) {
    const k = blockKey(el);
    const m = META[k];
    if (!m) { hideTip(); return; }
    tip.innerHTML = `
      <div class="tt-head">
        <span class="tt-role-dot" style="background: var(--b-${m.role}-rim);"></span>
        <span class="tt-role">${m.role}</span>
      </div>
      <div class="tt-name">${m.name} <span class="tt-shape" style="font-weight:400;opacity:0.7;">${m.kind || ""}</span></div>
      ${m.shape ? `<div class="tt-row"><span class="tt-key">Shape</span><span class="tt-val tt-shape">${m.shape}</span></div>` : ""}
      ${m.what  ? `<div class="tt-row"><span class="tt-key">What</span><span class="tt-val">${m.what}</span></div>` : ""}
      ${m.effect? `<div class="tt-row"><span class="tt-key">Effect</span><span class="tt-val">${m.effect}</span></div>` : ""}
      ${m.impact? `<div class="tt-row"><span class="tt-key">Impact</span><span class="tt-val">${m.impact}</span></div>` : ""}
    `;
    tip.style.left = (x + 14) + "px";
    tip.style.top  = (y + 16) + "px";
    tip.classList.add("is-visible");
    tipFor = el;
  }
  function hideTip() {
    tip.classList.remove("is-visible");
    tipFor = null;
  }

  document.addEventListener("pointerover", (e) => {
    const el = e.target.closest(".canvas-inner .block");
    if (!el) return;
    showTip(el, e.clientX, e.clientY);
  });
  document.addEventListener("pointermove", (e) => {
    if (!tipFor) return;
    tip.style.left = (e.clientX + 14) + "px";
    tip.style.top  = (e.clientY + 16) + "px";
  });
  document.addEventListener("pointerout", (e) => {
    const el = e.target.closest(".canvas-inner .block");
    if (el && el === tipFor) hideTip();
  });
  // hide while dragging
  document.addEventListener("pointerdown", () => hideTip());

  /* ---------- Selection: block + line, both at once ---------- */

  function clearSelection() {
    $$(".block.is-selected").forEach(b => b.classList.remove("is-selected"));
    $$(".line.is-selected").forEach(l => l.classList.remove("is-selected"));
    $$(".doc-section.is-active").forEach(s => s.classList.remove("is-active"));
    $$(".block.is-line-selected").forEach(b => b.classList.remove("is-line-selected"));
  }

  document.addEventListener("click", (e) => {
    if (e.target.closest(".palette")) return;
    if (e.target.closest(".eval-overlay")) return;
    const block = e.target.closest(".canvas-inner .block");
    const line  = e.target.closest(".canvas-inner .line");
    if (!block && !line) { clearSelection(); return; }
    clearSelection();
    if (line) {
      line.classList.add("is-selected");
      line.closest(".doc-section")?.classList.add("is-active");
      // Soft-highlight every block on this line
      $$(":scope > .block, :scope .block", line).forEach(b => b.classList.add("is-line-selected"));
    }
    if (block) {
      block.classList.remove("is-line-selected");
      block.classList.add("is-selected");
    }
  });

  /* ---------- Palette search + collapse ---------- */
  const search = $("#paletteSearch");
  if (search) {
    search.addEventListener("input", () => {
      const q = search.value.trim().toLowerCase();
      $$(".palette-group").forEach(g => {
        let any = false;
        $$(":scope > .palette-items > *", g).forEach(item => {
          const t = item.textContent.toLowerCase();
          const match = !q || t.includes(q);
          item.style.display = match ? "" : "none";
          if (match) any = true;
        });
        g.classList.toggle("is-hidden", q && !any);
      });
    });
  }
  $$(".palette-group h3").forEach(h => {
    h.addEventListener("click", () => h.parentElement.classList.toggle("is-collapsed"));
  });

  /* ---------- Add new line ---------- */
  function addLine(after) {
    const section = document.createElement("section");
    section.className = "doc-section";
    const lineNumber = $$(".doc-section").length + 1;
    section.innerHTML = `
      <div class="line">
        <div class="line-gutter">${lineNumber}</div>
      </div>
      <div class="line-controls">
        <button title="Verwijder regel" data-act="remove">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
        </button>
      </div>
    `;
    after.after(section);
    if (window.BlockKit) window.BlockKit.ensureSlots(section.querySelector(".line"));
    renumberLines();
    return section;
  }
  function renumberLines() {
    $$(".doc-section").forEach((s, i) => {
      const g = s.querySelector(".line-gutter");
      if (g) g.textContent = i + 1;
    });
  }

  document.addEventListener("click", (e) => {
    const addBtn = e.target.closest(".add-line");
    if (addBtn) {
      const section = addBtn.previousElementSibling;
      if (section?.classList.contains("doc-section")) addLine(section);
      return;
    }
    const ctrl = e.target.closest(".line-controls button");
    if (ctrl) {
      const section = ctrl.closest(".doc-section");
      if (ctrl.dataset.act === "remove") {
        section.remove();
        renumberLines();
      }
      return;
    }
  });

  /* ---------- Eval-window ---------- */
  const overlay = $("#evalOverlay");
  $("#openEval")?.addEventListener("click", () => overlay?.classList.add("is-visible"));
  $("#closeEval")?.addEventListener("click", () => overlay?.classList.remove("is-visible"));
  overlay?.addEventListener("click", (e) => { if (e.target === overlay) overlay.classList.remove("is-visible"); });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") overlay?.classList.remove("is-visible");
  });

  // Eval-window tabs
  $$("#evalOverlay .eval-tabs button").forEach(b => {
    b.addEventListener("click", () => {
      $$("#evalOverlay .eval-tabs button").forEach(x => x.classList.toggle("is-active", x === b));
      const tab = b.dataset.tab;
      $$("#evalOverlay [data-tab-pane]").forEach(p => p.style.display = (p.dataset.tabPane === tab ? "" : "none"));
    });
  });
})();
