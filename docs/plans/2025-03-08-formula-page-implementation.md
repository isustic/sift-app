# Formula Page Redesign - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform the Formula page into an Excel-like experience with autocomplete, live validation, friendly errors, templates, and visual builder mode.

**Architecture:** Incremental enhancement of existing FormulaEditor component - keep backend changes minimal, focus on frontend UX improvements. New components for autocomplete, templates, and builder mode will coexist with existing code.

**Tech Stack:** React, TypeScript, Tauri (Rust backend), Tailwind CSS, shadcn/ui components

---

## Task 1: Fix Error Handling (Remove NextJS Overlay)

**Files:**
- Modify: `components/analysis/formula/FormulaEditor.tsx:71-76`

**Step 1: Remove console.error from catch block**

Replace the error logging that triggers NextJS overlay:

```typescript
// OLD (triggers NextJS error):
} catch (err) {
    console.error("Test failed:", err);
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    setError(`Formula test failed: ${errorMessage}. Please check your syntax and try again.`);
    setPreview(null);
}

// NEW (clean, no overlay):
} catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    setError(`Formula test failed: ${errorMessage}. Please check your syntax and try again.`);
    setPreview(null);
}
```

**Step 2: Remove console.error from loadFormulas**

```typescript
// Line 44-46, remove console.error:
} catch (err) {
    setError("Failed to load saved formulas.");
}
```

**Step 3: Remove console.error from handleSave**

```typescript
// Line 100-103, remove console.error:
} catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    setError(`Failed to save formula: ${errorMessage}. Please try again.`);
}
```

**Step 4: Remove console.error from handleDelete**

```typescript
// Line 119-122, remove console.error:
} catch (err) {
    setError("Failed to delete formula.");
}
```

**Step 5: Test error messages still display**

1. Run the app: `bun run tauri dev`
2. Go to Analysis → Formula
3. Enter an invalid formula like `AVG(BadColumn`
4. Click Test
5. Verify: Error message shows in Alert component, no NextJS overlay appears

**Step 6: Commit**

```bash
git add components/analysis/formula/FormulaEditor.tsx
git commit -m "fix: remove console.error calls to prevent NextJS error overlay"
```

---

## Task 2: Enhanced Function Reference with Search

**Files:**
- Modify: `components/analysis/formula/FunctionReference.tsx`
- Modify: `components/analysis/formula/FormulaEditor.tsx:280`

**Step 1: Add function metadata to FunctionReference**

Create a comprehensive function reference with descriptions and examples:

```typescript
interface FunctionInfo {
    name: string;
    syntax: string;
    description: string;
    example: string;
    returnType: string;
}

const functionData: Record<string, FunctionInfo> = {
    SUM: {
        name: "SUM",
        syntax: "SUM(column)",
        description: "Returns the total sum of values in a column",
        example: "SUM(Sales)",
        returnType: "number"
    },
    AVG: {
        name: "AVG",
        syntax: "AVG(column)",
        description: "Returns the average (mean) of values in a column",
        example: "AVG(Price)",
        returnType: "number"
    },
    COUNT: {
        name: "COUNT",
        syntax: "COUNT(column)",
        description: "Returns the number of non-null values",
        example: "COUNT(Orders)",
        returnType: "number"
    },
    // ... continue for all functions
};

const functionCategories = [
    {
        name: "Math",
        icon: "📊",
        functions: ["SUM", "AVG", "COUNT", "MIN", "MAX", "ROUND", "ABS", "POWER"]
    },
    // ... existing categories
];
```

**Step 2: Add search state and filter**

```typescript
export function FunctionReference({ onInsert }: FunctionReferenceProps) {
    const [searchQuery, setSearchQuery] = useState("");
    const [expandedFunction, setExpandedFunction] = useState<string | null>(null);

    const filteredCategories = functionCategories.map(cat => ({
        ...cat,
        functions: cat.functions.filter(fn =>
            fn.toLowerCase().includes(searchQuery.toLowerCase()) ||
            functionData[fn]?.description.toLowerCase().includes(searchQuery.toLowerCase())
        )
    })).filter(cat => cat.functions.length > 0);
}
```

