"use client";

import { useState, useEffect } from "react";
import { AUTOCOMPLETE_FUNCTIONS } from "./constants";

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

// Map functions from constants, limited to Aggregate and Math categories for the builder
const BUILDER_FUNCTIONS = AUTOCOMPLETE_FUNCTIONS
    .filter(f => f.detail.includes("Aggregate") || f.detail.includes("Math"))
    .map(f => ({
        name: f.name,
        display: f.syntax || f.name + "()",
        category: f.detail.split(" ")[0] // Extract "Aggregate" from "Aggregate function"
    }));

export function FormulaBuilder({ columns, onFormulaChange, currentFormula }: FormulaBuilderProps) {
    const [steps, setSteps] = useState<BuildStep[]>([]);

    // Sync currentFormula to steps when switching from Code mode
    useEffect(() => {
        if (!currentFormula) {
            setSteps([]);
            return;
        }
        // Don't reset if current formula already matches our steps
        const currentFormulaFromSteps = steps.map(s => s.value).join(" ");
        if (currentFormula === currentFormulaFromSteps) return;

        // Try to parse the formula into steps
        // This is a simple heuristic - parse tokens and identify functions/columns/operators
        const tokens = currentFormula.split(/\s+/);
        const newSteps: BuildStep[] = [];

        for (const token of tokens) {
            if (!token) continue;
            // Check if it's a function (uppercase with parens)
            if (/^[A-Z]+\(.*\)$/.test(token)) {
                newSteps.push({ type: "function", value: token, display: token });
            }
            // Check if it's an operator
            else if (/^[+\-*/]$/.test(token)) {
                newSteps.push({ type: "operator", value: token, display: token });
            }
            // Otherwise it's a column or value
            else {
                newSteps.push({ type: "column", value: token, display: token });
            }
        }
        setSteps(newSteps);
    }, [currentFormula]);

    const operators = [
        { symbol: "+", display: "+ Add" },
        { symbol: "-", display: "- Subtract" },
        { symbol: "*", display: "* Multiply" },
        { symbol: "/", display: "/ Divide" },
    ];

    const addStep = (step: BuildStep) => {
        let newSteps: BuildStep[];

        // If adding a column/value and last step was a function, insert inside parens
        if (step.type === "column" && steps.length > 0) {
            const lastStep = steps[steps.length - 1];
            if (lastStep.type === "function" && lastStep.value.endsWith("()")) {
                // Insert inside the empty parentheses
                const updatedLastStep = {
                    ...lastStep,
                    value: lastStep.value.slice(0, -1) + step.value + ")",
                    display: lastStep.display.slice(0, -1) + step.value + ")"
                };
                newSteps = [...steps.slice(0, -1), updatedLastStep];
            } else {
                newSteps = [...steps, step];
            }
        } else {
            newSteps = [...steps, step];
        }

        setSteps(newSteps);
        updateFormula(newSteps);
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
                {currentFormula ? (
                    <p className="font-mono text-sm">{currentFormula}</p>
                ) : (
                    <p className="text-sm text-muted-foreground italic">
                        Start by selecting a function above, then add columns and operators
                    </p>
                )}
            </div>

            {/* Function Selection */}
            <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    Start with a function
                </label>
                <div className="grid grid-cols-2 gap-2">
                    {BUILDER_FUNCTIONS.map((fn) => (
                        <button
                            key={fn.name}
                            onClick={() => addStep({
                                type: "function",
                                value: fn.name + "()",
                                display: fn.display
                            })}
                            className="px-3 py-2 bg-muted/30 rounded hover:bg-primary/20 transition-colors text-left"
                            aria-label={`Add ${fn.name} function`}
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
                            aria-label={`Add ${col} column`}
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
                            aria-label={`Add ${op.symbol} operator`}
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
                                aria-label="Remove block"
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
