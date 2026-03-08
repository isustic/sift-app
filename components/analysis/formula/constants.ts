export interface FormulaFunction {
    name: string;
    detail: string;
    icon: string;
    syntax?: string;
    description?: string;
    example?: string;
    returnType?: string;
}

export const AUTOCOMPLETE_FUNCTIONS: FormulaFunction[] = [
    // Aggregate functions
    { name: "SUM", detail: "Aggregate function", icon: "📊", syntax: "SUM(column)", description: "Returns the total sum of values in a column", example: "SUM(Sales)", returnType: "number" },
    { name: "AVG", detail: "Aggregate function", icon: "📊", syntax: "AVG(column)", description: "Returns the average (mean) of values in a column", example: "AVG(Price)", returnType: "number" },
    { name: "COUNT", detail: "Aggregate function", icon: "📊", syntax: "COUNT(column)", description: "Returns the number of non-null values", example: "COUNT(Orders)", returnType: "number" },
    { name: "MIN", detail: "Aggregate function", icon: "📊", syntax: "MIN(column)", description: "Returns the minimum value", example: "MIN(Sales)", returnType: "number" },
    { name: "MAX", detail: "Aggregate function", icon: "📊", syntax: "MAX(column)", description: "Returns the maximum value", example: "MAX(Sales)", returnType: "number" },

    // Math functions
    { name: "ROUND", detail: "Math function", icon: "🔢", syntax: "ROUND(value, decimals)", description: "Round a number to specified decimals", example: "ROUND(Price, 2)", returnType: "number" },
    { name: "ABS", detail: "Math function", icon: "🔢", syntax: "ABS(value)", description: "Absolute value", example: "ABS(-5)", returnType: "number" },
    { name: "POWER", detail: "Math function", icon: "🔢", syntax: "POWER(base, exp)", description: "Raise to power", example: "POWER(2, 3)", returnType: "number" },

    // Logic functions
    { name: "IF", detail: "Logic function", icon: "🧠", syntax: "IF(condition, true_val, false_val)", description: "Conditional value", example: "IF(Sales > 100, 'High', 'Low')", returnType: "any" },
    { name: "CASE", detail: "Logic function", icon: "🧠", syntax: "CASE WHEN...THEN...ELSE...END", description: "Switch statement", example: "CASE WHEN x > 0 THEN 'positive' ELSE 'negative' END", returnType: "any" },
    { name: "COALESCE", detail: "Logic function", icon: "🧠", syntax: "COALESCE(a, b, c)", description: "First non-null value", example: "COALESCE(Discount, 0)", returnType: "any" },
    { name: "NULLIF", detail: "Logic function", icon: "🧠", syntax: "NULLIF(a, b)", description: "NULL if equal", example: "NULLIF(price, 0)", returnType: "any" },

    // Text functions
    { name: "CONCAT", detail: "Text function", icon: "📝", syntax: "CONCAT(a, b, ...)", description: "Join strings together", example: "CONCAT(First, ' ', Last)", returnType: "text" },
    { name: "UPPER", detail: "Text function", icon: "📝", syntax: "UPPER(str)", description: "Convert to uppercase", example: "UPPER(name)", returnType: "text" },
    { name: "LOWER", detail: "Text function", icon: "📝", syntax: "LOWER(str)", description: "Convert to lowercase", example: "LOWER(name)", returnType: "text" },
    { name: "SUBSTRING", detail: "Text function", icon: "📝", syntax: "SUBSTRING(str, start, len)", description: "Extract part of string", example: "SUBSTRING(name, 1, 3)", returnType: "text" },
    { name: "LENGTH", detail: "Text function", icon: "📝", syntax: "LENGTH(str)", description: "String length", example: "LENGTH(name)", returnType: "number" },
    { name: "TRIM", detail: "Text function", icon: "📝", syntax: "TRIM(str)", description: "Remove whitespace", example: "TRIM(name)", returnType: "text" },

    // Date functions
    { name: "NOW", detail: "Date function", icon: "📅", syntax: "NOW()", description: "Current timestamp", example: "NOW()", returnType: "date" },
    { name: "YEAR", detail: "Date function", icon: "📅", syntax: "YEAR(date)", description: "Extract year from date", example: "YEAR(OrderDate)", returnType: "number" },
    { name: "MONTH", detail: "Date function", icon: "📅", syntax: "MONTH(date)", description: "Extract month from date", example: "MONTH(OrderDate)", returnType: "number" },
    { name: "DAY", detail: "Date function", icon: "📅", syntax: "DAY(date)", description: "Extract day from date", example: "DAY(OrderDate)", returnType: "number" },
    { name: "DATEDIFF", detail: "Date function", icon: "📅", syntax: "DATEDIFF(end, start)", description: "Days between two dates", example: "DATEDIFF(end_date, start_date)", returnType: "number" },
    { name: "DATE", detail: "Date function", icon: "📅", syntax: "DATE(str)", description: "Parse string as date", example: "DATE('2024-01-01')", returnType: "date" },
];

// Create function data record for FunctionReference
export const FUNCTION_DATA: Record<string, {
    name: string;
    syntax: string;
    description: string;
    example: string;
    returnType: string;
}> = Object.fromEntries(
    AUTOCOMPLETE_FUNCTIONS.map(fn => [
        fn.name,
        {
            name: fn.name,
            syntax: fn.syntax || "",
            description: fn.description || "",
            example: fn.example || "",
            returnType: fn.returnType || "any"
        }
    ])
);

// Function categories for FunctionReference
export const FUNCTION_CATEGORIES = [
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
