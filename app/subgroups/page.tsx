"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { Subgroup, SubgroupsResult } from "@/types/subgroup";
import { SubgroupTable } from "@/components/subgroups/SubgroupTable";
import { SubgroupModal } from "@/components/subgroups/SubgroupModal";
import { DeleteDialog } from "@/components/subgroups/DeleteDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, FileSpreadsheet, X } from "lucide-react";

type SortField = "cod" | "denumire" | "grupa" | "subgrupa" | null;
type SortDirection = "asc" | "desc" | null;

export default function SubgroupsPage() {
  const [subgroups, setSubgroups] = useState<Subgroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Import state
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  // Sort state
  const [sortField, setSortField] = useState<SortField>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editSubgroup, setEditSubgroup] = useState<Subgroup | null>(null);

  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [subgroupToDelete, setSubgroupToDelete] = useState<Subgroup | null>(null);

  // Sort subgroups
  const sortedSubgroups = useMemo(() => {
    if (!sortField || !sortDirection) {
      return subgroups;
    }

    return [...subgroups].sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];

      if (sortDirection === "asc") {
        return aVal.localeCompare(bVal);
      } else {
        return bVal.localeCompare(aVal);
      }
    });
  }, [subgroups, sortField, sortDirection]);

  // Handle sort change
  const handleSortChange = useCallback((field: SortField) => {
    if (sortField === field) {
      // Toggle direction
      setSortDirection(sortDirection === "asc" ? "desc" : sortDirection === "desc" ? null : "asc");
      if (sortDirection === "desc") {
        setSortField(null);
        setSortDirection(null);
      }
    } else {
      // New field, default to asc
      setSortField(field);
      setSortDirection("asc");
    }
  }, [sortField, sortDirection]);

  // Fetch subgroups
  const fetchSubgroups = useCallback(async () => {
    setLoading(true);
    try {
      const result = await invoke<SubgroupsResult>("get_subgroups", {
        page: 0,
        pageSize: 10000,
        search: debouncedSearch || null,
      });
      setSubgroups(result.rows);
    } catch (err) {
      console.error("Failed to fetch subgroups:", err);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch]);

  // Debounce search
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    searchTimeoutRef.current = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery]);

  // Fetch on mount and search change
  useEffect(() => {
    fetchSubgroups();
  }, [fetchSubgroups]);

  // Open modal for adding
  const handleAdd = () => {
    setEditSubgroup(null);
    setModalOpen(true);
  };

  // Open modal for editing
  const handleRowClick = (subgroup: Subgroup) => {
    setEditSubgroup(subgroup);
    setModalOpen(true);
  };

  // Handle save from modal
  const handleSave = () => {
    setModalOpen(false);
    fetchSubgroups();
  };

  // Handle delete button click from modal
  const handleDeleteClick = () => {
    if (editSubgroup) {
      setSubgroupToDelete(editSubgroup);
      setDeleteDialogOpen(true);
    }
  };

  // Handle delete confirmation
  const handleDeleteConfirm = () => {
    setDeleteDialogOpen(false);
    setSubgroupToDelete(null);
    fetchSubgroups();
  };

  // Handle modal close
  const handleModalClose = () => {
    setModalOpen(false);
    setEditSubgroup(null);
  };

  // Handle delete dialog close
  const handleDeleteDialogClose = () => {
    setDeleteDialogOpen(false);
    setSubgroupToDelete(null);
  };

  // Handle import from Excel
  const handleImportExcel = async () => {
    setImportError(null);
    try {
      const selected = await open({
        multiple: false,
        filters: [{
          name: 'Excel',
          extensions: ['xlsx', 'xls']
        }]
      });

      // Handle the selected file (can be string, string array, or null)
      const filePath = Array.isArray(selected)
        ? selected[0]
        : selected;

      if (filePath) {
        setImporting(true);
        await invoke<number>('import_subgroups_from_excel', {
          path: filePath
        });
        await fetchSubgroups();
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to import subgroups';
      setImportError(message);
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-background/50">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border/50 bg-card/30">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-lg font-semibold">Manage subgroups</h1>
          </div>
          <Button onClick={handleAdd} size="sm">
            <Plus className="w-4 h-4 mr-1" />
            Add
          </Button>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search subgroups..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Error Banner */}
      {importError && (
        <div className="mx-6 mt-4 flex items-center justify-between p-3 rounded-md bg-destructive/10 border border-destructive/20 text-destructive">
          <span className="text-sm">{importError}</span>
          <Button
            variant="ghost"
            size="sm"
            className="h-auto p-1 text-destructive hover:text-destructive hover:bg-destructive/20"
            onClick={() => setImportError(null)}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* Table / Empty State */}
      <div className="flex-1 overflow-auto p-6">
        {subgroups.length === 0 && !loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center p-8 rounded-lg border border-border/50 bg-card/50 max-w-sm">
              <FileSpreadsheet className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">No subgroups yet</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Import your subgroups from an Excel file to get started.
              </p>
              <Button onClick={handleImportExcel} disabled={importing}>
                {importing ? 'Importing...' : 'Import from Excel'}
              </Button>
            </div>
          </div>
        ) : (
          <SubgroupTable
            subgroups={sortedSubgroups}
            searchQuery={searchQuery}
            onRowClick={handleRowClick}
            loading={loading}
            sortField={sortField}
            sortDirection={sortDirection}
            onSortChange={handleSortChange}
          />
        )}
      </div>

      {/* Modals */}
      <SubgroupModal
        open={modalOpen}
        onClose={handleModalClose}
        onSave={handleSave}
        onDelete={handleDeleteClick}
        editSubgroup={editSubgroup}
      />

      <DeleteDialog
        open={deleteDialogOpen}
        onClose={handleDeleteDialogClose}
        onConfirm={handleDeleteConfirm}
        cod={subgroupToDelete?.cod || ""}
      />
    </div>
  );
}