**Step 3: Create expandable function card component**

```typescript
const FunctionCard = ({ fn, onInsert, isExpanded, onToggle }: {
    fn: string;
    onInsert: (fn: string) => void;
    isExpanded: boolean;
    onToggle: () => void;
}) => {
    const info = functionData[fn];
    if (!info) return null;

    return (
        <div className="mb-2">
            <button
                onClick={() => onToggle()}
                className="w-full px-2 py-1 text-xs bg-muted/50 rounded hover:bg-primary/20 hover:text-primary transition-colors text-left flex items-center justify-between"
            >
                <span>{fn}</span>
                <span className="text-[10px] text-muted-foreground">{isExpanded ? "▼" : "▶"}</span>
            </button>
            {isExpanded && (
                <div className="mt-1 ml-2 p-2 bg-background/50 rounded text-[10px] space-y-1">
                    <p className="font-mono text-primary">{info.syntax}</p>
                    <p className="text-muted-foreground">{info.description}</p>
                    <p className="font-mono text-muted-foreground">Example: {info.example}</p>
                    <button
                        onClick={() => onInsert(fn)}
                        className="text-xs text-primary hover:underline"
                    >
                        Insert {fn}
                    </button>
                </div>
            )}
        </div>
    );
};
```

**Step 4: Update render with search and cards**

```typescript
return (
    <div className="bg-card/30 border border-border/40 rounded-xl p-3">
        <h4 className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-2">Functions</h4>

        {/* Search Bar */}
        <input
            type="text"
            placeholder="Search functions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-2 py-1 text-xs bg-background border border-border/40 rounded mb-3"
        />

        <div className="space-y-2 max-h-64 overflow-auto">
            {filteredCategories.map((cat) => (
                <div key={cat.name}>
                    <p className="text-[10px] font-medium flex items-center gap-1 sticky top-0 bg-card/30 backdrop-blur-sm py-1">
                        <span>{cat.icon}</span> {cat.name}
                    </p>
                    {cat.functions.map((fn) => (
                        <FunctionCard
                            key={fn}
                            fn={fn}
                            onInsert={onInsert}
                            isExpanded={expandedFunction === fn}
                            onToggle={() => setExpandedFunction(expandedFunction === fn ? null : fn)}
                        />
                    ))}
                </div>
            ))}
            {filteredCategories.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-2">No functions found</p>
            )}
        </div>
    </div>
);
```

**Step 5: Test the enhanced function reference**

1. Run the app
2. Go to Analysis → Formula
3. Click on any function to expand it
4. Verify: Syntax, description, and example show
5. Use search to filter functions
6. Verify: Search filters by name and description

**Step 6: Commit**

```bash
git add components/analysis/formula/FunctionReference.tsx
git commit -m "feat: add searchable function reference with descriptions and examples"
```

---

## Task 3: Formula Autocomplete Component

**Files:**
- Create: `components/analysis/formula/FormulaAutocomplete.tsx`

**Step 1: Create the autocomplete component**

