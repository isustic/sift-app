"use client";

import { useState, useMemo } from "react";
import { Search, Plus, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface FunctionReferenceProps {
    onInsert: (fn: string) => void;
}

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
    MIN: {
        name: "MIN",
        syntax: "MIN(column)",
        description: "Returns the minimum value",
        example: "MIN(Sales)",
        returnType: "number"
    },
    MAX: {
        name: "MAX",
        syntax: "MAX(column)",
        description: "Returns the maximum value",
        example: "MAX(Sales)",
        returnType: "number"
    },
    ROUND: {
        name: "ROUND",
        syntax: "ROUND(value, decimals)",
        description: "Round a number to specified decimals",
        example: "ROUND(Price, 2)",
        returnType: "number"
    },
    ABS: {
        name: "ABS",
        syntax: "ABS(value)",
        description: "Absolute value",
        example: "ABS(-5)",
        returnType: "number"
    },
    POWER: {
        name: "POWER",
        syntax: "POWER(base, exp)",
        description: "Raise to power",
        example: "POWER(2, 3)",
        returnType: "number"
    },
    NOW: {
        name: "NOW",
        syntax: "NOW()",
        description: "Current timestamp",
        example: "NOW()",
        returnType: "date"
    },
    YEAR: {
        name: "YEAR",
        syntax: "YEAR(date)",
        description: "Extract year from date",
        example: "YEAR(OrderDate)",
        returnType: "number"
    },
    MONTH: {
        name: "MONTH",
        syntax: "MONTH(date)",
        description: "Extract month from date",
        example: "MONTH(OrderDate)",
        returnType: "number"
    },
    DAY: {
        name: "DAY",
        syntax: "DAY(date)",
        description: "Extract day from date",
        example: "DAY(OrderDate)",
        returnType: "number"
    },
    DATEDIFF: {
        name: "DATEDIFF",
        syntax: "DATEDIFF(end, start)",
        description: "Days between two dates",
        example: "DATEDIFF(end_date, start_date)",
        returnType: "number"
    },
    DATE: {
        name: "DATE",
        syntax: "DATE(str)",
        description: "Parse string as date",
        example: "DATE('2024-01-01')",
        returnType: "date"
    },
    CONCAT: {
        name: "CONCAT",
        syntax: "CONCAT(a, b, ...)",
        description: "Join strings together",
        example: "CONCAT(First, ' ', Last)",
        returnType: "text"
    },
    UPPER: {
        name: "UPPER",
        syntax: "UPPER(str)",
        description: "Convert to uppercase",
        example: "UPPER(name)",
        returnType: "text"
    },
    LOWER: {
        name: "LOWER",
        syntax: "LOWER(str)",
        description: "Convert to lowercase",
        example: "LOWER(name)",
        returnType: "text"
    },
    SUBSTRING: {
        name: "SUBSTRING",
        syntax: "SUBSTRING(str, start, len)",
        description: "Extract part of string",
        example: "SUBSTRING(name, 1, 3)",
        returnType: "text"
    },
    LENGTH: {
        name: "LENGTH",
        syntax: "LENGTH(str)",
        description: "String length",
        example: "LENGTH(name)",
        returnType: "number"
    },
    TRIM: {
        name: "TRIM",
        syntax: "TRIM(str)",
        description: "Remove whitespace",
        example: "TRIM(name)",
        returnType: "text"
    },
    IF: {
        name: "IF",
        syntax: "IF(condition, true_val, false_val)",
        description: "Conditional value",
        example: "IF(Sales > 100, 'High', 'Low')",
        returnType: "any"
    },
    CASE: {
        name: "CASE",
        syntax: "CASE WHEN...THEN...ELSE...END",
        description: "Switch statement",
        example: "CASE WHEN x > 0 THEN 'positive' ELSE 'negative' END",
        returnType: "any"
    },
    COALESCE: {
        name: "COALESCE",
        syntax: "COALESCE(a, b, c)",
        description: "First non-null value",
        example: "COALESCE(Discount, 0)",
        returnType: "any"
    },
    NULLIF: {
        name: "NULLIF",
        syntax: "NULLIF(a, b)",
        description: "NULL if equal",
        example: "NULLIF(price, 0)",
        returnType: "any"
    },
};

