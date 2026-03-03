"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { invoke } from "@tauri-apps/api/core";
import { Loader2, FileSpreadsheet, Database } from "lucide-react";
import { AgentList, AgentInfo } from "@/components/epp/AgentList";
import { EppReportTable, EppRow } from "@/components/epp/EppReportTable";
import { SummaryCards } from "@/components/epp/SummaryCards";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Dataset {
  id: number;
  name: string;
}

function EPPPageContent() {
  const searchParams = useSearchParams();

  // Dataset state
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [selectedDatasetId, setSelectedDatasetId] = useState<number | null>(null);

  // Agent list state
  const [agents, setAgents] = useState<AgentInfo[]>([]);
  const [agentsLoading, setAgentsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);

  // Report state
  const [reportData, setReportData] = useState<{
    agent_name: string;
    year: number;
    rows: EppRow[];
  } | null>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [selectedYear, setSelectedYear] = useState(2025);
  const [showQualifiedOnly, setShowQualifiedOnly] = useState(false);

  // Load datasets on mount
  useEffect(() => {
    loadDatasets();
  }, []);

  // Handle dataset pre-selection from URL
  useEffect(() => {
    const datasetId = searchParams.get("dataset");
    if (datasetId && datasets.length > 0) {
      const found = datasets.find((d) => d.id === Number(datasetId));
      if (found) {
        setSelectedDatasetId(found.id);
      }
    }
  }, [datasets, searchParams]);

  const loadDatasets = async () => {
    try {
      const result = await invoke<Dataset[]>("list_datasets");
      setDatasets(result);
      if (result.length > 0) {
        setSelectedDatasetId(result[0].id);
      }
    } catch (err) {
      console.error("Failed to load datasets:", err);
    }
  };

  // Load agents when dataset changes
  useEffect(() => {
    if (selectedDatasetId) {
      loadAgentsForDataset(selectedDatasetId);
    } else {
      setAgents([]);
    }
    // Reset agent selection and report when dataset changes
    setSelectedAgent(null);
    setReportData(null);
  }, [selectedDatasetId]);

  const loadAgentsForDataset = async (datasetId: number) => {
    setAgentsLoading(true);
    try {
      const result = await invoke<Array<{ name: string; client_count: number }>>(
        "get_agents_for_dataset",
        { datasetId }
      );
      setAgents(
        result.map((a) => ({
          name: a.name,
          client_count: a.client_count,
        }))
      );
    } catch (err) {
      console.error("Failed to load agents:", err);
      setAgents([]);
    } finally {
      setAgentsLoading(false);
    }
  };

  // Generate report when agent is selected
  useEffect(() => {
    if (selectedAgent && selectedDatasetId) {
      generateReport(selectedAgent, selectedYear, selectedDatasetId);
    } else {
      setReportData(null);
    }
  }, [selectedAgent, selectedYear, selectedDatasetId]);

  const generateReport = async (agent: string, year: number, datasetId: number) => {
    setReportLoading(true);
    try {
      const result = await invoke<{
        agent_name: string;
        year: number;
        rows: EppRow[];
      }>("generate_epp_report", {
        agentName: agent,
        year: year,
        datasetId: datasetId,
      });
      setReportData(result);
    } catch (err) {
      console.error("Failed to generate report:", err);
      setReportData(null);
    } finally {
      setReportLoading(false);
    }
  };

  // Filter rows by qualified status
  const filteredRows = reportData
    ? reportData.rows.filter((row) =>
        showQualifiedOnly
          ? row.total >= 15000 && row.program !== "-" && row.program !== ""
          : true
      )
    : [];

  // Calculate summary stats from filtered rows
  const summaryStats = reportData
    ? {
        agentName: reportData.agent_name,
        clientCount: filteredRows.length,
        totalAnual: filteredRows.reduce(
          (sum, row) => sum + row.total_anual,
          0
        ),
        averagePerClient:
          filteredRows.length > 0
            ? filteredRows.reduce((sum, row) => sum + row.total_anual, 0) /
              filteredRows.length
            : 0,
      }
    : null;

  return (
    <div className="flex h-full bg-background/50">
      {/* LEFT PANEL - Agent Selection */}
      <aside className="w-80 shrink-0 border-r border-border/50 bg-card/30 backdrop-blur-sm flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-4 pt-4 pb-2 border-b border-border/50">
          <h1 className="text-sm font-semibold flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-primary" />
            EPP Reports
          </h1>
          <p className="text-[10px] text-muted-foreground mb-3">
            Select dataset and agent
          </p>

          {/* Dataset Selector */}
          <div className="space-y-1.5">
            <label className="flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
              <Database className="w-3 h-3" />
              Dataset
            </label>
            <Select
              value={selectedDatasetId?.toString() ?? ""}
              onValueChange={(v) => setSelectedDatasetId(Number(v))}
            >
              <SelectTrigger className="h-9 text-sm">
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
        </div>

        {/* Agent List */}
        <AgentList
          agents={agents}
          selectedAgent={selectedAgent}
          onSelectAgent={setSelectedAgent}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          isLoading={agentsLoading}
        />
      </aside>

      {/* RIGHT PANEL - Report Display */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {reportLoading ? (
          // Loading state
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center space-y-4">
              <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
              <p className="text-sm text-muted-foreground">
                Generating report for {selectedAgent}...
              </p>
            </div>
          </div>
        ) : selectedAgent && reportData && reportData.rows.length > 0 ? (
          // Report display
          <>
            {/* Report header with year selector */}
            <div className="px-6 py-3 border-b border-border/50 bg-card/20">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-semibold">{selectedAgent}</h2>
                  <p className="text-[11px] text-muted-foreground">
                    EPP Report {reportData.year}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-[11px] text-muted-foreground">Year:</label>
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(Number(e.target.value))}
                    className="h-7 px-2 text-xs border border-border/50 rounded-md bg-background"
                  >
                    {Array.from({ length: 10 }, (_, i) => {
                      const year = new Date().getFullYear() - 5 + i;
                      return (
                        <option key={year} value={year}>
                          {year}
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>
            </div>

            {/* Summary cards */}
            <div className="px-6 py-2">
              {summaryStats && (
                <SummaryCards
                  agentName={summaryStats.agentName}
                  clientCount={summaryStats.clientCount}
                  totalAnual={summaryStats.totalAnual}
                  averagePerClient={summaryStats.averagePerClient}
                />
              )}
            </div>

            {/* Report table */}
            <div className="flex-1 px-6 pb-4 min-h-0">
              <div className="h-full border border-border/50 rounded-lg overflow-hidden bg-card/20">
                <EppReportTable
                  rows={reportData.rows}
                  agentName={reportData.agent_name}
                  year={reportData.year}
                  showQualifiedOnly={showQualifiedOnly}
                  onQualifiedFilterChange={setShowQualifiedOnly}
                />
              </div>
            </div>
          </>
        ) : selectedAgent ? (
          // No data for agent
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center space-y-4">
              <FileSpreadsheet className="w-12 h-12 text-muted-foreground/30 mx-auto" />
              <p className="text-sm text-muted-foreground">
                No clients found for <strong>{selectedAgent}</strong>
              </p>
              <p className="text-xs text-muted-foreground/60">
                Try selecting a different agent or import more data
              </p>
            </div>
          </div>
        ) : (
          // Empty state - no agent selected
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-accent/20 to-[#D4B896]/20 flex items-center justify-center">
                <FileSpreadsheet className="w-8 h-8 text-accent" strokeWidth={2} />
              </div>
              <h2 className="text-lg font-semibold">Select an Agent</h2>
              <p className="text-sm text-muted-foreground max-w-md">
                Choose a dataset and an agent to generate their quarterly EPP report
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default function EPPPage() {
  return (
    <Suspense fallback={
      <div className="flex h-full items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    }>
      <EPPPageContent />
    </Suspense>
  );
}
