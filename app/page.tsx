"use client";

import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { WelcomeDashboard } from "@/components/dashboard/WelcomeDashboard";
import { ReturningDashboard } from "@/components/dashboard/ReturningDashboard";

interface Dataset {
    id: number;
    name: string;
    file_origin: string;
    table_name: string;
    row_count: number;
    created_at: string;
}

export default function HomePage() {
    const [datasets, setDatasets] = useState<Dataset[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadDatasets();
    }, []);

    const loadDatasets = async () => {
        try {
            const data = await invoke<Dataset[]>("list_datasets");
            setDatasets(data);
        } catch (err) {
            console.error("Failed to load datasets:", err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-pulse text-muted-foreground">Loading...</div>
            </div>
        );
    }

    if (datasets.length === 0) {
        return <WelcomeDashboard />;
    }

    return <ReturningDashboard datasets={datasets} />;
}
