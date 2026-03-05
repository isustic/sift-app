"use client";

import { useEffect, useState } from "react";
import { X, Download } from "lucide-react";
import { checkForUpdates } from "@/lib/update-check";

interface UpdateBannerProps {
  currentVersion: string;
}

export function UpdateBanner({ currentVersion }: UpdateBannerProps) {
  const [updateInfo, setUpdateInfo] = useState<{
    latestVersion: string;
    downloadUrl: string;
  } | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    checkForUpdates(currentVersion).then((result) => {
      if (result.hasUpdate && result.latestVersion && result.downloadUrl) {
        setUpdateInfo({
          latestVersion: result.latestVersion,
          downloadUrl: result.downloadUrl
        });
      }
    });
  }, [currentVersion]);

  if (!updateInfo || dismissed) {
    return null;
  }

  return (
    <div className="bg-blue-600 text-white px-4 py-2 flex items-center justify-between gap-4">
      <div className="flex items-center gap-2">
        <Download className="w-4 h-4" />
        <span className="text-sm">
          Update available: <strong>v{updateInfo.latestVersion}</strong>
        </span>
      </div>
      <div className="flex items-center gap-3">
        <a
          href={updateInfo.downloadUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm underline hover:no-underline"
        >
          Download
        </a>
        <button
          onClick={() => setDismissed(true)}
          className="hover:bg-blue-700 rounded p-1"
          aria-label="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
