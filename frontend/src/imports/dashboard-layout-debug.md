FIGMA DEBUG PROMPT — Fix Dashboard Layout & Restore Fixed Elements

The dashboard layout is currently broken.

Issues:

Prompt input bar has disappeared.

Filters panel is not scrollable.

“Apply Filters” and “Reset Filters” are not visible.

“Re-upload Ledger” and “Download Report” disappear on scroll.

Entire page scroll behavior is incorrect.

Do NOT redesign visuals.
Do NOT change styling.
Only debug layout structure and scrolling logic.

✅ 1️⃣ FIX ROOT DASHBOARD FRAME

Select the outermost dashboard frame.

Set:

Height → Fixed to viewport height (not Hug contents)

Overflow → Hidden

Layout → Vertical Auto Layout

Structure must be:

[ Header ] (fixed height)
[ Main Content Area ] (fill container)
[ Prompt Bar ] (fixed height, always visible)

The entire dashboard must NOT scroll.

Only internal sections should scroll.

✅ 2️⃣ FIX HEADER (Top Action Buttons)

Header must contain:

Page title

Re-upload Ledger button

Download Report button

Header must:

Be fixed at top

Not scroll

Not be inside any scrollable frame

Use “Hug contents” height

Stretch full width

These buttons must NEVER disappear on scroll.

✅ 3️⃣ FIX MAIN CONTENT AREA STRUCTURE

Main Content Area must:

Fill remaining height

Use horizontal auto layout

Contain:

Left → Filters Panel
Right → Results Panel

This section must NOT scroll globally.

✅ 4️⃣ FIX FILTERS PANEL

Inside Filters Panel:

Structure must be:

[ Scrollable Filters List ]
[ Sticky Action Buttons Section ]

Implementation:

Create two nested containers:

Top container:

Vertical scroll enabled

Contains all filter controls

Height: Fill container

Bottom container:

Contains:

Apply Filters

Reset Filters

Fixed height

NOT scrollable

Always visible at bottom of Filters panel

The buttons must NOT be inside the scrollable container.

✅ 5️⃣ FIX RESULTS PANEL

Inside Results Panel:

Structure:

Optional: Filter Chips (fixed)
Scrollable Transactions Table

Only the transactions table area should scroll.

NOT the entire panel.

✅ 6️⃣ RESTORE PROMPT BAR

The Prompt Input Bar must:

Exist at root dashboard level

Be below Main Content Area

Be fixed height

Be visible at all times

Not be inside Results Panel

Not be inside any scroll container

Add subtle top divider if needed.

Ensure bottom padding is added inside Results Panel so last row is not hidden behind prompt bar.

🎯 FINAL REQUIRED BEHAVIOR

• Header never scrolls
• Re-upload & Download never disappear
• Filters list scrolls independently
• Apply/Reset always visible
• Results table scrolls independently
• Prompt bar always visible
• Entire dashboard height locked to viewport

No full-page scrolling allowed.

⚠️ IMPORTANT

Audit all parent containers for:

“Hug contents” height (remove where inappropriate)

Nested scroll frames

Incorrect auto-layout stacking

Ensure scroll behavior exists ONLY in:

Filters list container

Transactions table container

Nowhere else.

This is a layout hierarchy repair — not a visual change.