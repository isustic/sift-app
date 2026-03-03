"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { setLastOpenedDataset } from "@/lib/dataset-tracking";
import { invoke } from "@tauri-apps/api/core";
import { History, Calendar } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { HistoricDataModal } from "@/components/Upload/HistoricDataModal";
import { TimelineNode, DatasetCard, SearchBar, FilterChips, StatsBar } from "@/components/History";
import { cn } from "@/lib/utils";

const ROMANIAN_MONTHS = [
    "Ianuarie", "Februarie", "Martie", "Aprilie", "Mai", "Iunie",
    "Iulie", "August", "Septembrie", "Octombrie", "Noiembrie", "Decembrie"
];

interface Dataset {
    id: number;
    name: string;
    file_origin: string;
    row_count: number;
    created_at: string;
}

type TimeFilter = 'all' | 'today' | 'week' | 'month' | 'year';

export default function IstoricPage() {
    const [datasets, setDatasets] = useState<Dataset[]>([]);
    const [expandedYears, setExpandedYears] = useState<Set<number>>(new Set());
    const [expandedMonths, setExpandedMonths] = useState<Map<number, Set<number>>>(new Map());
    const [selectedDataset, setSelectedDataset] = useState<Dataset | null>(null);
    const [modalOpen, setModalOpen] = useState(false);

    // Search and filter state
    const [searchQuery, setSearchQuery] = useState("");
    const [timeFilter, setTimeFilter] = useState<TimeFilter>('all');

    const loadDatasets = useCallback(async () => {
        const ds = await invoke<Dataset[]>("list_datasets");
        setDatasets(ds);
    }, []);

    useEffect(() => {
        loadDatasets();
    }, [loadDatasets]);

    // Filter datasets based on search and time filter
    const filteredDatasets = useMemo(() => {
        let filtered = datasets;

        // Search filter
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(ds =>
                ds.name.toLowerCase().includes(query) ||
                ds.file_origin.toLowerCase().includes(query)
            );
        }

        // Time filter
        if (timeFilter !== 'all') {
            const now = new Date();
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

            filtered = filtered.filter(ds => {
                const dsDate = new Date(ds.created_at);

                switch (timeFilter) {
                    case 'today':
                        return dsDate >= today;
                    case 'week':
                        const weekAgo = new Date(today);
                        weekAgo.setDate(weekAgo.getDate() - 7);
                        return dsDate >= weekAgo;
                    case 'month':
                        const monthAgo = new Date(today);
                        monthAgo.setMonth(monthAgo.getMonth() - 1);
                        return dsDate >= monthAgo;
                    case 'year':
                        return dsDate.getFullYear() === now.getFullYear();
                    default:
                        return true;
                }
            });
        }

        return filtered;
    }, [datasets, searchQuery, timeFilter]);

    // Group datasets by year -> month
    const groupedDatasets = useMemo((): Map<number, Map<number, Dataset[]>> => {
        const groups = new Map<number, Map<number, Dataset[]>>();

        for (const ds of filteredDatasets) {
            const date = new Date(ds.created_at);
            const year = date.getFullYear();
            const month = date.getMonth();

            if (!groups.has(year)) {
                groups.set(year, new Map<number, Dataset[]>());
            }
            const yearGroup = groups.get(year)!;
            if (!yearGroup.has(month)) {
                yearGroup.set(month, []);
            }
            yearGroup.get(month)!.push(ds);
        }

        // Sort datasets within each month by created_at (newest first)
        for (const yearGroup of groups.values()) {
            for (const monthDatasets of yearGroup.values()) {
                monthDatasets.sort((a, b) =>
                    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
                );
            }
        }

        return groups;
    }, [filteredDatasets]);

    // Calculate stats
    const stats = useMemo(() => {
        const now = new Date();
        const thisMonth = now.getMonth();
        const thisYear = now.getFullYear();

        return datasets.reduce((acc, ds) => {
            const date = new Date(ds.created_at);

            acc.total++;

            if (date.getFullYear() === thisYear) {
                acc.thisYear++;

                if (date.getMonth() === thisMonth) {
                    acc.thisMonth++;
                }
            }

            return acc;
        }, { thisMonth: 0, thisYear: 0, total: 0 });
    }, [datasets]);

    const groups = groupedDatasets;

    const toggleYear = (year: number) => {
        setExpandedYears(prev => {
            const next = new Set(prev);
            if (next.has(year)) {
                next.delete(year);
            } else {
                next.add(year);
            }
            return next;
        });
    };

    const toggleMonth = (year: number, month: number) => {
        setExpandedMonths(prev => {
            const next = new Map(prev);
            const yearSet = next.get(year) || new Set<number>();
            if (yearSet.has(month)) {
                yearSet.delete(month);
                if (yearSet.size === 0) {
                    next.delete(year);
                } else {
                    next.set(year, yearSet);
                }
            } else {
                yearSet.add(month);
                next.set(year, yearSet);
            }
            return next;
        });
    };

    const openDatasetModal = (dataset: Dataset) => {
        setLastOpenedDataset(dataset.id);
        setSelectedDataset(dataset);
        setModalOpen(true);
    };

    const sortedYears = Array.from(groups.keys()).sort((a, b) => b - a);

    const timeFilterOptions = [
        { label: 'All Time', value: 'all' },
        { label: 'Today', value: 'today' },
        { label: 'This Week', value: 'week' },
        { label: 'This Month', value: 'month' },
        { label: 'This Year', value: 'year' },
    ];

    return (
        <div className="flex flex-col h-full bg-background/50 mesh-bg">
            {/* Header */}
            <div className="h-14 px-6 flex items-center gap-3 border-b border-border/50 bg-card/30 backdrop-blur-sm">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center border border-primary/20">
                    <History className="w-4 h-4 text-primary" />
                </div>
                <div>
                    <h1 className="text-sm font-semibold">Istoric</h1>
                    <p className="text-[10px] text-muted-foreground">
                        Browse your data history by time
                    </p>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto">
                {datasets.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center p-6">
                        <div className="w-16 h-16 mb-4 rounded-2xl bg-gradient-to-br from-muted/20 to-muted/10 flex items-center justify-center border border-border/50">
                            <Calendar className="w-7 h-7 text-muted-foreground/50" />
                        </div>
                        <h2 className="text-lg font-semibold mb-2 text-foreground">Nu există date</h2>
                        <p className="text-sm text-muted-foreground">
                            Importă fișiere Excel pentru a vedea istoricul
                        </p>
                    </div>
                ) : (
                    <div className="max-w-4xl mx-auto">
                        {/* Stats Bar */}
                        <StatsBar
                            thisMonthCount={stats.thisMonth}
                            thisYearCount={stats.thisYear}
                            totalCount={stats.total}
                        />

                        {/* Search and Filters */}
                        <div className="p-6 space-y-4">
                            <SearchBar
                                value={searchQuery}
                                onChange={setSearchQuery}
                                resultCount={filteredDatasets.length}
                                placeholder="Search datasets..."
                            />

                            <FilterChips
                                options={timeFilterOptions}
                                value={timeFilter}
                                onChange={setTimeFilter}
                            />
                        </div>

                        {/* Timeline */}
                        <div className="px-6 pb-6">
                            {filteredDatasets.length === 0 ? (
                                <div className="text-center py-12">
                                    <p className="text-sm text-muted-foreground">
                                        No datasets match your search or filters
                                    </p>
                                </div>
                            ) : (
                                <div className="relative space-y-3">
                                    {/* Timeline spine */}
                                    <div className="absolute left-[19px] top-0 bottom-0 w-0.5 bg-gradient-to-b from-primary/50 via-accent/30 to-transparent" />

                                    {sortedYears.map((year) => {
                                        const yearExpanded = expandedYears.has(year);
                                        const yearGroups = groups.get(year)!;
                                        const sortedMonths = Array.from(yearGroups.keys()).sort((a, b) => b - a);
                                        const yearDatasetCount = Array.from(yearGroups.values())
                                            .reduce((sum, arr) => sum + arr.length, 0);

                                        return (
                                            <Collapsible
                                                key={year}
                                                open={yearExpanded}
                                                onOpenChange={() => toggleYear(year)}
                                            >
                                                {/* Year Header */}
                                                <CollapsibleTrigger className="w-full">
                                                    <div className="relative pr-4">
                                                        {/* Connector from spine to node */}
                                                        <div className="absolute left-[19px] top-1/2 -translate-y-1/2 w-6 h-0.5 bg-gradient-to-r from-primary/50 to-transparent" />

                                                        <TimelineNode
                                                            type="year"
                                                            label={year}
                                                            count={yearDatasetCount}
                                                            expanded={yearExpanded}
                                                            onClick={() => toggleYear(year)}
                                                        />
                                                    </div>
                                                </CollapsibleTrigger>

                                                {/* Months */}
                                                <CollapsibleContent className="mt-2 ml-6 space-y-2">
                                                    {sortedMonths.map((month) => {
                                                        const monthExpanded = expandedMonths.get(year)?.has(month);
                                                        const monthDatasets = yearGroups.get(month)!;

                                                        return (
                                                            <Collapsible
                                                                key={month}
                                                                open={monthExpanded}
                                                                onOpenChange={() => toggleMonth(year, month)}
                                                            >
                                                                {/* Month Header */}
                                                                <CollapsibleTrigger className="w-full">
                                                                    <div className="relative">
                                                                        {/* Connector from year to month */}
                                                                        <div className="absolute left-[19px] top-0 w-0.5 h-6 bg-gradient-to-b from-primary/30 to-transparent" />

                                                                        <TimelineNode
                                                                            type="month"
                                                                            label={ROMANIAN_MONTHS[month]}
                                                                            count={monthDatasets.length}
                                                                            expanded={monthExpanded ?? false}
                                                                            onClick={() => toggleMonth(year, month)}
                                                                        />
                                                                    </div>
                                                                </CollapsibleTrigger>

                                                                {/* Datasets */}
                                                                <CollapsibleContent className="mt-1.5 ml-6 space-y-1.5">
                                                                    {monthDatasets.map((dataset) => (
                                                                        <DatasetCard
                                                                            key={dataset.id}
                                                                            name={dataset.name}
                                                                            createdAt={dataset.created_at}
                                                                            fileOrigin={dataset.file_origin}
                                                                            rowCount={dataset.row_count}
                                                                            onClick={() => openDatasetModal(dataset)}
                                                                        />
                                                                    ))}
                                                                </CollapsibleContent>
                                                            </Collapsible>
                                                        );
                                                    })}
                                                </CollapsibleContent>
                                            </Collapsible>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Modal */}
            {selectedDataset && (
                <HistoricDataModal
                    open={modalOpen}
                    onOpenChange={setModalOpen}
                    datasetId={selectedDataset.id}
                    datasetName={selectedDataset.name}
                    fileOrigin={selectedDataset.file_origin}
                    rowCount={selectedDataset.row_count}
                    createdAt={selectedDataset.created_at}
                />
            )}
        </div>
    );
}
