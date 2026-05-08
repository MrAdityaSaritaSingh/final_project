Fix Dashboard Height & Create Controlled Scroll Zones

Apply the following structural layout correction to the Filter / Investigation Dashboard Screen.

Do NOT change styling.
Do NOT redesign components.
Only fix layout architecture and height behavior.

✅ PRIMARY GOAL

The dashboard must:

• Occupy exactly 100% of viewport height
• NOT grow vertically beyond screen height
• Contain internal scroll zones
• Keep key action areas always visible

🧱 STEP 1 — Fix Main Dashboard Frame

Select the outermost dashboard frame.

Change:

Height → Fixed to viewport height (e.g., 100vh equivalent)
NOT “Hug contents”

Set vertical Auto Layout:

Structure:

1️⃣ Header (fixed height)
2️⃣ Main Content Area (Fill container)
3️⃣ Prompt Bar (fixed height)

The main dashboard frame must NOT scroll.

🧱 STEP 2 — Create Internal Scroll Containers

We now define scroll zones properly.

Inside “Main Content Area”:

Split into layout structure:

Left: Filters Panel
Right: Results Panel

Set both as separate vertical auto-layout containers.

Filters Panel Structure

Inside Filters Panel:

Top Section → Scrollable filters list
Bottom Section → Sticky action buttons

So structure becomes:

[ Scrollable Filters Area ]
[ Apply Filters | Reset Filters ] ← fixed at bottom of filters panel

Important:
Only the filters list scrolls.
Buttons must be outside the scroll container.

Results Panel Structure

Inside Results Panel:

Top:
Active filter chips (optional fixed)

Middle:
Scrollable transactions table

Bottom:
Nothing (since prompt bar lives globally at page bottom)

Only the transactions table scrolls.

🧱 STEP 3 — Prompt Bar Fix (Global Sticky)

Prompt bar must:

Be outside the main content scroll area
Be placed at root dashboard level
Have fixed height
Have full width

Structure:

Dashboard Frame
→ Header
→ Main Content (scroll zones inside)
→ Prompt Bar (fixed, non-scrollable)

The prompt bar must NOT be inside Results container.

📐 CRITICAL CONSTRAINT RULES

Main Dashboard Frame:
Height: Fixed
Overflow: Hidden

Scrollable Areas:
Only:

Filters list

Transactions table

NOT:

Entire dashboard

Entire left panel

Entire right panel

🎯 FINAL EXPECTED BEHAVIOR

No matter how many:

• Filters
• Transactions
• Chips

The screen height remains fixed.

Only:

Filters list scrolls independently
Transactions scroll independently

Apply/Reset always visible
Prompt bar always visible

No global page scrolling.

🧠 What Was Wrong Before

Figma likely had:

Main frame set to Hug contents
Everything stacked vertically
No internal scroll zones
Sticky elements inside a scrolling parent

That can never work correctly.

We are fixing layout hierarchy — not stickiness.

🏁 After This Fix

Your dashboard will behave like:

• Notion
• ChatGPT
• Airtable
• Modern admin dashboards

Controlled. Structured. Professional.