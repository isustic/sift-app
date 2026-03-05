'use client';

import type { Metadata } from "next";
import { Cormorant_Garamond, Manrope, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import "@/lib/theme-init";
import { Sidebar } from "@/components/Sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/ThemeProvider";
import { UpdateBanner } from "@/components/UpdateBanner";
import { useEffect, useState } from "react";
import { invoke } from '@tauri-apps/api/core';
import { UpdateDialog } from '@/components/UpdateDialog';

const cormorant = Cormorant_Garamond({
    subsets: ["latin"],
    variable: "--font-cormorant",
    display: "swap",
    weight: ["300", "400", "500", "600", "700"],
    style: ["normal", "italic"],
});

const manrope = Manrope({
    subsets: ["latin"],
    variable: "--font-manrope",
    display: "swap",
    weight: ["300", "400", "500", "600"],
});

const ibmPlexMono = IBM_Plex_Mono({
    subsets: ["latin"],
    variable: "--font-ibm-mono",
    display: "swap",
    weight: ["300", "400", "500"],
});

export const metadata: Metadata = {
    title: "Sift Analytics",
    description: "Analyze and aggregate XLSX data with dynamic pivot reports",
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const [updateAvailable, setUpdateAvailable] = useState(false);
    const [updateVersion, setUpdateVersion] = useState('');

    useEffect(() => {
        invoke<string | null>('check_for_updates')
            .then((version) => {
                if (version) {
                    setUpdateVersion(version);
                    setUpdateAvailable(true);
                }
            })
            .catch((error) => {
                console.error('Update check failed:', error);
            });
    }, []);

    return (
        <html lang="en">
            <body className={`${cormorant.variable} ${manrope.variable} ${ibmPlexMono.variable} bg-background text-foreground antialiased`}>
                <ThemeProvider>
                    <UpdateBanner currentVersion="0.1.0" />
                    <TooltipProvider>
                        <div className="flex h-screen overflow-hidden">
                            <Sidebar />
                            <main className="flex-1 overflow-auto">{children}</main>
                        </div>
                    </TooltipProvider>
                    <UpdateDialog
                        open={updateAvailable}
                        version={updateVersion}
                        onClose={() => setUpdateAvailable(false)}
                    />
                </ThemeProvider>
            </body>
        </html>
    );
}
