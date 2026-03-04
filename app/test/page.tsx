'use client';

import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import type { Subgroup, SubgroupsResult } from '@/types/subgroup';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function TestPage() {
  const [subgroups, setSubgroups] = useState<Subgroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState<number>(0);

  useEffect(() => {
    const fetchSubgroups = async () => {
      try {
        setLoading(true);
        setError(null);
        const result = await invoke<SubgroupsResult>('get_subgroups', {
          page: 0,
          page_size: 10000,
        });
        setSubgroups(result.rows);
        setTotalCount(result.total);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch subgroups');
      } finally {
        setLoading(false);
      }
    };

    fetchSubgroups();
  }, []);

  return (
    <div className="container mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>Subgroups Test Page</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-muted-foreground">Loading subgroups...</div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-destructive">Error: {error}</div>
            </div>
          ) : (
            <>
              <div className="mb-4 text-sm text-muted-foreground">
                Loaded {subgroups.length} of {totalCount} total subgroups
              </div>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Code</TableHead>
                      <TableHead>Denumire</TableHead>
                      <TableHead>Grupa</TableHead>
                      <TableHead>Subgrupa</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {subgroups.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground">
                          No subgroups found
                        </TableCell>
                      </TableRow>
                    ) : (
                      subgroups.map((subgroup) => (
                        <TableRow key={subgroup.cod}>
                          <TableCell className="font-medium">{subgroup.cod}</TableCell>
                          <TableCell>{subgroup.denumire}</TableCell>
                          <TableCell>{subgroup.grupa}</TableCell>
                          <TableCell>{subgroup.subgrupa}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