```typescript
"use client";

import { useState, useEffect, useRef } from "react";

interface AutocompleteItem {
    type: "function" | "column";
    name: string;
    detail?: string;
    icon?: string;
}

interface FormulaAutocompleteProps {
    query: string;
    columns: string[];
    onSelect: (item: AutocompleteItem) => void;
    onClose: () => void;
    position: { top: number; left: number };
}

export function FormulaAutocomplete({
    query,
    columns,
    onSelect,
    onClose,
    position
}: FormulaAutocompleteProps) {
    const [selectedIndex, setSelectedIndex] = useState(0);
    const menuRef = useRef<HTMLDivElement>(null);

    // Function definitions
    const functions = [
        { name: "SUM", detail: "Aggregate function", icon: "📊" },
        { name: "AVG", detail: "Aggregate function", icon: "📊" },
        { name: "COUNT", detail: "Aggregate function", icon: "📊" },
        { name: "MIN", detail: "Aggregate function", icon: "📊" },
        { name: "MAX", detail: "Aggregate function", icon: "📊" },
        { name: "ROUND", detail: "Math function", icon: "🔢" },
        { name: "ABS", detail: "Math function", icon: "🔢" },
        { name: "POWER", detail: "Math function", icon: "🔢" },
        { name: "IF", detail: "Logic function", icon: "🧠" },
        { name: "CASE", detail: "Logic function", icon: "🧠" },
        { name: "CONCAT", detail: "Text function", icon: "📝" },
        { name: "UPPER", detail: "Text function", icon: "📝" },
        { name: "LOWER", detail: "Text function", icon: "📝" },
        { name: "NOW", detail: "Date function", icon: "📅" },
        { name: "YEAR", detail: "Date function", icon: "📅" },
        { name: "MONTH", detail: "Date function", icon: "📅" },
    ];

    // Filter suggestions based on query
    const suggestions: AutocompleteItem[] = [
        ...functions.filter(f =>
            f.name.toLowerCase().startsWith(query.toLowerCase())
        ).map(f => ({ ...f, type: "function" as const })),
        ...columns.filter(c =>
            c.toLowerCase().includes(query.toLowerCase())
        ).map(c => ({ name: c, type: "column" as const, icon: "📄" }))
    ];

    // Handle keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "ArrowDown") {
                setSelectedIndex(i => Math.min(i + 1, suggestions.length - 1));
            } else if (e.key === "ArrowUp") {
                setSelectedIndex(i => Math.max(i - 1, 0));
            } else if (e.key === "Enter" && suggestions[selectedIndex]) {
                onSelect(suggestions[selectedIndex]);
            } else if (e.key === "Escape") {
                onClose();
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [suggestions, selectedIndex, onSelect, onClose]);

    // Close when clicking outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                onClose();
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [onClose]);

    if (suggestions.length === 0) return null;

    return (
        <div
            ref={menuRef}
            className="fixed z-50 w-64 bg-popover border border-border rounded-lg shadow-lg overflow-hidden"
            style={{ top: position.top + 24, left: position.left }}
        >
            {suggestions.map((item, index) => (
                <button
                    key={`${item.type}-${item.name}`}
                    onClick={() => onSelect(item)}
                    className={`w-full px-3 py-2 text-left text-sm flex items-center gap-2 transition-colors ${
                        index === selectedIndex
                            ? "bg-accent text-accent-foreground"
                            : "hover:bg-muted"
                    }`}
                >
                    <span>{item.icon}</span>
                    <span className="font-medium">{item.name}</span>
                    {item.detail && (
                        <span className="text-xs text-muted-foreground ml-auto">{item.detail}</span>
                    )}
                </button>
            ))}
        </div>
    );
}
```

**Step 2: Integrate autocomplete into FormulaEditor**

Add state for autocomplete:

```typescript
const [autocomplete, setAutocomplete] = useState<{
    show: boolean;
    query: string;
    position: { top: number; left: number };
}>({ show: false, query: "", position: { top: 0, left: 0 } });
```

**Step 3: Add autocomplete trigger handler**

```typescript
const handleAutocompleteTrigger = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const text = formula.substring(0, start);

    // Find the word being typed
    const match = text.match(/(\w+)$/);
    if (match && match[1].length >= 1) {
        const rect = textarea.getBoundingClientRect();
        setAutocomplete({
            show: true,
            query: match[1],
            position: {
                top: rect.bottom,
                left: rect.left
            }
        });
    } else {
        setAutocomplete(prev => ({ ...prev, show: false }));
    }
};
```

**Step 4: Add keydown listener for Ctrl+Space**

