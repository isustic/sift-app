"use client";

import { useEffect, useState, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Save, Play, Trash2, Plus, LoaderIcon, AlertCircleIcon, CheckCircle2Icon, Calculator } from "lucide-react";
import { FunctionReference } from "./FunctionReference";
import { FormulaAutocomplete, AutocompleteItem } from "./FormulaAutocomplete";
import { FormulaTemplates } from "./FormulaTemplates";
import { useFormulaValidation } from "./useFormulaValidation";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface FormulaEditorProps {
    datasetId: number;
    columns: string[];
}

interface SavedFormula {
    id: number;
    name: string;
    formula_sql: string;
}

type FormulaPreview =
    | { type: "scalar"; value: number | null; formula: string }
    | { type: "rows"; values: (string | number | null)[]; formula: string }
    | null;

export function FormulaEditor({ datasetId, columns }: FormulaEditorProps) {
    const [name, setName] = useState("");
    const [formula, setFormula] = useState("");
    const [formulas, setFormulas] = useState<SavedFormula[]>([]);
    const [preview, setPreview] = useState<FormulaPreview>(null);
    const [selectedFormula, setSelectedFormula] = useState<SavedFormula | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isLoadingFormulas, setIsLoadingFormulas] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Live syntax validation
    const { validation, isValidating } = useFormulaValidation(datasetId, formula);

    // Autocomplete state
    const [autocomplete, setAutocomplete] = useState<{
        show: boolean;
        query: string;
        position: { top: number; left: number };
    }>({ show: false, query: "", position: { top: 0, left: 0 } });

    const loadFormulas = async () => {
        setIsLoadingFormulas(true);
        try {
            const res = await invoke<SavedFormula[]>("list_formulas", { datasetId });
            setFormulas(res);
        } catch (err) {
            setError("Failed to load saved formulas.");
        } finally {
            setIsLoadingFormulas(false);
        }
    };

    useEffect(() => {
        loadFormulas();
    }, [datasetId]);

    const handleTest = async () => {
        if (!formula.trim()) return;

        setIsLoading(true);
        setError(null);
        setSuccessMessage(null);

        try {
            const res = await invoke<FormulaPreview>("test_formula", {
                datasetId,
                formulaSql: formula,
            });
            setPreview(res);
            setSuccessMessage("Formula test successful!");
            setTimeout(() => setSuccessMessage(null), 3000);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : "Unknown error";
            setError(`Formula test failed: ${errorMessage}. Please check your syntax and try again.`);
            setPreview(null);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async () => {
        if (!name.trim() || !formula.trim()) return;

        setIsLoading(true);
        setError(null);
        setSuccessMessage(null);

        try {
            await invoke("save_formula", {
                datasetId,
                name: name.trim(),
                formulaSql: formula.trim(),
            });
            setName("");
            setFormula("");
            setPreview(null);
            setSuccessMessage("Formula saved successfully!");
            setTimeout(() => setSuccessMessage(null), 3000);
            loadFormulas();
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : "Unknown error";
            setError(`Failed to save formula: ${errorMessage}. Please try again.`);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async (id: number) => {
        try {
            await invoke("delete_formula", { formulaId: id });
            loadFormulas();
            if (selectedFormula?.id === id) {
                setSelectedFormula(null);
                setName("");
                setFormula("");
                setPreview(null);
            }
        } catch (err) {
            setError("Failed to delete formula.");
        }
    };

    const insertColumn = (col: string) => {
        const textarea = textareaRef.current;
        if (textarea) {
            const start = textarea.selectionStart;
            const end = textarea.selectionEnd;
            const newFormula = formula.substring(0, start) + col + formula.substring(end);
            setFormula(newFormula);
            // Restore focus and set cursor after inserted column
            setTimeout(() => {
                textarea.focus();
                textarea.setSelectionRange(start + col.length, start + col.length);
            }, 0);
        } else {
            setFormula((f) => f + col);
        }
    };

    const insertFunction = (fn: string) => {
        const textarea = textareaRef.current;
        if (textarea) {
            const start = textarea.selectionStart;
            const end = textarea.selectionEnd;
            const selectedText = formula.substring(start, end);

            let newFormula: string;
            let cursorPos: number;

            if (selectedText) {
                // Wrap selected text with the function
                newFormula = formula.substring(0, start) + `${fn}(${selectedText})` + formula.substring(end);
                cursorPos = start + fn.length + selectedText.length + 2; // Position after closing parenthesis
            } else {
                // Insert function with placeholder at cursor position
                newFormula = formula.substring(0, start) + `${fn}()` + formula.substring(end);
                cursorPos = start + fn.length + 1; // Position between parentheses
            }

            setFormula(newFormula);
            // Restore focus and set cursor position
            setTimeout(() => {
                textarea.focus();
                textarea.setSelectionRange(cursorPos, cursorPos);
            }, 0);
        } else {
            setFormula((f) => f + fn + "()");
        }
    };

    const handleTemplateSelect = (templateFormula: string) => {
        setFormula(templateFormula);
        // Highlight first placeholder for replacement (lowercase words in the formula)
        setTimeout(() => {
            const textarea = textareaRef.current;
            if (textarea) {
                // Match lowercase words/underscores (placeholders) but not function names (uppercase)
                const match = templateFormula.match(/\b[a-z_][a-z0-9_]*\b/);
                if (match) {
                    const start = templateFormula.indexOf(match[0]);
                    textarea.focus();
                    textarea.setSelectionRange(start, start + match[0].length);
                }
            }
        }, 0);
    };

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

    // Global keydown listener for Ctrl+Space
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

    return (
        <div className="space-y-4">
            {/* Error Display */}
            {error && (
                <Alert variant="destructive">
                    <AlertCircleIcon className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            {/* Success Display */}
            {successMessage && (
                <Alert className="border-green-500/50 text-green-700 bg-green-50 dark:bg-green-950/20">
                    <CheckCircle2Icon className="h-4 w-4" />
                    <AlertDescription>{successMessage}</AlertDescription>
                </Alert>
            )}

            <div className="grid grid-cols-3 gap-4">
                {/* Editor */}
                <div className="col-span-2 space-y-4">
                    <div className="space-y-2">
                        <Input
                            placeholder="Formula name (e.g., Net Profit)"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            disabled={isLoading}
                        />
                        <textarea
                            ref={textareaRef}
                            placeholder="Enter formula (e.g., AVG(Sales) - SUM(Expenses))"
                            value={formula}
                            onChange={(e) => setFormula(e.target.value)}
                            disabled={isLoading}
                            className="w-full h-32 px-3 py-2 border border-border/40 rounded-lg text-sm font-mono bg-background resize-none disabled:opacity-50"
                        />
                        {/* Validation Status Indicator */}
                        {formula.trim() && (
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
                        )}
                        <p className="text-[10px] text-muted-foreground">
                            💡 Tip: Press Ctrl+Space for autocomplete. Select text and click a function to wrap it, or click function then insert columns inside parentheses.
                        </p>
                        <div className="flex gap-2">
                            <Button onClick={handleTest} size="sm" disabled={!formula.trim() || isLoading || !validation.isValid || isValidating}>
                                {isLoading ? (
                                    <LoaderIcon className="w-4 h-4 mr-1 animate-spin" />
                                ) : (
                                    <Play className="w-4 h-4 mr-1" />
                                )}
                                {isLoading ? "Testing..." : "Test"}
                            </Button>
                            <Button onClick={handleSave} size="sm" variant="outline" disabled={!name.trim() || !formula.trim() || isLoading}>
                                <Save className="w-4 h-4 mr-1" />
                                Save
                            </Button>
                        </div>
                    </div>

                    {/* Preview */}
                    {preview && (
                        <div className="bg-card/30 border border-border/40 rounded-xl overflow-hidden">
                            {preview.type === "scalar" ? (
                                // Scalar result display (aggregate functions)
                                <div className="p-6">
                                    <div className="flex items-center gap-3 mb-3">
                                        <Calculator className="h-5 w-5 text-primary" />
                                        <span className="text-xs font-medium text-muted-foreground">Result</span>
                                    </div>
                                    <div className="bg-background/50 rounded-lg p-4 border border-border/30">
                                        <p className="text-3xl font-bold text-foreground">
                                            {preview.value !== null ? Number(preview.value).toLocaleString(undefined, {
                                                maximumFractionDigits: 2,
                                            }) : "NULL"}
                                        </p>
                                        <p className="text-xs text-muted-foreground mt-2 font-mono">
                                            {preview.formula}
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                // Row-level results display
                                <div>
                                    <p className="px-4 py-2 text-xs font-medium text-muted-foreground border-b border-border/40">
                                        Preview (first 10 rows)
                                    </p>
                                    <div className="max-h-64 overflow-auto">
                                        <table className="w-full text-sm">
                                            <tbody>
                                                {preview.values.map((val, i) => (
                                                    <tr key={i} className="border-t border-border/20">
                                                        <td className="px-4 py-2 font-mono text-xs text-muted-foreground w-16">
                                                            {i + 1}
                                                        </td>
                                                        <td className="px-4 py-2">
                                                            {val !== null ? String(val) : <span className="text-muted-foreground/50">NULL</span>}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Sidebar */}
                <div className="space-y-4">
                    {/* Functions */}
                    <FunctionReference onInsert={insertFunction} />

                    {/* Columns */}
                    <div className="bg-card/30 border border-border/40 rounded-xl p-3">
                        <h4 className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-2">Columns</h4>
                        <div className="flex flex-wrap gap-1">
                            {columns.map((col) => (
                                <button
                                    key={col}
                                    onClick={() => insertColumn(col)}
                                    disabled={isLoading}
                                    className="px-2 py-1 text-xs bg-muted/50 rounded hover:bg-primary/20 transition-colors disabled:opacity-50"
                                >
                                    {col}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Quick Templates */}
                    <FormulaTemplates onSelect={handleTemplateSelect} />

                    {/* Saved Formulas */}
                    <div className="bg-card/30 border border-border/40 rounded-xl p-3">
                        <div className="flex items-center justify-between mb-2">
                            <h4 className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Saved</h4>
                            <Button size="icon-xs" variant="ghost" onClick={() => { setName(""); setFormula(""); }} disabled={isLoading}>
                                <Plus size={12} />
                            </Button>
                        </div>
                        {isLoadingFormulas ? (
                            <div className="flex items-center justify-center py-4">
                                <LoaderIcon className="h-4 w-4 animate-spin text-muted-foreground" />
                            </div>
                        ) : (
                            <div className="space-y-1">
                                {formulas.map((f) => (
                                    <div
                                        key={f.id}
                                        className="flex items-center justify-between group px-2 py-1.5 bg-muted/30 rounded hover:bg-muted/50 transition-colors"
                                    >
                                        <button
                                            onClick={() => {
                                                setSelectedFormula(f);
                                                setName(f.name);
                                                setFormula(f.formula_sql);
                                            }}
                                            disabled={isLoading}
                                            className="text-xs font-medium truncate flex-1 text-left disabled:opacity-50"
                                        >
                                            {f.name}
                                        </button>
                                        <button
                                            onClick={() => handleDelete(f.id)}
                                            className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all"
                                        >
                                            <Trash2 size={12} />
                                        </button>
                                    </div>
                                ))}
                                {formulas.length === 0 && (
                                    <p className="text-xs text-muted-foreground text-center py-2">No saved formulas</p>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Autocomplete */}
            {autocomplete.show && (
                <FormulaAutocomplete
                    query={autocomplete.query}
                    columns={columns}
                    onSelect={handleAutocompleteSelect}
                    onClose={() => setAutocomplete(prev => ({ ...prev, show: false }))}
                    position={autocomplete.position}
                />
            )}
        </div>
    );
}
