"use client";

import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Save, Play, Trash2, Plus, LoaderIcon, AlertCircleIcon, CheckCircle2Icon } from "lucide-react";
import { FunctionReference } from "./FunctionReference";
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

export function FormulaEditor({ datasetId, columns }: FormulaEditorProps) {
    const [name, setName] = useState("");
    const [formula, setFormula] = useState("");
    const [formulas, setFormulas] = useState<SavedFormula[]>([]);
    const [preview, setPreview] = useState<Record<string, unknown>[]>([]);
    const [selectedFormula, setSelectedFormula] = useState<SavedFormula | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isLoadingFormulas, setIsLoadingFormulas] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    const loadFormulas = async () => {
        setIsLoadingFormulas(true);
        try {
            const res = await invoke<SavedFormula[]>("list_formulas", { datasetId });
            setFormulas(res);
        } catch (err) {
            console.error("Failed to load formulas:", err);
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
            const res = await invoke<Record<string, unknown>[]>("test_formula", {
                datasetId,
                formulaSql: formula,
            });
            setPreview(res);
            setSuccessMessage("Formula test successful!");
            setTimeout(() => setSuccessMessage(null), 3000);
        } catch (err) {
            console.error("Test failed:", err);
            const errorMessage = err instanceof Error ? err.message : "Unknown error";
            setError(`Formula test failed: ${errorMessage}. Please check your syntax and try again.`);
            setPreview([]);
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
            setPreview([]);
            setSuccessMessage("Formula saved successfully!");
            setTimeout(() => setSuccessMessage(null), 3000);
            loadFormulas();
        } catch (err) {
            console.error("Save failed:", err);
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
                setPreview([]);
            }
        } catch (err) {
            console.error("Delete failed:", err);
            setError("Failed to delete formula.");
        }
    };

    const insertColumn = (col: string) => {
        setFormula((f) => f + col);
    };

    const insertFunction = (fn: string) => {
        setFormula((f) => f + fn + "()");
    };

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
                            placeholder="Enter formula (e.g., Sales * 0.15 - Expenses)"
                            value={formula}
                            onChange={(e) => setFormula(e.target.value)}
                            disabled={isLoading}
                            className="w-full h-32 px-3 py-2 border border-border/40 rounded-lg text-sm font-mono bg-background resize-none disabled:opacity-50"
                        />
                        <div className="flex gap-2">
                            <Button onClick={handleTest} size="sm" disabled={!formula.trim() || isLoading}>
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
                    {preview.length > 0 && (
                        <div className="bg-card/30 border border-border/40 rounded-xl overflow-auto">
                            <p className="px-4 py-2 text-xs font-medium text-muted-foreground border-b border-border/40">Preview (first 100 rows)</p>
                            <table className="w-full text-sm">
                                <tbody>
                                    {preview.slice(0, 100).map((row, i) => (
                                        <tr key={i} className="border-t border-border/20">
                                            {Object.entries(row).map(([key, val]) => (
                                                <td key={key} className="px-4 py-1">
                                                    {String(val ?? "")}
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Sidebar */}
                <div className="space-y-4">
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

                    {/* Functions */}
                    <FunctionReference onInsert={insertFunction} />

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
        </div>
    );
}