```typescript
useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.ctrlKey && e.key === " ") {
            e.preventDefault();
            handleAutocompleteTrigger();
        }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
}, [formula]);
```

**Step 5: Add autocomplete selector handler**

```typescript
const handleAutocompleteSelect = (item: AutocompleteItem) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const text = formula.substring(0, start);

    // Find and replace the word being typed
    const beforeCursor = text.replace(/\w+$/, "");
    const afterCursor = formula.substring(start);
    const newFormula = beforeCursor + item.name + afterCursor;

    setFormula(newFormula);
    setAutocomplete({ show: false, query: "", position: { top: 0, left: 0 } });

    // Focus textarea
    setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(beforeCursor.length + item.name.length, beforeCursor.length + item.name.length);
    }, 0);
};
```

**Step 6: Render autocomplete in FormulaEditor**

Add before the closing `</div>`:

```typescript
{autocomplete.show && (
    <FormulaAutocomplete
        query={autocomplete.query}
        columns={columns}
        onSelect={handleAutocompleteSelect}
        onClose={() => setAutocomplete(prev => ({ ...prev, show: false }))}
        position={autocomplete.position}
    />
)}
```

**Step 7: Test autocomplete**

1. Run the app
2. Go to Analysis → Formula
3. Type "AV" in the formula editor
4. Press Ctrl+Space
5. Verify: Autocomplete menu appears with AVG
6. Use arrow keys to navigate
7. Press Enter to select
8. Verify: Function name is inserted

**Step 8: Commit**

```bash
git add components/analysis/formula/FormulaAutocomplete.tsx components/analysis/formula/FormulaEditor.tsx
git commit -m "feat: add formula autocomplete with keyboard navigation"
```

---

## Task 4: Live Syntax Validation

**Files:**
- Create: `components/analysis/formula/useFormulaValidation.ts`
- Modify: `components/analysis/formula/FormulaEditor.tsx`

**Step 1: Create validation hook**

```typescript
"use client";

import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";

interface ValidationStatus {
    isValid: boolean;
    error: string | null;
    position?: { start: number; end: number };
}

export function useFormulaValidation(datasetId: number | null, formula: string, debounceMs = 500) {
    const [validation, setValidation] = useState<ValidationStatus>({
        isValid: true,
        error: null
    });
    const [isValidating, setIsValidating] = useState(false);

    useEffect(() => {
        if (!datasetId || !formula.trim()) {
            setValidation({ isValid: true, error: null });
            return;
        }

        const timeoutId = setTimeout(async () => {
            setIsValidating(true);
            try {
                // Try to validate by running a dry-run query
                await invoke("test_formula", {
                    datasetId,
                    formulaSql: formula,
                });
                setValidation({ isValid: true, error: null });
            } catch (err) {
                const errorMessage = err instanceof Error ? err.message : "Unknown error";
                setValidation({
                    isValid: false,
                    error: errorMessage
                });
            } finally {
                setIsValidating(false);
            }
        }, debounceMs);

        return () => clearTimeout(timeoutId);
    }, [datasetId, formula, debounceMs]);

    return { validation, isValidating };
}
```

**Step 2: Add validation indicator to FormulaEditor**

Import and use the hook:

```typescript
import { useFormulaValidation } from "./useFormulaValidation";

// In component:
const { validation, isValidating } = useFormulaValidation(datasetId, formula);
```

**Step 3: Add status indicator UI**

After the textarea, add:

```typescript
<div className="flex items-center gap-2 text-[10px] text-muted-foreground">
    {isValidating ? (
        <>
            <LoaderIcon className="h-3 w-3 animate-spin" />
            <span>Checking syntax...</span>
        </>
    ) : validation.isValid ? (
        <>
            <span className="text-green-500">✓</span>
            <span>Syntax OK</span>
        </>
    ) : (
        <>
            <span className="text-yellow-500">⚠</span>
            <span>{validation.error?.split(":").pop()?.trim().substring(0, 50)}...</span>
        </>
    )}
</div>
```

