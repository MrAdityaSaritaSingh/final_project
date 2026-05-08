Introduce Workbook Architecture + Documentation System

⚠️ CRITICAL: Do NOT modify existing dashboard layout structure.

Do NOT change:

Root dashboard fixed height

Scroll behavior (filters scroll only, results scroll only)

Sidebar width

Prompt bar placement inside results container

Header fixed positioning

Only introduce new screens and structured navigation around the existing system.

🧱 PART 1 — GLOBAL LEVEL (SaaS STRUCTURE)

Create new global application flow:

Login → Home Dashboard → Workbook → (Overview | Investigation | Documentation)

🖥 1️⃣ LOGIN SCREEN

Minimal enterprise SaaS layout.

Left side:
Brand panel (subtle gradient or corporate background)

Right side:
Login form:

Email

Password

Sign In button

“Create Account” link

Keep clean. Corporate. No redesign beyond necessary structure.

🏠 2️⃣ HOME DASHBOARD (Workbook Manager)

Purpose:
This is NOT risk dashboard.
This is workbook management screen.

Layout:

Top Header:

Product Name (left)

User Profile dropdown (right)

Main Content:

Top Section:
Primary button:

Create New Workbook

Below:
Workbook List Table

Columns:

Client Name

Financial Year

Status (Draft / In Progress / Completed)

Last Modified

Risk Score (optional placeholder)

Each row is clickable → opens workbook.

No Chrome-style tabs here.

Clean SaaS dashboard feel.

📂 3️⃣ CREATE NEW WORKBOOK FLOW

Clicking “Create New Workbook”:

Open modal OR dedicated page:

Fields:

Client Name

Financial Year

Functional Currency

Engagement Type (optional placeholder)

Button:
Create Workbook

After creation → Redirect to Workbook View.

📘 4️⃣ WORKBOOK STRUCTURE (Inside a Workbook)

Replace current standalone flow with structured tabs.

Top Section:

Workbook Header:
Client Name | FY | Status | Last Modified

Below Header:
Fixed Top Tabs (Horizontal)

Tabs:

1️⃣ Overview
2️⃣ Investigation
3️⃣ Documentation

No dynamic tab creation.
No Chrome-style tab duplication.

Clean, fixed enterprise tabs.

🟢 OVERVIEW TAB

This contains:

Your existing Risk Intelligence Dashboard.

Do NOT alter layout.
Embed current risk dashboard here exactly as is.

This becomes Overview.

🔎 INVESTIGATION TAB

This contains:

Your existing Filter / Query Investigation screen.

Do NOT modify layout structure.
Do NOT touch scroll zones.

Enhancement:

Add new column to transaction table:

Button:
“Add to Documentation”

Icon + Label.

Remove simple copy-only icon approach.

When clicked:
Transaction gets added to Documentation Evidence List.

No popups required for now.
Just visual confirmation (e.g., small toast or checkmark).

📝 DOCUMENTATION TAB

Split layout:

Horizontal structure:

Left (70%) → Rich Text Editor
Right (30%) → Evidence Panel

LEFT SIDE — Word-Like Editor

Features:

Large white document canvas

Basic toolbar:

Bold

Italic

Underline

Bullet list

Numbered list

Heading styles

Section title placeholder:
“Audit Working Paper — Ledger Scrutiny”

Document should feel like:

Professional audit documentation area.

RIGHT SIDE — Evidence Panel

Title:
Selected Evidence

List of transactions added from Investigation.

Each evidence card shows:

Date

Journal ID

Account

Amount

Risk Tags (badges)

Control Triggered

Each card has:

“Insert into Document” button

When clicked:

Insert formatted block at cursor position in editor.

📄 FORMATTED INSERT STRUCTURE

When inserting transaction into document, format like:

Transaction Reference: JRN-10234
Date: 12-Apr-2024
Account: Sales Revenue
Amount: ₹4,50,000
Triggered Controls: Unusual Amount, Manual Entry

Narration: "Adjustment entry"

Keep structured.
Audit-ready.
Professional.

📥 EXPORT FLOW

Move “Download Report” option to Documentation Tab only.

Export options:

Export as PDF

Export as DOCX (placeholder for now)

Do NOT allow export from Investigation tab anymore.

Documentation becomes final output source.

🔐 MULTI-USER FUTURE SAFE DESIGN

Add small top-right area in Workbook Header:

“Collaborators” (placeholder avatar stack)

No functionality needed.
Just visual placeholder for future SaaS collaboration.

🎯 FINAL USER FLOW

Login
→ Home
→ Create Workbook
→ Data Ingestion (existing flow)
→ Risk Dashboard (Overview tab)
→ Investigation
→ Add to Documentation
→ Documentation tab
→ Insert evidence
→ Finalize report
→ Export

That’s enterprise audit workflow.

🧠 IMPORTANT LAYOUT RULE

Under no circumstance should:

Investigation layout hierarchy be altered

Scroll structure be modified

Prompt bar be relocated

Filters panel width change

All new architecture must wrap around existing stabilized layouts.