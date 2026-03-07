"use client";

import { useEffect, useState } from "react";
import { WelcomeDashboard } from "@/components/dashboard/WelcomeDashboard";
import { ReturningDashboard } from "@/components/dashboard/ReturningDashboard";
import { safeInvoke } from "@/lib/tauri";

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
            const data = await safeInvoke<Dataset[]>("list_datasets");
            setDatasets(data);
        } catch (err) {
            // Not in Tauri or command failed - show welcome screen
            console.log("Running in browser mode or command failed:", err);
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
