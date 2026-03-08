# Formula Page Redesign - Design Document

**Date**: 2025-03-08
**Status**: Approved
**Approach**: Excel-like Experience

---

## Overview

Transform the Formula page into an Excel-like experience that works for all skill levels - from beginners who need guidance to power users who want speed.

## Goals

1. **All skill levels welcome**: Beginners can discover and learn, experts can fly
2. **Friendly error handling**: No more cryptic SQL errors or NextJS overlays
3. **Reusable formulas**: Save once, use everywhere (pivot, trends, blend)
4. **Instant feedback**: See what's happening before hitting Save

---

## Design Sections

### 1. Editor Experience

**Autocomplete**:
- Function autocomplete with descriptions and return types
- Column autocomplete with type icons (🔢 number, 📅 date, 📝 text)
- Keyboard shortcuts: Ctrl+Space for autocomplete, Ctrl+Enter to test

**Live Validation**:
- Red squiggle for syntax errors
- Yellow squiggle for warnings
- Status indicator: "Syntax OK ✓" or "Missing parenthesis ⚠️"

**Editor Improvements**:
- Line numbers for longer formulas
- Bracket matching/highlighting
- Proper tab/indentation support

### 2. Enhanced Function Reference

**Sidebar Features**:
- Search bar to filter functions
- Expandable function cards showing:
  - Function name and category
  - Syntax template
  - Plain English description
  - Example with real data
  - Return type
- One-click insert at cursor position

**Function Categories**:
- Math: SUM, AVG, COUNT, MIN, MAX, ROUND, ABS, POWER
- Date: NOW, YEAR, MONTH, DAY, DATEDIFF, DATE
- Text: CONCAT, UPPER, LOWER, SUBSTRING, LENGTH, TRIM
- Logic: IF, CASE, COALESCE, NULLIF

### 3. Friendly Error Messages

**Error Display**:
- Underline exact error location in formula
- Plain English explanation
- Context-aware suggestions
- One-click auto-fix options
- Example fixes

**No More NextJS Overlay**:
- All errors displayed in our UI
- Clean, non-blocking error messages
- Optional "dismiss" button

### 4. Templates Gallery

**Quick Templates**:
- Categorized: Metrics, Math, Date, Text, Logic
- Click to insert formula
- Auto-fills editor
- Highlights placeholders to customize

**Example Templates**:
- Average: `AVG(column)`
- Sum: `SUM(column)`
- Growth Rate: `((current - previous) / previous) * 100`
- Year Over Year: Complex date-based comparison
- Full Name: `CONCAT(FirstName, " ", LastName)`

### 5. Formula Builder Mode (Visual)

**Toggle Between Modes**:
- Code mode: Current SQL editor (enhanced)
- Builder mode: Visual block interface

**Builder Mode Features**:
- Step-by-step guided building
- Select function → Select column → Add operations
- Shows generated SQL in real-time (learning opportunity)
- Easy switch to code mode

---

## Implementation Notes

### Error Handling Fix (Immediate)

Remove NextJS error overlay by:
1. Removing `console.error` calls in catch blocks
2. Ensuring all errors are caught and displayed in UI only
3. Using try-catch properly without unhandled rejections

### Backend Changes Needed

- **Better error parsing**: Parse SQLite errors to extract specific issues
- **Error position mapping**: Return character offset of syntax errors
- **Column type detection**: Return column types for autocomplete

### Frontend Changes Needed

- **Autocomplete component**: Debounced search, keyboard nav
- **Live validation**: Real-time syntax checking (debounced)
- **Template system**: Pre-defined formulas with placeholders
- **Builder mode**: New UI component for visual building

---

## Future Enhancements (Post-MVP)

- AI-powered formula suggestions
- Formula sharing between datasets
- Export/import formulas
- Formula versioning
- Advanced debugging mode

---

## Success Criteria

1. User can create a valid formula without prior SQL knowledge
2. Error messages are actionable and helpful
3. Power users can create formulas faster than before
4. Formulas work across all analysis features