**Step 4: Disable Test button when validation fails**

Update the Test button:

```typescript
<Button
    onClick={handleTest}
    size="sm"
    disabled={!formula.trim() || isLoading || !validation.isValid || isValidating}
>
```

**Step 5: Test live validation**

1. Run the app
2. Go to Analysis → Formula
3. Type a valid formula: `AVG(Cantitate)`
4. Verify: "Syntax OK ✓" appears after typing stops
5. Type invalid formula: `AVG(Cantitate`
6. Verify: Warning appears showing error
7. Test button is disabled when invalid

**Step 6: Commit**

```bash
git add components/analysis/formula/useFormulaValidation.ts components/analysis/formula/FormulaEditor.tsx
git commit -m "feat: add live syntax validation with debouncing"
```

---

## Task 5: Templates Gallery

**Files:**
- Create: `components/analysis/formula/FormulaTemplates.tsx`

**Step 1: Create templates data**

```typescript
"use client";

interface FormulaTemplate {
    id: string;
    name: string;
    category: string;
    formula: string;
    description: string;
    placeholders: string[];
}

const templates: FormulaTemplate[] = [
    {
        id: "avg",
        name: "Average",
        category: "Metrics",
        formula: "AVG(column)",
        description: "Calculate the average of values",
        placeholders: ["column"]
    },
    {
        id: "sum",
        name: "Sum",
        category: "Metrics",
        formula: "SUM(column)",
        description: "Calculate the total sum of values",
        placeholders: ["column"]
    },
    {
        id: "count",
        name: "Count",
        category: "Metrics",
        formula: "COUNT(column)",
        description: "Count non-null values",
        placeholders: ["column"]
    },
    {
        id: "growth-rate",
        name: "Growth Rate",
        category: "Math",
        formula: "((current - previous) / previous) * 100",
        description: "Calculate percentage growth",
        placeholders: ["current", "previous"]
    },
    {
        id: "percent-change",
        name: "Percent Change",
        category: "Math",
        formula: "((new_value - old_value) / old_value) * 100",
        description: "Calculate percentage change between two values",
        placeholders: ["new_value", "old_value"]
    },
    {
        id: "year",
        name: "Year Extract",
        category: "Date",
        formula: "YEAR(date_column)",
        description: "Extract year from date",
        placeholders: ["date_column"]
    },
    {
        id: "month",
        name: "Month Extract",
        category: "Date",
        formula: "MONTH(date_column)",
        description: "Extract month from date",
        placeholders: ["date_column"]
    },
    {
        id: "datediff",
        name: "Date Difference",
        category: "Date",
        formula: "DATEDIFF(end_date, start_date)",
        description: "Calculate days between dates",
        placeholders: ["end_date", "start_date"]
    },
    {
        id: "concat",
        name: "Full Name",
        category: "Text",
        formula: "CONCAT(first_name, ' ', last_name)",
        description: "Combine text values",
        placeholders: ["first_name", "last_name"]
    },
    {
        id: "upper",
        name: "Uppercase",
        category: "Text",
        formula: "UPPER(text_column)",
        description: "Convert text to uppercase",
        placeholders: ["text_column"]
    },
    {
        id: "conditional",
        name: "Conditional Value",
        category: "Logic",
        formula: "IF(condition, value_if_true, value_if_false)",
        description: "Return different values based on condition",
        placeholders: ["condition", "value_if_true", "value_if_false"]
    },
];

const categories = ["Metrics", "Math", "Date", "Text", "Logic"];
```

**Step 2: Create template card component**

