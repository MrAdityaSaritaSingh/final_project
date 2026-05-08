Fix Query Box to Always Be Visible (Sticky Bottom Layout)

Apply the following layout restructuring to the Filter / Query Investigation Screen.

Do NOT redesign styling.
Do NOT modify spacing tokens or typography.
Only restructure layout behavior.

✅ GOAL

The Query Input Bar must:

• Always remain visible
• Be fixed at the bottom of the screen
• Not require scrolling to access
• Behave like ChatGPT / Gemini chat input
• Stay visible regardless of screen size

🧱 REQUIRED LAYOUT STRUCTURE

Restructure page into 3 vertical sections:

1️⃣ Header (Top – fixed)
2️⃣ Scrollable Content Area (Middle – flexible height)
3️⃣ Fixed Query Bar (Bottom – sticky)

🧩 IMPLEMENTATION DETAILS
1️⃣ Outer Frame (Main Page Container)

Set to:

Height: 100% viewport height

Layout: Vertical Auto Layout

Distribution:

Header (hug contents)

Content Section (fill container)

Query Bar (hug contents)

2️⃣ Scrollable Content Area

The middle content section must:

Have vertical scrolling enabled

Fill remaining available height

NOT include the query bar inside it

This section contains:

Filter bar

Active filter chips

Transactions table

Any summary cards

Only this section scrolls.

3️⃣ Fixed Query Bar (Critical)

Move the Query Box OUT of the scroll container.

Place it as the final element in the main vertical layout.

Properties:

Fixed height (e.g., 80–120px)

Full width

Sticky at bottom

Light top border (subtle divider)

Slight background contrast (very subtle — audit tone)

It must:

Always be visible

Never scroll away

Never overlap content

📐 SPACING RULE

Ensure:

Scrollable content area has bottom padding equal to query bar height
So last table row is not hidden behind the query bar.

❌ REMOVE

Any layout where query box is nested inside scroll frame

Any behavior where scrolling pushes query input out of view

Any requirement to scroll to access query

🎨 VISUAL TONE

Keep enterprise style.

No floating chat bubbles.
No rounded mobile-style bar.
No heavy shadow.

Just a clean, fixed bottom command bar.

🎯 FINAL STRUCTURE SHOULD BE

[ Header ]
[ Scrollable Filters + Results ]
[ Fixed Bottom Query Command Bar ]

Query should behave like a command console.

🧠 WHY THIS IS IMPORTANT

This:

• Encourages investigation
• Makes the AI feel central
• Prevents friction
• Matches modern LLM UX standards
• Makes screen feel professional

Right now, if users must scroll to access it, it feels secondary.

We want it to feel like the primary action layer.