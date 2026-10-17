import { describe, expect, test } from 'vitest';
import { createBrowserActionRegistrations } from '@/browser/action-registrations';
import { createGDPRConsent } from '@/browser/tools/gdpr-consent';
import { createLocalStorageAutoSaveStorage } from '@/browser/tools/auto-save-storage';
import { getAutoSaveDraftStorageKey } from '@/actions/plugins/auto-save.plugin';
import { createMockBuilderContext, MockLocalStorage } from '../actions/__tools';

describe('browser action registrations', () => {
	test('auto-save stores one shared draft key only with consent and revocation clears it', async () => {
		const localStorage = new MockLocalStorage();
		const consent = createGDPRConsent(localStorage);
		const storage = createLocalStorageAutoSaveStorage(localStorage);
		const registrations = createBrowserActionRegistrations({ storage, consent });
		const action = { id: 'save', $type: 'auto_save' as const, enabled: true };
		const context = createMockBuilderContext(action, { formData: { email: 'ada@example.com' } });
		const draftKey = getAutoSaveDraftStorageKey(context.formId);

		await registrations.AutoSaveActionRegistration.execute(context);
		expect(localStorage.getItem(draftKey)).toBeNull();

		consent.grantConsent();
		const saveResult = await registrations.AutoSaveActionRegistration.execute(context);
		expect(saveResult.success).toBe(true);
		expect(JSON.parse(localStorage.getItem(draftKey) ?? 'null')).toEqual({ email: 'ada@example.com' });

		consent.revokeConsent();
		expect(localStorage.getItem(draftKey)).toBeNull();
		expect(consent.hasConsent()).toBe(false);
	});

	test('consent revocation clears drafts saved with a custom action key', async () => {
		const localStorage = new MockLocalStorage();
		const consent = createGDPRConsent(localStorage);
		const storage = createLocalStorageAutoSaveStorage(localStorage);
		const registrations = createBrowserActionRegistrations({ storage, consent });
		const customDraftKey = 'customer-profile-draft';
		const action = {
			id: 'save',
			$type: 'auto_save' as const,
			enabled: true,
			storageKey: customDraftKey,
		};
		const context = createMockBuilderContext(action, { formData: { email: 'ada@example.com' } });

		consent.grantConsent();
		const saveResult = await registrations.AutoSaveActionRegistration.execute(context);
		expect(saveResult.success).toBe(true);
		expect(localStorage.getItem(customDraftKey)).not.toBeNull();

		consent.revokeConsent();
		expect(localStorage.getItem(customDraftKey)).toBeNull();
		expect(localStorage.length).toBe(0);
	});

	test('consent revocation clears drafts saved through the consent tool without scanning storage', () => {
		const entries = new Map<string, string>();
		const consent = createGDPRConsent({
			getItem: (key) => entries.get(key) ?? null,
			setItem: (key, value) => void entries.set(key, value),
			removeItem: (key) => void entries.delete(key),
		});

		consent.grantConsent();
		expect(consent.saveDraft('contact', { email: 'ada@example.com' })).toBe(true);
		expect(consent.loadDraft('contact')).toEqual({ email: 'ada@example.com' });

		consent.revokeConsent();
		expect(entries.size).toBe(0);
	});

	test('reset removes the draft written by the auto-save registration', async () => {
		const localStorage = new MockLocalStorage();
		const consent = createGDPRConsent(localStorage);
		const storage = createLocalStorageAutoSaveStorage(localStorage);
		const registrations = createBrowserActionRegistrations({ storage, consent, confirm: () => true });
		const saveAction = { id: 'save', $type: 'auto_save' as const, enabled: true };
		const resetAction = { id: 'reset', $type: 'reset' as const, enabled: true, resetToDefaults: true };
		const context = createMockBuilderContext(saveAction, { formData: { email: 'ada@example.com' } });
		const draftKey = getAutoSaveDraftStorageKey(context.formId);

		consent.grantConsent();
		await registrations.AutoSaveActionRegistration.execute(context);
		expect(localStorage.getItem(draftKey)).not.toBeNull();

		const resetContext = createMockBuilderContext(resetAction, { formData: context.formData });
		const resetResult = await registrations.ResetActionRegistration.execute(resetContext);
		expect(resetResult.success).toBe(true);
		expect(localStorage.getItem(draftKey)).toBeNull();
	});
});