```typescript
interface FormulaTemplatesProps {
    onSelect: (formula: string) => void;
}

export function FormulaTemplates({ onSelect }: FormulaTemplatesProps) {
    const [selectedCategory, setSelectedCategory] = useState<string>("Metrics");

    const filteredTemplates = selectedCategory
        ? templates.filter(t => t.category === selectedCategory)
        : templates;

    return (
        <div className="bg-card/30 border border-border/40 rounded-xl p-3">
            <h4 className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-2">
                Quick Templates
            </h4>

            {/* Category Tabs */}
            <div className="flex flex-wrap gap-1 mb-3">
                <button
                    onClick={() => setSelectedCategory("Metrics")}
                    className={`px-2 py-0.5 text-xs rounded transition-colors ${
                        selectedCategory === "Metrics"
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted/50 hover:bg-muted"
                    }`}
                >
                    📈 Metrics
                </button>
                <button
                    onClick={() => setSelectedCategory("Math")}
                    className={`px-2 py-0.5 text-xs rounded transition-colors ${
                        selectedCategory === "Math"
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted/50 hover:bg-muted"
                    }`}
                >
                    🧮 Math
                </button>
                <button
                    onClick={() => setSelectedCategory("Date")}
                    className={`px-2 py-0.5 text-xs rounded transition-colors ${
                        selectedCategory === "Date"
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted/50 hover:bg-muted"
                    }`}
                >
                    📅 Date
                </button>
                <button
                    onClick={() => setSelectedCategory("Text")}
                    className={`px-2 py-0.5 text-xs rounded transition-colors ${
                        selectedCategory === "Text"
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted/50 hover:bg-muted"
                    }`}
                >
                    📝 Text
                </button>
                <button
                    onClick={() => setSelectedCategory("Logic")}
                    className={`px-2 py-0.5 text-xs rounded transition-colors ${
                        selectedCategory === "Logic"
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted/50 hover:bg-muted"
                    }`}
                >
                    🧠 Logic
                </button>
            </div>

            {/* Template Grid */}
            <div className="grid grid-cols-2 gap-2">
                {filteredTemplates.map((template) => (
                    <button
                        key={template.id}
                        onClick={() => onSelect(template.formula)}
                        className="p-2 bg-background/50 rounded hover:bg-primary/10 transition-colors text-left group"
                    >
                        <p className="text-xs font-medium group-hover:text-primary transition-colors">
                            {template.name}
                        </p>
                        <p className="text-[10px] text-muted-foreground font-mono truncate">
                            {template.formula}
                        </p>
                    </button>
                ))}
            </div>
        </div>
    );
}
```

**Step 3: Add template handler to FormulaEditor**

```typescript
const handleTemplateSelect = (templateFormula: string) => {
    setFormula(templateFormula);
    // Highlight first placeholder for replacement
    setTimeout(() => {
        const textarea = textareaRef.current;
        if (textarea) {
            const match = templateFormula.match(/[a-z_]+/i);
            if (match) {
                const start = templateFormula.indexOf(match[0]);
                textarea.focus();
                textarea.setSelectionRange(start, start + match[0].length);
            }
        }
    }, 0);
};
```

**Step 4: Add templates to sidebar**

```typescript
<FormulaTemplates onSelect={handleTemplateSelect} />
```

**Step 5: Test templates**

1. Run the app
2. Go to Analysis → Formula
3. Click on "Average" template
4. Verify: `AVG(column)` appears in editor
5. Verify: First "column" is highlighted for replacement
6. Try different categories

**Step 6: Commit**

```bash
git add components/analysis/formula/FormulaTemplates.tsx components/analysis/formula/FormulaEditor.tsx
git commit -m "feat: add formula templates gallery"
```

---

## Task 6: Visual Builder Mode

**Files:**
- Create: `components/analysis/formula/FormulaBuilder.tsx`
- Modify: `components/analysis/formula/FormulaEditor.tsx`

**Step 1: Create builder component**