const functionCategories = [
    {
        name: "Math",
        icon: "📊",
        functions: ["SUM", "AVG", "COUNT", "MIN", "MAX", "ROUND", "ABS", "POWER"]
    },
    {
        name: "Date",
        icon: "📅",
        functions: ["NOW", "YEAR", "MONTH", "DAY", "DATEDIFF", "DATE"]
    },
    {
        name: "Text",
        icon: "📝",
        functions: ["CONCAT", "UPPER", "LOWER", "SUBSTRING", "LENGTH", "TRIM"]
    },
    {
        name: "Logic",
        icon: "🧠",
        functions: ["IF", "CASE", "COALESCE", "NULLIF"]
    },
];

interface FunctionCardProps {
    info: FunctionInfo;
    isExpanded: boolean;
    onToggle: () => void;
    onInsert: () => void;
}

function FunctionCard({ info, isExpanded, onToggle, onInsert }: FunctionCardProps) {
    return (
        <div className="border border-border/40 rounded-lg overflow-hidden bg-card/20">
            <button
                onClick={onToggle}
                className="w-full px-3 py-2 flex items-center justify-between hover:bg-muted/30 transition-colors text-left"
            >
                <div className="flex items-center gap-2">
                    {isExpanded ? (
                        <ChevronDown className="h-3 w-3 text-muted-foreground" />
                    ) : (
                        <ChevronRight className="h-3 w-3 text-muted-foreground" />
                    )}
                    <span className="text-sm font-medium">{info.name}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted/50 text-muted-foreground">
                        {info.returnType}
                    </span>
                </div>
            </button>

            {isExpanded && (
                <div className="px-3 pb-3 pt-0 space-y-2 border-t border-border/20">
                    <p className="text-xs text-muted-foreground mt-2">{info.description}</p>

                    <div className="space-y-1">
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Syntax</p>
                        <code className="block text-xs bg-muted/50 px-2 py-1 rounded font-mono">
                            {info.syntax}
                        </code>
                    </div>

                    <div className="space-y-1">
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Example</p>
                        <code className="block text-xs bg-muted/50 px-2 py-1 rounded font-mono">
                            {info.example}
                        </code>
                    </div>

                    <Button
                        onClick={(e) => {
                            e.stopPropagation();
                            onInsert();
                        }}
                        size="sm"
                        variant="outline"
                        className="w-full mt-2"
                    >
                        <Plus className="h-3 w-3 mr-1" />
                        Insert
                    </Button>
                </div>
            )}
        </div>
    );
}

export function FunctionReference({ onInsert }: FunctionReferenceProps) {
    const [searchQuery, setSearchQuery] = useState("");
    const [expandedFunction, setExpandedFunction] = useState<string | null>(null);

    const filteredCategories = useMemo(() => {
        if (!searchQuery.trim()) {
            return functionCategories;
        }

        const query = searchQuery.toLowerCase();

        return functionCategories
            .map((category) => ({
                ...category,
                functions: category.functions.filter((fnName) => {
                    const info = functionData[fnName];
                    return (
                        info.name.toLowerCase().includes(query) ||
                        info.description.toLowerCase().includes(query)
                    );
                }),
            }))
            .filter((category) => category.functions.length > 0);
    }, [searchQuery]);

    const handleToggleFunction = (fnName: string) => {
        setExpandedFunction((prev) => (prev === fnName ? null : fnName));
    };

    const handleInsert = (fnName: string) => {
        onInsert(fnName);
        setExpandedFunction(null);
    };

    return (
        <div className="bg-card/30 border border-border/40 rounded-xl p-3">
            <h4 className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-2">Functions</h4>

            {/* Search Bar */}
            <div className="relative mb-3">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                <Input
                    placeholder="Search functions..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-7 pl-7 text-xs"
                />
            </div>

            {/* Function List */}
            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                {filteredCategories.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-4">No functions found</p>
                ) : (
                    filteredCategories.map((category) => (
                        <div key={category.name}>
                            {/* Sticky Category Header */}
                            <div className="sticky top-0 z-10 bg-card/95 backdrop-blur-sm py-1 -mx-1 px-1 border-b border-border/40 mb-2">
                                <p className="text-[10px] font-medium flex items-center gap-1 text-muted-foreground">
                                    <span>{category.icon}</span>
                                    <span>{category.name}</span>
                                </p>
                            </div>

                            {/* Function Cards */}
                            <div className="space-y-1.5">
                                {category.functions.map((fnName) => (
                                    <FunctionCard
                                        key={fnName}
                                        info={functionData[fnName]}
                                        isExpanded={expandedFunction === fnName}
                                        onToggle={() => handleToggleFunction(fnName)}
                                        onInsert={() => handleInsert(fnName)}
                                    />
                                ))}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
