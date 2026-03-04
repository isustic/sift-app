"use client";

import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Save, Play, Trash2, Plus } from "lucide-react";
import { FunctionReference } from "./FunctionReference";

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

    const loadFormulas = async () => {
        try {
            const res = await invoke<SavedFormula[]>("list_formulas", { datasetId });
            setFormulas(res);
        } catch (error) {
            console.error("Failed to load formulas:", error);
        }
    };

    useEffect(() => {
        loadFormulas();
    }, [datasetId]);

    const handleTest = async () => {
        if (!formula.trim()) return;
        try {
            const res = await invoke<Record<string, unknown>[]>("test_formula", {
                datasetId,
                formulaSql: formula,
            });
            setPreview(res);
        } catch (error) {
            console.error("Test failed:", error);
        }
    };

    const handleSave = async () => {
        if (!name.trim() || !formula.trim()) return;
        try {
            await invoke("save_formula", {
                datasetId,
                name: name.trim(),
                formulaSql: formula.trim(),
            });
            setName("");
            setFormula("");
            setPreview([]);
            loadFormulas();
        } catch (error) {
            console.error("Save failed:", error);
        }
    };

    const handleDelete = async (id: number) => {
        try {
            await invoke("delete_formula", { formulaId: id });
            loadFormulas();
        } catch (error) {
            console.error("Delete failed:", error);
        }
    };

    const insertColumn = (col: string) => {
        setFormula((f) => f + col);
    };

    const insertFunction = (fn: string) => {
        setFormula((f) => f + fn + "()");
    };

    return (
        <div className="grid grid-cols-3 gap-4">
            {/* Editor */}
            <div className="col-span-2 space-y-4">
                <div className="space-y-2">
                    <Input
                        placeholder="Formula name (e.g., Net Profit)"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                    />
                    <textarea
                        placeholder="Enter formula (e.g., Sales * 0.15 - Expenses)"
                        value={formula}
                        onChange={(e) => setFormula(e.target.value)}
                        className="w-full h-32 px-3 py-2 border border-border/40 rounded-lg text-sm font-mono bg-background resize-none"
                    />
                    <div className="flex gap-2">
                        <Button onClick={handleTest} size="sm" disabled={!formula.trim()}>
                            <Play className="w-4 h-4 mr-1" />
                            Test
                        </Button>
                        <Button onClick={handleSave} size="sm" variant="outline" disabled={!name.trim() || !formula.trim()}>
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
                                className="px-2 py-1 text-xs bg-muted/50 rounded hover:bg-primary/20 transition-colors"
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
                        <Button size="icon-xs" variant="ghost" onClick={() => { setName(""); setFormula(""); }}>
                            <Plus size={12} />
                        </Button>
                    </div>
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
                                    className="text-xs font-medium truncate flex-1 text-left"
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
                </div>
            </div>
        </div>
    );
}
