import { autoSavePlugin, AutoSaveActionSchema, type AutoSaveStorage } from '../actions/plugins/auto-save.plugin.js';
import { formResetPlugin, FormResetActionSchema } from '../actions/plugins/form-reset.plugin.js';
import { gtmPlugin, GTMEventActionSchema } from '../actions/plugins/gtm.plugin.js';
import { logger } from '../lib/logger.js';
import type { BuilderActionRegistration } from '../types/index.js';
import { GDPRConsent, type GDPRConsentTool } from './tools/gdpr-consent.js';
import { GTMTracker } from './tools/gtm-tracker.js';
import { localStorageAutoSaveStorage } from './tools/auto-save-storage.js';

export interface BrowserActionRegistrationsOptions {
	storage?: AutoSaveStorage;
	consent?: Pick<GDPRConsentTool, 'hasConsent'>;
	confirm?: (message: string) => boolean | Promise<boolean>;
}

/**
 * Creates browser-oriented action registrations with injectable browser ports.
 *
 * @remarks Auto-save is consent-gated by default. Supplying a consent tool lets
 * tests and hosts use an isolated consent store.
 */
export function createBrowserActionRegistrations({
	storage = localStorageAutoSaveStorage,
	consent = GDPRConsent,
	confirm = (message) => window.confirm(message),
}: BrowserActionRegistrationsOptions = {}) {
	const AutoSaveActionRegistration: BuilderActionRegistration<'auto_save', typeof AutoSaveActionSchema> =
		autoSavePlugin({
			storage,
			shouldSave: () => consent.hasConsent(),
			onSave: (data, context) => {
				logger.info('Form data saved', { data, formId: context.formId });
			},
			onError: (error, context) => {
				logger.error('Failed to save form data', { formId: context.formId, error });
			},
		});

	const ResetActionRegistration: BuilderActionRegistration<'reset', typeof FormResetActionSchema> = formResetPlugin({
		storage,
		confirm,
		onReset: (context) => {
			logger.info('Form reset completed', { formId: context.formId });
		},
	});

	const GTMActionRegistration: BuilderActionRegistration<'gtm_event', typeof GTMEventActionSchema> = gtmPlugin({
		tracker: {
			push: (eventName, eventData) => GTMTracker.push(eventName, eventData),
		},
		onPush: (eventName, eventData, context) => {
			logger.info('Pushed GTM event', { eventName, formId: context.formId, eventData });
		},
		onError: (error, context) => {
			logger.error('Failed to push GTM event', { formId: context.formId, error });
		},
	});

	return { AutoSaveActionRegistration, ResetActionRegistration, GTMActionRegistration };
}

const browserActionRegistrations = createBrowserActionRegistrations();

export const { AutoSaveActionRegistration, ResetActionRegistration, GTMActionRegistration } =
	browserActionRegistrations;
