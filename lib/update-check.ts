interface GitHubRelease {
  tag_name: string;
  html_url: string;
  name: string;
  body: string;
  assets: Array<{
    name: string;
    browser_download_url: string;
  }>;
}

interface UpdateInfo {
  hasUpdate: boolean;
  latestVersion: string | null;
  downloadUrl: string | null;
  releaseNotes: string | null;
}

export async function checkForUpdates(
  currentVersion: string,
  repoOwner: string = "isustic",
  repoName: string = "sift-app"
): Promise<UpdateInfo> {
  try {
    const response = await fetch(
      `https://api.github.com/repos/${repoOwner}/${repoName}/releases/latest`
    );

    if (!response.ok) {
      console.warn("Failed to check for updates:", response.statusText);
      return { hasUpdate: false, latestVersion: null, downloadUrl: null, releaseNotes: null };
    }

    const release: GitHubRelease = await response.json();
    const latestVersion = release.tag_name.startsWith("v")
      ? release.tag_name.slice(1)
      : release.tag_name;

    const hasUpdate = compareVersions(latestVersion, currentVersion) > 0;

    return {
      hasUpdate,
      latestVersion: hasUpdate ? latestVersion : null,
      downloadUrl: hasUpdate ? release.html_url : null,
      releaseNotes: hasUpdate ? release.body : null
    };
  } catch (error) {
    console.warn("Error checking for updates:", error);
    return { hasUpdate: false, latestVersion: null, downloadUrl: null, releaseNotes: null };
  }
}

export function compareVersions(v1: string, v2: string): number {
  const parts1 = v1.split(".").map(Number);
  const parts2 = v2.split(".").map(Number);

  for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
    const p1 = parts1[i] ?? 0;
    const p2 = parts2[i] ?? 0;
    if (p1 > p2) return 1;
    if (p1 < p2) return -1;
  }
  return 0;
}