```typescript
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronDown } from "lucide-react";

interface FormulaBuilderProps {
    columns: string[];
    onFormulaChange: (formula: string) => void;
    currentFormula: string;
}

type BuildStep = {
    type: "function" | "column" | "operator" | "value";
    value: string;
    display: string;
};

export function FormulaBuilder({ columns, onFormulaChange, currentFormula }: FormulaBuilderProps) {
    const [steps, setSteps] = useState<BuildStep[]>([]);
    const [selectedFunction, setSelectedFunction] = useState<string>("");

    const functions = [
        { name: "AVG", display: "AVG()", category: "Aggregate" },
        { name: "SUM", display: "SUM()", category: "Aggregate" },
        { name: "COUNT", display: "COUNT()", category: "Aggregate" },
        { name: "MIN", display: "MIN()", category: "Aggregate" },
        { name: "MAX", display: "MAX()", category: "Aggregate" },
        { name: "ROUND", display: "ROUND(value, decimals)", category: "Math" },
        { name: "ABS", display: "ABS()", category: "Math" },
        { name: "POWER", display: "POWER(base, exp)", category: "Math" },
    ];

    const operators = [
        { symbol: "+", display: "+ Add" },
        { symbol: "-", display: "- Subtract" },
        { symbol: "*", display: "* Multiply" },
        { symbol: "/", display: "/ Divide" },
    ];

    const addStep = (step: BuildStep) => {
        setSteps([...steps, step]);
        updateFormula([...steps, step]);
    };

    const removeStep = (index: number) => {
        const newSteps = steps.filter((_, i) => i !== index);
        setSteps(newSteps);
        updateFormula(newSteps);
    };

    const updateFormula = (currentSteps: BuildStep[]) => {
        const formula = currentSteps.map(step => step.value).join(" ");
        onFormulaChange(formula);
    };

    return (
        <div className="space-y-4">
            {/* Generated Formula Preview */}
            <div className="bg-background/50 rounded-lg p-3 border border-border/30">
                <p className="text-[10px] text-muted-foreground mb-1">Your formula:</p>
                <p className="font-mono text-sm">{currentFormula || "<building...>"}</p>
            </div>

            {/* Function Selection */}
            <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    Start with a function
                </label>
                <div className="grid grid-cols-2 gap-2">
                    {functions.map((fn) => (
                        <button
                            key={fn.name}
                            onClick={() => addStep({
                                type: "function",
                                value: fn.name + "()",
                                display: fn.display
                            })}
                            className="px-3 py-2 bg-muted/30 rounded hover:bg-primary/20 transition-colors text-left"
                        >
                            <p className="text-sm font-medium">{fn.display}</p>
                            <p className="text-[10px] text-muted-foreground">{fn.category}</p>
                        </button>
                    ))}
                </div>
            </div>

            {/* Column Selection */}
            <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    Add a column
                </label>
                <div className="flex flex-wrap gap-1">
                    {columns.map((col) => (
                        <button
                            key={col}
                            onClick={() => addStep({
                                type: "column",
                                value: col,
                                display: col
                            })}
                            className="px-2 py-1 text-xs bg-muted/50 rounded hover:bg-primary/20 transition-colors"
                        >
                            {col}
                        </button>
                    ))}
                </div>
            </div>

            {/* Operators */}
            <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    Add an operator
                </label>
                <div className="flex gap-2">
                    {operators.map((op) => (
                        <button
                            key={op.symbol}
                            onClick={() => addStep({
                                type: "operator",
                                value: op.symbol,
                                display: op.display
                            })}
                            className="px-4 py-2 bg-muted/30 rounded hover:bg-primary/20 transition-colors"
                        >
                            {op.symbol}
                        </button>
                    ))}
                </div>
            </div>

            {/* Current Steps */}
            {steps.length > 0 && (
                <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        Your building blocks
                    </label>
                    <div className="flex flex-wrap gap-2">
                        {steps.map((step, index) => (
                            <button
                                key={index}
                                onClick={() => removeStep(index)}
                                className="px-2 py-1 bg-primary/20 rounded text-sm flex items-center gap-1 hover:bg-destructive/20 group"
                                title="Click to remove"
                            >
                                {step.display}
                                <span className="text-destructive opacity-0 group-hover:opacity-100">×</span>
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
```

