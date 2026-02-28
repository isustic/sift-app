"use client";

import { useState, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Database,
  BookOpen,
  Trash2,
  Save,
  Loader2,
  Settings2,
  Sparkles
} from "lucide-react";

// Types
import type {
  Dataset,
  ColumnMeta,
  Template,
  SimpleQuery,
  Filter,
  Calculation,
  SortColumn,
  ReportResult
} from "@/types/report";

// Step components
import { StepNavigation, StepType } from "@/components/report/StepNavigation";
import { Step1_Columns } from "@/components/report/steps/Step1_Columns";
import { Step2_GroupBy } from "@/components/report/steps/Step2_GroupBy";
import { Step3_Calculations } from "@/components/report/steps/Step3_Calculations";
import { Step4_Filters } from "@/components/report/steps/Step4_Filters";
import { Step5_Sort } from "@/components/report/steps/Step5_Sort";
import { Step6_Results } from "@/components/report/steps/Step6_Results";

// Query preview
import { QueryPreview } from "@/components/report/QueryPreview";
import { buildQueryPreview } from "@/lib/query-preview";

export default function ReportPage() {
  // ============================================================
  // STATE
  // ============================================================

  // Dataset state
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [activeDatasetId, setActiveDatasetId] = useState<number | null>(null);
  const [columns, setColumns] = useState<ColumnMeta[]>([]);

  // Query state
  const [query, setQuery] = useState<SimpleQuery>({
    datasetId: 0,
    displayColumns: [],
    groupBy: [],
    calculations: [],
    filters: [],
    sortBy: [],
    limit: null,
  });

  // UI state
  const [currentStep, setCurrentStep] = useState<StepType>("columns");
  const [completedSteps, setCompletedSteps] = useState<Set<StepType>>(new Set());

  // Template state
  const [templates, setTemplates] = useState<Template[]>([]);
  const [templateName, setTemplateName] = useState("");
  const [showSaveInput, setShowSaveInput] = useState(false);

  // Results state
  const [result, setResult] = useState<ReportResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultColumns, setResultColumns] = useState<string[]>([]);

  // ============================================================
  // DATA LOADING
  // ============================================================

  // Load datasets on mount
  useEffect(() => {
    invoke<Dataset[]>("list_datasets")
      .then((ds) => {
        setDatasets(ds);
        if (ds.length > 0) {
          setActiveDatasetId(ds[0].id);
        }
      })
      .catch((err) => console.error("Failed to load datasets:", err));
  }, []);

  // Load columns when dataset changes
  useEffect(() => {
    if (!activeDatasetId) return;

    invoke<ColumnMeta[]>("get_columns", { datasetId: activeDatasetId })
      .then((cols) => {
        setColumns(cols);
        // Initialize query with this dataset
        setQuery((prev) => ({
          ...prev,
          datasetId: activeDatasetId,
          displayColumns: cols.map((c) => c.name),
        }));
        // Reset completed steps
        setCompletedSteps(new Set());
        setCurrentStep("columns");
        // Clear results
        setResult(null);
        setError(null);
      })
      .catch((err) => console.error("Failed to load columns:", err));

    // Load templates for this dataset
    loadTemplates(activeDatasetId);
  }, [activeDatasetId]);

  const loadTemplates = async (datasetId: number) => {
    try {
      const tmpl = await invoke<Template[]>("list_templates", { datasetId });
      setTemplates(tmpl);
    } catch (e) {
      console.error("Failed to load templates:", e);
    }
  };

  // ============================================================
  // QUERY BUILDERS
  // ============================================================

  const updateQuery = (updates: Partial<SimpleQuery>) => {
    setQuery((prev) => ({ ...prev, ...updates }));
  };

  // Column handlers
  const handleToggleColumn = (column: string) => {
    setQuery((prev) => {
      const newDisplayColumns = prev.displayColumns.includes(column)
        ? prev.displayColumns.filter((c) => c !== column)
        : [...prev.displayColumns, column];

      // Remove from groupBy and calculations if deselected
      const newGroupBy = prev.groupBy.filter((c) => newDisplayColumns.includes(c));
      const newCalculations = prev.calculations.filter((c) =>
        newDisplayColumns.includes(c.column)
      );
      const newSortBy = prev.sortBy.filter((s) => newDisplayColumns.includes(s.column));

      return {
        ...prev,
        displayColumns: newDisplayColumns,
        groupBy: newGroupBy,
        calculations: newCalculations,
        sortBy: newSortBy,
      };
    });
  };

  const handleSelectAllColumns = () => {
    setQuery((prev) => ({
      ...prev,
      displayColumns: columns.map((c) => c.name),
    }));
  };

  const handleSelectNoneColumns = () => {
    setQuery((prev) => ({
      ...prev,
      displayColumns: [],
      groupBy: [],
      calculations: [],
      sortBy: [],
    }));
  };

  // GroupBy handlers
  const handleAddGroupColumn = (column: string) => {
    setQuery((prev) => ({
      ...prev,
      groupBy: [...prev.groupBy, column],
    }));
  };

  const handleRemoveGroupColumn = (column: string) => {
    setQuery((prev) => ({
      ...prev,
      groupBy: prev.groupBy.filter((c) => c !== column),
    }));
  };

  // Calculation handlers
  const handleAddCalculation = (calc: Calculation) => {
    setQuery((prev) => ({
      ...prev,
      calculations: [...prev.calculations, calc],
    }));
  };

  const handleRemoveCalculation = (index: number) => {
    setQuery((prev) => ({
      ...prev,
      calculations: prev.calculations.filter((_, i) => i !== index),
    }));
  };

  // Filter handlers
  const handleAddFilter = (filter: Filter) => {
    setQuery((prev) => ({
      ...prev,
      filters: [...prev.filters, filter],
    }));
  };

  const handleRemoveFilter = (index: number) => {
    setQuery((prev) => ({
      ...prev,
      filters: prev.filters.filter((_, i) => i !== index),
    }));
  };

  // Sort handlers
  const handleAddSort = (sort: SortColumn) => {
    setQuery((prev) => ({
      ...prev,
      sortBy: [...prev.sortBy, sort],
    }));
  };

  const handleRemoveSort = (index: number) => {
    setQuery((prev) => ({
      ...prev,
      sortBy: prev.sortBy.filter((_, i) => i !== index),
    }));
  };

  const handleToggleSortDirection = (index: number) => {
    setQuery((prev) => ({
      ...prev,
      sortBy: prev.sortBy.map((s, i) =>
        i === index ? { ...s, descending: !s.descending } : s
      ),
    }));
  };

  const handleLimitChange = (limit: number | null) => {
    setQuery((prev) => ({ ...prev, limit }));
  };

  // ============================================================
  // STEP NAVIGATION
  // ============================================================

  const canGoNext = useCallback((): boolean => {
    switch (currentStep) {
      case "columns":
        return query.displayColumns.length > 0;
      case "groupBy":
        return true; // Optional step
      case "calculate":
        return true; // Optional step
      case "filters":
        return query.filters.length > 0; // Now requires at least one filter
      case "sort":
        return true; // Optional step
      case "run":
        return result !== null;
      default:
        return false;
    }
  }, [currentStep, query.displayColumns.length, query.filters.length, result]);

  const canGoBack = useCallback((): boolean => {
    return currentStep !== "columns";
  }, [currentStep]);

  const handleNext = () => {
    // Mark current step as completed
    setCompletedSteps((prev) => new Set(prev).add(currentStep));

    // Move to next step
    const stepOrder: StepType[] = ["columns", "groupBy", "calculate", "filters", "sort", "run"];
    const currentIndex = stepOrder.indexOf(currentStep);

    if (currentIndex < stepOrder.length - 1) {
      const nextStep = stepOrder[currentIndex + 1];
      setCurrentStep(nextStep);

      // If moving to run step, execute the query
      if (nextStep === "run") {
        handleRunReport();
      }
    }
  };

  const handleBack = () => {
    const stepOrder: StepType[] = ["columns", "groupBy", "calculate", "filters", "sort", "run"];
    const currentIndex = stepOrder.indexOf(currentStep);

    if (currentIndex > 0) {
      setCurrentStep(stepOrder[currentIndex - 1]);
    }
  };

  const handleStepClick = (step: StepType) => {
    const stepOrder: StepType[] = ["columns", "groupBy", "calculate", "filters", "sort", "run"];
    const clickedIndex = stepOrder.indexOf(step);
    const currentIndex = stepOrder.indexOf(currentStep);

    // Can only go to previous steps or completed steps
    if (clickedIndex <= currentIndex || completedSteps.has(step)) {
      setCurrentStep(step);

      // If clicking run step and no results, execute query
      if (step === "run" && !result) {
        handleRunReport();
      }
    }
  };

  // ============================================================
  // RUN REPORT
  // ============================================================

  const handleRunReport = async () => {
    if (!activeDatasetId) return;

    setIsLoading(true);
    setError(null);
    setResult(null);

    const startTime = performance.now();

    try {
      // Build the query object for the backend
      const backendQuery = {
        datasetId: activeDatasetId,
        displayColumns: query.displayColumns,
        groupBy: query.groupBy,
        calculations: query.calculations.map((c) => ({
          function: c.function,
          column: c.column,
          alias: c.alias,
        })),
        filters: query.filters.map((f) => ({
          column: f.column,
          operator: f.operator,
          value: f.value,
        })),
        sortBy: query.sortBy.map((s) => ({
          column: s.column,
          descending: s.descending,
        })),
        limit: query.limit,
      };

      const rows = await invoke<Record<string, unknown>[]>("run_report", {
        query: backendQuery,
      });

      const queryTime = Math.round(performance.now() - startTime);

      // Extract columns from result
      const cols = rows.length > 0 ? Object.keys(rows[0]) : [];

      setResult({
        rows,
        queryTime,
        rowCount: rows.length,
      });
      setResultColumns(cols);

      // Mark run step as completed
      setCompletedSteps((prev) => new Set(prev).add("run"));
    } catch (err) {
      setError(String(err));
    } finally {
      setIsLoading(false);
    }
  };

  // ============================================================
  // EXPORT
  // ============================================================

  const handleExport = async () => {
    if (!result || result.rows.length === 0) return;

    try {
      await invoke("export_report", {
        rows: result.rows,
        columns: resultColumns,
      });
    } catch (err) {
      console.error("Export failed:", err);
    }
  };

  // ============================================================
  // TEMPLATES
  // ============================================================

  const handleSaveTemplate = async () => {
    if (!templateName.trim() || !activeDatasetId) return;

    try {
      await invoke("save_template", {
        name: templateName.trim(),
        datasetId: activeDatasetId,
        configJson: JSON.stringify(query),
      });

      setTemplateName("");
      setShowSaveInput(false);
      loadTemplates(activeDatasetId);
    } catch (err) {
      console.error("Failed to save template:", err);
    }
  };

  const handleLoadTemplate = async (template: Template) => {
    try {
      const savedQuery: SimpleQuery = JSON.parse(template.config_json);

      setQuery(savedQuery);
      setCompletedSteps(new Set(["columns"]));
      setCurrentStep("groupBy");

      // Clear previous results
      setResult(null);
      setError(null);
    } catch (err) {
      console.error("Failed to load template:", err);
    }
  };

  const handleDeleteTemplate = async (templateId: number) => {
    try {
      await invoke("delete_template", { id: templateId });
      loadTemplates(activeDatasetId!);
    } catch (err) {
      console.error("Failed to delete template:", err);
    }
  };

  // ============================================================
  // RENDER
  // ============================================================

  const queryPreviewText = buildQueryPreview(query, columns);

  const hasGrouping = query.groupBy.length > 0;

  return (
    <div className="flex h-full bg-background/50">
      {/* LEFT SIDEBAR */}
      <aside className="w-80 shrink-0 border-r border-border/50 bg-card/30 backdrop-blur-sm flex flex-col overflow-hidden">
        {/* Header */}
        <div className="h-14 px-4 flex items-end border-b border-border/50">
          <div>
            <h1 className="text-sm font-semibold flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              Report Builder
            </h1>
            <p className="text-[10px] text-muted-foreground">Build queries step by step</p>
          </div>
        </div>

        <ScrollArea className="flex-1 px-4 py-4">
          <div className="space-y-6">
            {/* Dataset Selector */}
            <div className="space-y-2">
              <label className="flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                <Database className="w-3 h-3" />
                Dataset
              </label>
              <Select
                value={String(activeDatasetId ?? "")}
                onValueChange={(v) => setActiveDatasetId(Number(v))}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Select dataset" />
                </SelectTrigger>
                <SelectContent>
                  {datasets.map((d) => (
                    <SelectItem key={d.id} value={String(d.id)}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Templates */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                  <BookOpen className="w-3 h-3" />
                  Saved Reports
                </label>
                <button
                  onClick={() => setShowSaveInput((v) => !v)}
                  className="text-primary hover:opacity-70 transition-opacity"
                  title="Save current report"
                >
                  <Save size={13} />
                </button>
              </div>

              {showSaveInput && (
                <div className="flex gap-1.5 p-2 rounded-md bg-primary/5 border border-primary/20">
                  <Input
                    className="flex-1 h-7 text-xs bg-background/60 border-border/50"
                    placeholder="Report name…"
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSaveTemplate()}
                  />
                  <Button size="sm" className="h-7 px-3 text-xs" onClick={handleSaveTemplate}>
                    Save
                  </Button>
                </div>
              )}

              {templates.length === 0 ? (
                <p className="text-xs text-muted-foreground/60 py-2">No saved reports</p>
              ) : (
                <div className="space-y-0.5">
                  {templates.map((t) => (
                    <div
                      key={t.id}
                      className="group flex items-center gap-1 rounded-md px-2 py-1.5 hover:bg-muted/40 transition-colors"
                    >
                      <button
                        className="flex-1 text-left text-xs truncate flex items-center gap-1.5"
                        onClick={() => handleLoadTemplate(t)}
                      >
                        <BookOpen size={11} className="text-muted-foreground shrink-0" />
                        <span className="truncate">{t.name}</span>
                      </button>
                      <button
                        onClick={() => handleDeleteTemplate(t.id)}
                        className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity p-0.5"
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Separator />

            {/* Query Summary */}
            <div className="space-y-2">
              <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                Current Configuration
              </label>
              <div className="text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Columns:</span>
                  <span className="font-medium">{query.displayColumns.length}</span>
                </div>
                {hasGrouping && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Grouped by:</span>
                    <span className="font-medium">{query.groupBy.length}</span>
                  </div>
                )}
                {query.calculations.length > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Calculations:</span>
                    <span className="font-medium">{query.calculations.length}</span>
                  </div>
                )}
                {query.filters.length > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Filters:</span>
                    <span className="font-medium">{query.filters.length}</span>
                  </div>
                )}
                {query.sortBy.length > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Sort levels:</span>
                    <span className="font-medium">{query.sortBy.length}</span>
                  </div>
                )}
                {query.limit && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Limit:</span>
                    <span className="font-medium">{query.limit.toLocaleString()}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </ScrollArea>

        {/* Quick Actions */}
        <div className="p-4 border-t border-border/50 space-y-2 bg-card/20">
          <Button
            className="w-full gap-2"
            onClick={handleRunReport}
            disabled={isLoading || query.displayColumns.length === 0}
          >
            {isLoading ? (
              <Loader2 size={13} className="animate-spin" />
            ) : (
              <Settings2 size={13} />
            )}
            {isLoading ? "Running…" : "Run Report"}
          </Button>
          {result && (
            <Button
              variant="outline"
              className="w-full"
              onClick={handleExport}
            >
              Export to Excel
            </Button>
          )}
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Step Navigation */}
        <div className="px-6 py-4 border-b border-border/50 bg-card/20">
          <StepNavigation
            currentStep={currentStep}
            completedSteps={completedSteps}
            onStepClick={handleStepClick}
          />
        </div>

        {/* Step Content */}
        <ScrollArea className="flex-1 px-6 py-6">
          <div className="max-w-3xl mx-auto">
            {currentStep === "columns" && (
              <Step1_Columns
                columns={columns}
                selectedColumns={query.displayColumns}
                onColumnToggle={handleToggleColumn}
                onSelectAll={handleSelectAllColumns}
                onSelectNone={handleSelectNoneColumns}
              />
            )}

            {currentStep === "groupBy" && (
              <Step2_GroupBy
                columns={columns}
                selectedColumns={query.displayColumns}
                groupBy={query.groupBy}
                onAddGroupColumn={handleAddGroupColumn}
                onRemoveGroupColumn={handleRemoveGroupColumn}
              />
            )}

            {currentStep === "calculate" && (
              <Step3_Calculations
                columns={columns}
                calculations={query.calculations}
                onAddCalculation={handleAddCalculation}
                onRemoveCalculation={handleRemoveCalculation}
                hasGrouping={hasGrouping}
              />
            )}

            {currentStep === "filters" && (
              <Step4_Filters
                columns={columns}
                filters={query.filters}
                onAddFilter={handleAddFilter}
                onRemoveFilter={handleRemoveFilter}
              />
            )}

            {currentStep === "sort" && (
              <Step5_Sort
                columns={columns}
                displayColumns={query.displayColumns}
                groupBy={query.groupBy}
                calculations={query.calculations}
                sortBy={query.sortBy}
                onAddSort={handleAddSort}
                onRemoveSort={handleRemoveSort}
                onToggleDirection={handleToggleSortDirection}
                limit={query.limit}
                onLimitChange={handleLimitChange}
              />
            )}

            {currentStep === "run" && (
              <Step6_Results
                result={result}
                isLoading={isLoading}
                error={error}
                onExport={handleExport}
                onRefine={() => setCurrentStep("filters")}
                onEdit={() => {
                  setCurrentStep("columns");
                  setCompletedSteps(new Set());
                  setResult(null);
                }}
                columns={resultColumns}
              />
            )}
          </div>
        </ScrollArea>

        {/* Query Preview at Bottom */}
        <div className="px-6 py-3 border-t border-border/50 bg-muted/30">
          <QueryPreview query={queryPreviewText} />
        </div>

        {/* Navigation Buttons */}
        {currentStep !== "run" && (
          <div className="px-6 py-3 border-t border-border/50 bg-card/20 flex items-center justify-between">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={!canGoBack()}
            >
              Back
            </Button>
            <div className="text-sm text-muted-foreground">
              Step {["columns", "groupBy", "calculate", "filters", "sort"].indexOf(currentStep) + 1} of 5
            </div>
            <Button onClick={handleNext} disabled={!canGoNext()}>
              {currentStep === "sort" ? "Run Report" : "Next"}
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}
