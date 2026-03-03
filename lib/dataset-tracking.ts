const LAST_OPENED_KEY = "last_opened_dataset_id";

export function setLastOpenedDataset(id: number): void {
    localStorage.setItem(LAST_OPENED_KEY, String(id));
}

export function getLastOpenedDataset(): number | null {
    const value = localStorage.getItem(LAST_OPENED_KEY);
    return value ? Number(value) : null;
}

export function clearLastOpenedDataset(): void {
    localStorage.removeItem(LAST_OPENED_KEY);
}