**Step 2: Add mode toggle to FormulaEditor**

```typescript
const [mode, setMode] = useState<"code" | "builder">("code");
```

**Step 3: Add mode toggle UI**

After the Input field, add:

```typescript
<div className="flex gap-1 p-1 bg-muted/30 rounded-lg">
    <button
        onClick={() => setMode("code")}
        className={`px-3 py-1 text-xs rounded transition-colors ${
            mode === "code"
                ? "bg-background shadow-sm"
                : "hover:bg-background/50"
        }`}
    >
        ⚡ Code
    </button>
    <button
        onClick={() => setMode("builder")}
        className={`px-3 py-1 text-xs rounded transition-colors ${
            mode === "builder"
                ? "bg-background shadow-sm"
                : "hover:bg-background/50"
        }`}
    >
        🧩 Builder
    </button>
</div>
```

**Step 4: Render builder mode**

Conditionally render:

```typescript
{mode === "code" ? (
    // Existing textarea editor
    <textarea
        ref={textareaRef}
        placeholder="Enter formula (e.g., AVG(Sales) - SUM(Expenses))"
        value={formula}
        onChange={(e) => setFormula(e.target.value)}
        disabled={isLoading}
        className="w-full h-32 px-3 py-2 border border-border/40 rounded-lg text-sm font-mono bg-background resize-none disabled:opacity-50"
    />
) : (
    <FormulaBuilder
        columns={columns}
        onFormulaChange={setFormula}
        currentFormula={formula}
    />
)}
```

**Step 5: Test builder mode**

1. Run the app
2. Go to Analysis → Formula
3. Click "Builder" mode
4. Select AVG function
5. Select a column
6. Add operator
7. Select another column
8. Verify: Formula builds correctly
9. Switch back to Code mode
10. Verify: Generated formula appears

**Step 6: Commit**

```bash
git add components/analysis/formula/FormulaBuilder.tsx components/analysis/formula/FormulaEditor.tsx
git commit -m "feat: add visual formula builder mode"
```

---

## Task 7: Polish and Testing

**Files:**
- Modify: `components/analysis/formula/FormulaEditor.tsx`
- Modify: `src-tauri/src/commands/formula.rs`

**Step 1: Add keyboard shortcuts documentation**

Add a help tooltip or info button showing shortcuts:

```typescript
<div className="text-[10px] text-muted-foreground flex items-center gap-2">
    <span>💡</span>
    <span>Ctrl+Space: Autocomplete • Ctrl+Enter: Test</span>
</div>
```

**Step 2: Add loading states**

Ensure all buttons show loading state properly during operations.

**Step 3: Test all features end-to-end**

1. **Error Messages**: Type invalid formula, verify friendly error
2. **Autocomplete**: Type partial function name, press Ctrl+Space
3. **Live Validation**: Type formula, watch validation indicator
4. **Function Reference**: Click function to expand, see examples
5. **Templates**: Click template, verify it loads
6. **Builder Mode**: Build formula visually, verify it works
7. **Save/Load**: Save formula, reload it, verify it works
8. **Delete**: Delete formula, verify it's removed

**Step 4: Final commit**

```bash
git add .
git commit -m "polish: complete Formula page redesign with Excel-like experience"
```

---

## Summary

This plan transforms the Formula page into an Excel-like experience through incremental improvements:

1. **Error Handling** - Clean, friendly errors without NextJS overlay
2. **Function Reference** - Searchable, expandable docs with examples
3. **Autocomplete** - Keyboard-driven completion for functions and columns
4. **Live Validation** - Real-time syntax checking with debouncing
5. **Templates** - Quick-start formulas for common tasks
6. **Builder Mode** - Visual block-based formula building

Each task is self-contained and testable. Users can now create formulas whether they're SQL experts or complete beginners.
