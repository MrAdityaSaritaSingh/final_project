---
name: Forensic Professional
colors:
  surface: '#fbf9fa'
  surface-dim: '#dcd9da'
  surface-bright: '#fbf9fa'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f6f3f4'
  surface-container: '#f0edee'
  surface-container-high: '#eae7e9'
  surface-container-highest: '#e4e2e3'
  on-surface: '#1b1b1d'
  on-surface-variant: '#44474c'
  inverse-surface: '#303031'
  inverse-on-surface: '#f3f0f1'
  outline: '#75777c'
  outline-variant: '#c5c6cc'
  surface-tint: '#555f6f'
  primary: '#0a1422'
  on-primary: '#ffffff'
  primary-container: '#1f2937'
  on-primary-container: '#8690a1'
  inverse-primary: '#bdc7d9'
  secondary: '#5d5f5f'
  on-secondary: '#ffffff'
  secondary-container: '#dfe0e0'
  on-secondary-container: '#616363'
  tertiary: '#0d1520'
  on-tertiary: '#ffffff'
  tertiary-container: '#222935'
  on-tertiary-container: '#89909f'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d9e3f6'
  primary-fixed-dim: '#bdc7d9'
  on-primary-fixed: '#121c2a'
  on-primary-fixed-variant: '#3d4756'
  secondary-fixed: '#e2e2e2'
  secondary-fixed-dim: '#c6c6c7'
  on-secondary-fixed: '#1a1c1c'
  on-secondary-fixed-variant: '#454747'
  tertiary-fixed: '#dce2f3'
  tertiary-fixed-dim: '#c0c7d6'
  on-tertiary-fixed: '#151c27'
  on-tertiary-fixed-variant: '#404754'
  background: '#fbf9fa'
  on-background: '#1b1b1d'
  surface-variant: '#e4e2e3'
typography:
  header-nav:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: -0.02em
  table-header:
    fontFamily: IBM Plex Sans
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
  table-cell:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
    letterSpacing: 0em
  mono-data:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  status-label:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '700'
    lineHeight: 12px
spacing:
  grid-gutter: 1px
  cell-padding-x: 12px
  cell-padding-y: 8px
  panel-gap: 16px
  container-margin: 24px
---

## Brand & Style
The design system is engineered for the high-stakes environment of financial auditing and forensic accounting. It evokes an atmosphere of meticulous precision, absolute clarity, and unyielding objectivity. The target audience—auditors, investigators, and compliance officers—requires a tool that eliminates visual noise to focus entirely on data integrity.

The UI style is **Minimalist-Institutional**. It prioritizes structural integrity through a disciplined use of borders rather than shadows. The aesthetic is "paper-digital," mirroring the authoritative feel of high-grade physical audit reports while leveraging modern interactivity. Every element is designed to feel "pinned" or "stapled" in place, suggesting a permanent record and a rigorous trail of evidence.

## Colors
The palette is rooted in high-contrast neutrality. **Deep Charcoal (#1F2937)** is reserved for global navigation and structural headers, providing a heavy, authoritative frame for the application. **Crisp White (#FFFFFF)** serves as the primary workspace background, ensuring maximum legibility for dense data.

Semantic colors are used with extreme intent:
- **Critical Red (#DC2626):** For verified errors, failed reconciliations, and high-risk flags.
- **Warning Amber (#F59E0B):** For data discrepancies, missing documentation, or pending reviews.
- **Success Green (#10B981):** For verified entries and closed audit points.
- **Action Blue (#2563EB):** Used sparingly for interactive focus states and primary actions to distinguish "system intent" from "data status."

## Typography
This design system utilizes **Inter** for its neutral, highly legible character at small sizes, making it ideal for the dense informational grids inherent in auditing. For tabular numeric data and transaction IDs, **IBM Plex Sans** or a monospaced variant is introduced to ensure vertical alignment of digits, allowing auditors to scan columns for decimal inconsistencies effortlessly.

Hierarchy is established through weight and casing rather than significant size variations. Table headers use uppercase styling with increased letter spacing to distinguish structural metadata from the data itself.

## Layout & Spacing
The layout follows a **Strict Fixed-Grid** model within flexible panels. The primary workspace is often divided into **Split-Screen Panels**, allowing for side-by-side comparison of source documents and ledger entries. 

A "1px Grid" philosophy is used for data tables: instead of wide gutters, elements are separated by thin, purposeful borders (#E5E7EB). This maximizes data density while maintaining clear row and column definitions. Spacing is compact, utilizing a 4px base unit, ensuring that the maximum amount of evidence is visible on-screen without requiring excessive scrolling.

## Elevation & Depth
Elevation is achieved through **Tonal Layering** and **Bold Borders** rather than shadows. In this design system, "depth" is synonymous with "priority."
- **Level 0 (Surface):** The main workspace (#FFFFFF).
- **Level 1 (Panels):** Defined by 1px solid borders (#E5E7EB).
- **Level 2 (Active/Focus):** Indicated by a 2px solid offset border in Action Blue.
- **Popovers/Modals:** Use a sharp 1px border with a very subtle, tight 4px blur shadow (#000000 with 10% opacity) to provide just enough separation from the data grid below.

## Shapes
The shape language is **Sharp (0px)**. Rounded corners are avoided to maintain the "Forensic" aesthetic, suggesting precision and technical rigor. Square corners allow for perfectly flush alignments in split-screen views and data-dense tables, reinforcing the structured nature of financial ledgers.

## Components
### Data Tables
Tables are the core of the design system. They feature **zebra-striping** on hover and a distinct **row-selection state** using a pale blue background. Columns are sortable with persistent "active" indicators. 

### "Staple" Status Indicators
Instead of soft pill-shaped badges, status indicators are rectangular "staple" tags. They feature a vertical color bar on the left edge (Red, Amber, or Green) with a high-contrast background, mimicking a physical tag clipped to a file.

### Split-Screen Panels
The interface supports adjustable vertical dividers. One side typically displays the "General Ledger" while the other displays "Audit Evidence" (PDFs, receipts, or notes). The divider handle is a high-contrast 1px line that highlights on hover.

### Inputs & Focus States
Input fields use a 1px border. The **Focus State** is critical: when a field is selected, it receives a 2px interior border of Action Blue, ensuring the auditor always knows exactly where data is being entered.

### Checkboxes
Square, sharp-edged boxes. When checked, they fill with Deep Charcoal and a white checkmark, providing a "stamped" feel of verification.
