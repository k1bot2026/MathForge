Given where I am, the Explanation Panel is the highest-value parallel track
    — it's on my Phase-1 list, it's visually rich, and it doesn't block any of
    my current work.

    I'm working on MathForge — a visual canvas for composing mathematical
    formulas as type-safe blocks (https://github.com/OWNER/mathforge — repo
    URL placeholder). Please ingest the repo so you have the brand tokens
    and existing components.

    Design the **Explanation Panel** for the right rail of the editor.

    Context you must read first:
    - docs/BRAND.md is the single source of truth for tokens. Use those
      OKLCH variables (--bg, --surface, --fg, --fg-muted, --border,
      --role-source-fill, etc.) verbatim. Do not introduce new tokens; if
      you think one is missing, flag it as an open question instead.
    - docs/DESIGN_PRINCIPLES.md governs voice, tone, layout grammar, and
      the animation grammar table. Voice rules for the four tabs are in
      the "Voice and tone" section — follow them strictly.
    - docs/PROJECT_VISION.md tells you the audience: adult learners,
      educators, quantitative professionals. Linear-grade restraint with
      3Blue1Brown-grade craft.

    The four tabs, in order: **what / why / effect / impact**.

    Specific requirements:
    - Slide-in from the right when a block is selected; 220ms ease-out
      with content fading 60ms behind. Width: think 360-420px range,
      resize handle on the left edge.
    - Tabs are persistent across selections (if I had "effect" open on
      block A and select block B, I should still be on "effect").
    - "what" and "why" are static one-sentence prose per
      DESIGN_PRINCIPLES.md voice rules.
    - "effect" and "impact" reference live values: "Combined a 3×4 matrix
      with a 4×5 matrix to produce a 3×5 matrix; determinant is 12."
      Show how these dynamic strings render — KaTeX for inline math,
      Geist Mono tabular numerals for raw numbers.
    - Show all five block-result states: computing (skeleton), value,
      warning (precision loss — yellow indicator), error (red border +
      message), unknown-block fallback.
    - Show light AND dark mode (prefers-color-scheme variants — see
      --bg / --fg dark values in BRAND.md).
    - Accessibility: tab keys are keyboard-reachable, contrast meets
      WCAG AA, animations respect prefers-reduced-motion.
    - No emoji, no exclamation marks, no "Don't worry, it's actually
      simple!" patronizing copy. Examples in DESIGN_PRINCIPLES.md show
      the expected register.

Constraints (must NOT change):                                       
    - Canvas/React Flow internals are out of scope.                             
    - Math rendering (KaTeX) is implemented in code; show it as `$$...$$`  
      placeholders in the prototype.                                            
    - Don't redesign the four-tab structure or the what/why/effect/impact       
      names.                                                             
                                                                                
    Deliverable: a Claude Design handoff bundle (static HTML + CSS + a   
    README.md describing your design intent, decisions, and any open     
    questions about tokens you'd like to add to BRAND.md).                      
                                                                         
    When the bundle is ready, drop it at                                        
    design-handoff/2026-05-XX-explanation-panel/ and I'll wire it up in a fresh 
    Claude Code session per the workflow doc — that session will read your
    README.md first, compare proposed tokens against BRAND.md, add Storybook    
    stories matching each shown state, and call out any deviations in the PR.  
                                                                          
    One caveat: the workflow doc notes Claude Design is in research preview —   
    known issues include vanishing inline comments, save errors in compact view,
     and lag on large repos. Workarounds: paste comments into chat as backup,   
    use full-view layout, link docs/ and src/blocks/ rather than the whole   
    monorepo if it chokes on size.