"use client";

import { useState } from "react";

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
