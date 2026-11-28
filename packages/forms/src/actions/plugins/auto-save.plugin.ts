import * as z from 'zod/mini';
import type { BuilderActionRuntimeContext, BuilderActionRegistration, BuilderActionConfig } from '../../types/index.js';

/**
 * Storage Interface for Auto-Save Plugin
 */
export interface AutoSaveStorage {
	/** Save form data to storage */
	save: (key: string, data: unknown) => Promise<void> | void;
	/** Load form data from storage, synchronously or as a promise. */
	load: (key: string) => unknown;
	/** Remove form data from storage */
	remove: (key: string) => Promise<void> | void;
}

/**
 * Auto-Save Plugin Configuration
 */
export interface AutoSavePluginConfig {
	/** Custom storage implementation */
	storage: AutoSaveStorage;
	/** Checks whether saving is currently allowed, for example by a consent tool. */
	shouldSave?: () => boolean | Promise<boolean>;
	/** Called when auto-save succeeds */
	onSave?: (data: unknown, context: BuilderActionRuntimeContext<AutoSaveAction>) => void | Promise<void>;
	/** Called when auto-save fails */
	onError?: (error: string, context: BuilderActionRuntimeContext<AutoSaveAction>) => void | Promise<void>;
	/** Custom storage key generator */
	getStorageKey?: (context: BuilderActionRuntimeContext<AutoSaveAction>) => string;
}

/** Schema for the `auto_save` action configuration. */
export const AutoSaveActionSchema = z.object({
	/** Optional description for documentation and debugging purposes */
	description: z.optional(z.string()),
	/** Storage key to use (will use generated key if not provided) */
	storageKey: z.optional(z.string()),
	/** Whether to include sensitive fields in auto-save */
	includeSensitive: z.optional(z._default(z.boolean(), false)),
});

export type AutoSaveAction = BuilderActionConfig<'auto_save', typeof AutoSaveActionSchema>;

const autoSaveDraftKeyPrefix = 'autosave_';

/** Builds the default storage key shared by auto-save and reset actions. */
export function getAutoSaveDraftStorageKey(formId: string): string {
	return `${autoSaveDraftKeyPrefix}${formId}`;
}

/** Creates a configured `auto_save` action registration. */
export function autoSavePlugin(
	config: AutoSavePluginConfig,
): BuilderActionRegistration<'auto_save', typeof AutoSaveActionSchema> {
	const { storage } = config;

	const handler = async (context: BuilderActionRuntimeContext<AutoSaveAction>) => {
		const action = context.config;
		try {
			if (config.shouldSave && !(await config.shouldSave())) {
				return {
					success: true,
					message: 'Auto-save skipped because permission was not granted',
					shouldContinue: true,
				};
			}

			const storageKey =
				action.storageKey || config.getStorageKey?.(context) || getAutoSaveDraftStorageKey(context.formId);

			const formData = context.formData;

			if (!formData || Object.keys(formData).length === 0) {
				return {
					success: false,
					error: 'No form data available for auto-save',
					shouldContinue: true,
				};
			}

			let dataToSave = formData;
			if (!action.includeSensitive) {
				dataToSave = Object.fromEntries(
					Object.entries(formData).filter(
						([key]) =>
							!key.toLowerCase().includes('password') &&
							!key.toLowerCase().includes('secret') &&
							!key.toLowerCase().includes('token'),
					),
				);
			}

			await storage.save(storageKey, dataToSave);

			if (config.onSave) {
				await config.onSave(dataToSave, context);
			}

			return {
				success: true,
				message: `Form data auto-saved to ${storageKey}`,
				shouldContinue: true,
			};
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : 'Failed to auto-save';

			if (config.onError) {
				await config.onError(errorMessage, context);
			}

			return {
				success: false,
				error: errorMessage,
				shouldContinue: true,
			};
		}
	};

	return {
		$type: 'auto_save',
		schema: AutoSaveActionSchema,
		metadata: {
			name: 'Auto Save',
			description: 'Automatically save form data to storage',
			icon: 'save',
			defaultTriggers: ['form_change'],
		},
		execute: handler,
	};
}
