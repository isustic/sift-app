"use client";

interface FunctionReferenceProps {
    onInsert: (fn: string) => void;
}

const functionCategories = [
    {
        name: "Math",
        icon: "",
        functions: ["SUM", "AVG", "COUNT", "MIN", "MAX", "ROUND", "ABS", "POWER"]
    },
    {
        name: "Date",
        icon: "",
        functions: ["NOW", "YEAR", "MONTH", "DAY", "DATEDIFF", "DATE"]
    },
    {
        name: "Text",
        icon: "",
        functions: ["CONCAT", "UPPER", "LOWER", "SUBSTRING", "LENGTH", "TRIM"]
    },
    {
        name: "Logic",
        icon: "",
        functions: ["IF", "CASE", "COALESCE", "NULLIF"]
    },
];

export function FunctionReference({ onInsert }: FunctionReferenceProps) {
    return (
        <div className="bg-card/30 border border-border/40 rounded-xl p-3">
            <h4 className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-2">Functions</h4>
            <div className="space-y-2">
                {functionCategories.map((cat) => (
                    <div key={cat.name}>
                        <p className="text-[10px] font-medium flex items-center gap-1">
                            <span>{cat.icon}</span> {cat.name}
                        </p>
                        <div className="flex flex-wrap gap-1 mt-1">
                            {cat.functions.map((fn) => (
                                <button
                                    key={fn}
                                    onClick={() => onInsert(fn)}
                                    className="px-2 py-0.5 text-xs bg-muted/50 rounded hover:bg-primary/20 hover:text-primary transition-colors"
                                >
                                    {fn}
                                </button>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
