Fix Prompt Bar Overflow Into Filters Sidebar

The Prompt Bar is currently overflowing into the Filters sidebar.

It must align only with the Results panel and must NOT extend under or into the Filters panel.

Do NOT redesign visuals.
Do NOT change spacing system.
Only fix layout structure and width constraints.

✅ GOAL

Prompt Bar should:

• Be fixed at bottom
• Align only with Results Panel width
• Not overlap Filters sidebar
• Not be full dashboard width
• Respect layout grid

🧱 REQUIRED STRUCTURE CORRECTION

Currently likely structure:

Dashboard
→ Header
→ Main Content (Filters | Results)
→ Prompt Bar (full width)

This is incorrect.

✅ CORRECT STRUCTURE

Restructure as:

Dashboard (Vertical Auto Layout, fixed height)

→ Header (fixed)

→ Main Content (Horizontal Auto Layout, Fill Container)

  → Filters Panel (fixed width, e.g., 320px)

  → Right Content Container (Vertical Auto Layout, Fill Container)

    → Results Area (Scrollable)

    → Prompt Bar (Fixed Height, Bottom)

🔧 IMPLEMENTATION DETAILS

1️⃣ Move Prompt Bar INSIDE the Right Content Container.
It must NOT sit at root dashboard level.

2️⃣ Set Right Content Container to:

Fill container width

Vertical auto layout

Height: Fill remaining space

3️⃣ Results Area:

Height: Fill container

Scroll enabled

4️⃣ Prompt Bar:

Fixed height (e.g., 96px)

Width: Fill container (but container = results side only)

Positioned below Results Area

Not absolutely positioned

📐 WIDTH RULES

Filters Panel:

Fixed width

Does not stretch

Right Content Container:

Fills remaining horizontal space

Prompt Bar:

Width = Right Content Container width

Must not extend beyond it

❌ REMOVE

Absolute positioning

Full width constraints at root level

Any manual width values exceeding results container

🎯 FINAL EXPECTED BEHAVIOR

Filters sidebar remains separate
Results scroll independently
Prompt bar stays fixed at bottom of results area
Prompt bar does NOT touch or overlap filters

Layout behaves like:

ChatGPT with left sidebar
Not like a global footer bar