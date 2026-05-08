Restore Sticky Areas + Overview Scroll

We have layout regressions after introducing the Workbook tab structure.

Issues:

Apply Filters and Reset Filters buttons disappeared.

Prompt bar in Investigation tab disappeared.

Overview tab is no longer scrollable.

Layout containers may be incorrectly set to Hug contents.

⚠️ DO NOT modify:

Workbook header

Global SaaS structure

Tabs (Overview / Investigation / Documentation)

Overall visual styling

Only fix container behavior and scroll hierarchy.

✅ FIX 1 — FILTERS PANEL (Apply/Reset Must Be Sticky + Visible)

Inside Investigation tab:

Filters Panel must have this structure:

Filters Panel (Fixed Width | Fill Height)

→ Filters Scroll Area (Vertical scroll enabled | Fill height)
→ Filters Action Bar (Fixed height | Always visible)

Rules:

Filters Scroll Area = ONLY this section scrolls.

Apply Filters + Reset Filters must be inside Filters Action Bar.

Filters Action Bar must NOT be inside the scroll container.

Filters Action Bar must be fixed at the bottom of Filters Panel.

Ensure parent Filters Panel is set to "Fill container" height.

Ensure Filters Action Bar is visible at all times.

✅ FIX 2 — PROMPT BAR (Must Always Be Visible)

Inside Investigation Results Container:

Correct structure:

Results Container (Fill container height)

→ Transactions Scroll Area (Vertical scroll enabled | Fill height)
→ Prompt Bar (Fixed height | Always visible)

Rules:

Prompt Bar must NOT be inside the Transactions scroll container.

Prompt Bar must be part of the main Results container auto layout.

Prompt Bar must sit below Transactions Scroll Area.

Prompt Bar must remain visible regardless of scroll.

Remove any absolute positioning or overflow clipping.

✅ FIX 3 — OVERVIEW PAGE NOT SCROLLING

Overview tab must be scrollable independently.

Fix:

Overview Content Frame must have Vertical Scroll enabled.

Overview Content Frame must be set to Fill container height.

Workbook root frame should have Overflow: Hidden.

Overview scroll must happen inside its own content container — not at page level.

Ensure Overview content frame is NOT set to Hug contents height.

✅ CRITICAL CONTAINER RULES (Prevents Future Breakage)

Workbook Main Frame:

Height: Fixed to viewport

Overflow: Hidden

Tabs Content Container:

Height: Fill remaining space

NOT Hug contents

Only these areas should scroll:

Filters Scroll Area

Transactions Scroll Area

Overview Content Frame

Nowhere else.

🎯 Expected Final Behavior

Investigation tab:
• Filters list scrolls
• Apply/Reset always visible
• Transactions scroll
• Prompt bar always visible

Overview tab:
• Content scrolls normally
• Header and tabs remain fixed

No global page scroll.
No disappearing components.