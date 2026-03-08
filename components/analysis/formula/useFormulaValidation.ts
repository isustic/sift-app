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
