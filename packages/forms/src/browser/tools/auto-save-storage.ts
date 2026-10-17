import type { AutoSaveStorage } from '../../actions/plugins/auto-save.plugin';
import type { BrowserStorage } from './gdpr-consent';

const trackedDraftKeysStorageKey = '__schema_engine_auto_save_draft_keys__';

function browserLocalStorage(): BrowserStorage {
	if (typeof window === 'undefined') {
		throw new Error('Browser localStorage is unavailable');
	}

	return window.localStorage;
}

function readTrackedDraftKeys(storage: BrowserStorage): Set<string> {
	try {
		const value: unknown = JSON.parse(storage.getItem(trackedDraftKeysStorageKey) ?? 'null');
		return new Set(Array.isArray(value) ? value.filter((key): key is string => typeof key === 'string') : []);
	} catch {
		return new Set();
	}
}

function writeTrackedDraftKeys(storage: BrowserStorage, keys: Set<string>): void {
	if (keys.size === 0) {
		storage.removeItem(trackedDraftKeysStorageKey);
		return;
	}

	storage.setItem(trackedDraftKeysStorageKey, JSON.stringify([...keys]));
}

/** Returns draft keys written through the browser auto-save adapter. */
export function getTrackedAutoSaveDraftKeys(storage: BrowserStorage): string[] {
	return [...readTrackedDraftKeys(storage)];
}

/** Removes all tracked draft keys and their storage metadata. */
export function clearTrackedAutoSaveDrafts(storage: BrowserStorage): void {
	for (const key of readTrackedDraftKeys(storage)) {
		storage.removeItem(key);
	}

	writeTrackedDraftKeys(storage, new Set());
}

/** Removes a draft key and stops tracking it for consent revocation. */
export function removeTrackedAutoSaveDraftKey(storage: BrowserStorage, key: string): void {
	storage.removeItem(key);
	const keys = readTrackedDraftKeys(storage);
	keys.delete(key);
	writeTrackedDraftKeys(storage, keys);
}

function trackAutoSaveDraftKey(storage: BrowserStorage, key: string): void {
	if (key === trackedDraftKeysStorageKey) return;

	const keys = readTrackedDraftKeys(storage);
	keys.add(key);
	writeTrackedDraftKeys(storage, keys);
}

function createAutoSaveStorage(resolveStorage: () => BrowserStorage): AutoSaveStorage {
	return {
		save: (key, data) => {
			const storage = resolveStorage();
			trackAutoSaveDraftKey(storage, key);
			storage.setItem(key, JSON.stringify(data));
		},
		load: (key) => {
			const stored = resolveStorage().getItem(key);
			return stored === null ? null : JSON.parse(stored);
		},
		remove: (key) => removeTrackedAutoSaveDraftKey(resolveStorage(), key),
	};
}

/** Adapts a Web Storage implementation to the engine's auto-save storage port. */
export function createLocalStorageAutoSaveStorage(storage: BrowserStorage): AutoSaveStorage {
	return createAutoSaveStorage(() => storage);
}

/** Browser localStorage adapter used by browser action registrations. */
export const localStorageAutoSaveStorage: AutoSaveStorage = createAutoSaveStorage(browserLocalStorage);
