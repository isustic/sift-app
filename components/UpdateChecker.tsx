'use client';

import { useEffect, useState } from "react";
import { UpdateDialog } from '@/components/UpdateDialog';

export function UpdateChecker() {
    const [updateAvailable, setUpdateAvailable] = useState(false);
    const [updateVersion, setUpdateVersion] = useState('');

    useEffect(() => {
        const checkForUpdates = async () => {
            try {
                const { invoke } = await import('@tauri-apps/api/core');
                const version = await invoke<string | null>('check_for_updates');
                if (version) {
                    setUpdateVersion(version);
                    setUpdateAvailable(true);
                }
            } catch (error) {
                // Ignore the error if it's the specific macos one or if not in Tauri
                if (error && typeof error === 'string' && error.includes("does not support updates")) {
                    return;
                }
                // Silently ignore when not in Tauri context
                if (error && typeof error === 'string' && error.includes("Unknown command")) {
                    return;
                }
            }
        };

        checkForUpdates();
    }, []);

    return (
        <UpdateDialog
            open={updateAvailable}
            version={updateVersion}
            onClose={() => setUpdateAvailable(false)}
        />
    );
}
