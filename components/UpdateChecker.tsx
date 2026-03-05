'use client';

import { useEffect, useState } from "react";
import { invoke } from '@tauri-apps/api/core';
import { UpdateDialog } from '@/components/UpdateDialog';

export function UpdateChecker() {
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
                // Ignore the error if it's the specific macos one so we don't spam console
                if (error && typeof error === 'string' && error.includes("does not support updates")) {
                    return;
                }
                console.error('Update check failed:', error);
            });
    }, []);

    return (
        <UpdateDialog
            open={updateAvailable}
            version={updateVersion}
            onClose={() => setUpdateAvailable(false)}
        />
    );
}
