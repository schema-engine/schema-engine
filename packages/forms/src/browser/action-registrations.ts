import {
	autoSavePlugin,
	AutoSaveActionSchema,
	type AutoSaveAction,
	type AutoSaveStorage,
} from '../actions/plugins/auto-save.plugin';
import { formResetPlugin, FormResetActionSchema, type FormResetAction } from '../actions/plugins/form-reset.plugin';
import { gtmPlugin, GTMEventActionSchema, type GTMEventAction } from '../actions/plugins/gtm.plugin';
import { logger } from '@/lib/logger';
import type { BuilderActionRegistration } from '@/types';
import { GDPRConsent, type GDPRConsentTool } from './tools/gdpr-consent';
import { GTMTracker } from './tools/gtm-tracker';
import { localStorageAutoSaveStorage } from './tools/auto-save-storage';

declare global {
	namespace FormEngine {
		interface ActionRegistry {
			auto_save: AutoSaveAction;
			reset: FormResetAction;
			gtm_event: GTMEventAction;
		}
	}
}

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
