/**
 * GDPR-compliant consent management for localStorage usage
 * Handles user consent for auto-save functionality
 */
export class GDPRConsent {
	private static readonly CONSENT_KEY = "gdpr_consent_form_autosave";
	private static readonly CONSENT_VERSION = "1.0";

	/**
	 * Check if localStorage is available
	 */
	static isLocalStorageAvailable(): boolean {
		try {
			if (typeof window === "undefined" || !window.localStorage) {
				return false;
			}
			const test = "__localStorage_test__";
			window.localStorage.setItem(test, "test");
			window.localStorage.removeItem(test);
			return true;
		} catch {
			return false;
		}
	}

	/**
	 * Get current consent status
	 * @returns Consent status object or null if not set
	 */
	static getConsent(): { granted: boolean; version: string; timestamp: string } | null {
		if (!GDPRConsent.isLocalStorageAvailable()) {
			return null;
		}

		try {
			const consent = window.localStorage.getItem(GDPRConsent.CONSENT_KEY);
			return consent ? JSON.parse(consent) : null;
		} catch {
			return null;
		}
	}

	/**
	 * Check if user has granted consent for auto-save
	 */
	static hasConsent(): boolean {
		const consent = GDPRConsent.getConsent();
		return consent?.granted === true && consent?.version === GDPRConsent.CONSENT_VERSION;
	}

	/**
	 * Grant consent for auto-save functionality
	 */
	static grantConsent(): void {
		if (!GDPRConsent.isLocalStorageAvailable()) {
			console.warn("[GDPR] localStorage not available - cannot store consent");
			return;
		}

		const consent = {
			granted: true,
			version: GDPRConsent.CONSENT_VERSION,
			timestamp: new Date().toISOString(),
		};

		try {
			window.localStorage.setItem(GDPRConsent.CONSENT_KEY, JSON.stringify(consent));
			console.log("[GDPR] Consent granted for auto-save");
		} catch (error) {
			console.error("[GDPR] Failed to store consent:", error);
		}
	}

	/**
	 * Revoke consent and clear all auto-saved data
	 */
	static revokeConsent(): void {
		if (!GDPRConsent.isLocalStorageAvailable()) {
			return;
		}

		try {
			// Remove consent
			window.localStorage.removeItem(GDPRConsent.CONSENT_KEY);

			// Clear all auto-saved form data
			const keys = Object.keys(window.localStorage);
			for (const key of keys) {
				if (key.startsWith("form_draft_")) {
					window.localStorage.removeItem(key);
				}
			}

			console.log("[GDPR] Consent revoked and auto-saved data cleared");
		} catch (error) {
			console.error("[GDPR] Failed to revoke consent:", error);
		}
	}

	/**
	 * Check if consent needs to be updated (version changed)
	 */
	static needsConsentUpdate(): boolean {
		const consent = GDPRConsent.getConsent();
		return consent?.version !== GDPRConsent.CONSENT_VERSION;
	}

	/**
	 * Save form draft if consent is granted
	 * @param formId - Unique form identifier
	 * @param data - Form data to save
	 */
	static saveDraft(formId: string, data: Record<string, any>): boolean {
		if (!GDPRConsent.hasConsent()) {
			console.log("[GDPR] No consent - skipping draft save");
			return false;
		}

		if (!GDPRConsent.isLocalStorageAvailable()) {
			console.warn("[GDPR] localStorage not available - cannot save draft");
			return false;
		}

		try {
			const draftKey = `form_draft_${formId}`;
			const draftData = {
				data,
				timestamp: new Date().toISOString(),
				version: GDPRConsent.CONSENT_VERSION,
			};

			window.localStorage.setItem(draftKey, JSON.stringify(draftData));
			console.log("[GDPR] Draft saved for form:", formId);
			return true;
		} catch (error) {
			console.error("[GDPR] Failed to save draft:", error);
			return false;
		}
	}

	/**
	 * Load form draft if consent is granted
	 * @param formId - Unique form identifier
	 * @returns Form data or null if not available
	 */
	static loadDraft(formId: string): Record<string, any> | null {
		if (!GDPRConsent.hasConsent()) {
			return null;
		}

		if (!GDPRConsent.isLocalStorageAvailable()) {
			return null;
		}

		try {
			const draftKey = `form_draft_${formId}`;
			const draft = window.localStorage.getItem(draftKey);

			if (!draft) {
				return null;
			}

			const draftData = JSON.parse(draft);

			// Check if draft is from current consent version
			if (draftData.version !== GDPRConsent.CONSENT_VERSION) {
				// Remove outdated draft
				window.localStorage.removeItem(draftKey);
				return null;
			}

			console.log("[GDPR] Draft loaded for form:", formId);
			return draftData.data;
		} catch (error) {
			console.error("[GDPR] Failed to load draft:", error);
			return null;
		}
	}

	/**
	 * Clear specific form draft
	 * @param formId - Unique form identifier
	 */
	static clearDraft(formId: string): void {
		if (!GDPRConsent.isLocalStorageAvailable()) {
			return;
		}

		try {
			const draftKey = `form_draft_${formId}`;
			window.localStorage.removeItem(draftKey);
			console.log("[GDPR] Draft cleared for form:", formId);
		} catch (error) {
			console.error("[GDPR] Failed to clear draft:", error);
		}
	}
}
