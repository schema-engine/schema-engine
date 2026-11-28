import { logger } from '../../lib/logger.js';
import { getAutoSaveDraftStorageKey } from '../../actions/plugins/auto-save.plugin.js';
import { clearTrackedAutoSaveDrafts, createLocalStorageAutoSaveStorage } from './auto-save-storage.js';

const consentKey = 'gdpr_consent_form_autosave';
const consentVersion = '1.0';

export interface BrowserStorage {
	getItem: (key: string) => string | null;
	removeItem: (key: string) => void;
	setItem: (key: string, value: string) => void;
}

export interface GDPRConsentStatus {
	granted: boolean;
	version: string;
	timestamp: string;
}

export interface GDPRConsentTool {
	isLocalStorageAvailable: () => boolean;
	getConsent: () => GDPRConsentStatus | null;
	hasConsent: () => boolean;
	grantConsent: () => void;
	revokeConsent: () => void;
	needsConsentUpdate: () => boolean;
	saveDraft: (formId: string, data: Record<string, unknown>) => boolean;
	loadDraft: (formId: string) => Record<string, unknown> | null;
	clearDraft: (formId: string) => void;
}

function browserLocalStorage(): BrowserStorage | undefined {
	try {
		return typeof window === 'undefined' ? undefined : window.localStorage;
	} catch {
		return undefined;
	}
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isConsentStatus(value: unknown): value is GDPRConsentStatus {
	return (
		isRecord(value) &&
		typeof value.granted === 'boolean' &&
		typeof value.version === 'string' &&
		typeof value.timestamp === 'string'
	);
}

/**
 * Creates consent and draft tools backed by browser storage.
 *
 * @remarks Supplying a storage adapter keeps consent behavior testable without
 * a browser and lets hosts provide an isolated storage instance. Drafts go
 * through the same tracked adapter as the auto-save action, so revoking consent
 * clears both.
 */
export function createGDPRConsent(storage: BrowserStorage | undefined = browserLocalStorage()): GDPRConsentTool {
	const drafts = storage ? createLocalStorageAutoSaveStorage(storage) : undefined;

	const isLocalStorageAvailable = (): boolean => {
		if (!storage) return false;

		try {
			const testKey = '__schema_engine_storage_test__';
			storage.setItem(testKey, 'test');
			storage.removeItem(testKey);
			return true;
		} catch {
			return false;
		}
	};

	const getConsent = (): GDPRConsentStatus | null => {
		if (!storage) return null;

		try {
			const value = storage.getItem(consentKey);
			if (!value) return null;

			const parsed: unknown = JSON.parse(value);
			return isConsentStatus(parsed) ? parsed : null;
		} catch {
			return null;
		}
	};

	const hasConsent = (): boolean => {
		const consent = getConsent();
		return consent?.granted === true && consent.version === consentVersion;
	};

	const grantConsent = (): void => {
		if (!isLocalStorageAvailable()) {
			logger.warn('Cannot store consent because browser storage is unavailable');
			return;
		}

		try {
			storage?.setItem(
				consentKey,
				JSON.stringify({ granted: true, version: consentVersion, timestamp: new Date().toISOString() }),
			);
			logger.info('Consent granted for auto-save');
		} catch (error) {
			logger.error('Failed to store consent', { error });
		}
	};

	const revokeConsent = (): void => {
		if (!storage) return;

		try {
			storage.removeItem(consentKey);
			clearTrackedAutoSaveDrafts(storage);
			logger.info('Consent revoked and auto-saved data cleared');
		} catch (error) {
			logger.error('Failed to revoke consent', { error });
		}
	};

	const needsConsentUpdate = (): boolean => getConsent()?.version !== consentVersion;

	const saveDraft = (formId: string, data: Record<string, unknown>): boolean => {
		if (!hasConsent()) {
			logger.debug('Skipping draft save because consent was not granted', { formId });
			return false;
		}
		if (!isLocalStorageAvailable()) return false;

		try {
			drafts?.save(getAutoSaveDraftStorageKey(formId), data);
			return true;
		} catch (error) {
			logger.error('Failed to save form draft', { formId, error });
			return false;
		}
	};

	const loadDraft = (formId: string): Record<string, unknown> | null => {
		if (!hasConsent() || !drafts) return null;

		try {
			const draft = drafts.load(getAutoSaveDraftStorageKey(formId));
			return isRecord(draft) ? draft : null;
		} catch (error) {
			logger.error('Failed to load form draft', { formId, error });
			return null;
		}
	};

	const clearDraft = (formId: string): void => {
		try {
			drafts?.remove(getAutoSaveDraftStorageKey(formId));
		} catch (error) {
			logger.error('Failed to clear form draft', { formId, error });
		}
	};

	return {
		isLocalStorageAvailable,
		getConsent,
		hasConsent,
		grantConsent,
		revokeConsent,
		needsConsentUpdate,
		saveDraft,
		loadDraft,
		clearDraft,
	};
}

/** Consent and draft tools backed by the browser's `localStorage`. */
export const GDPRConsent: GDPRConsentTool = createGDPRConsent();
