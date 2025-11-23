import { z } from 'zod';
import type { BuilderActionExecutionContext, BuilderActionRegistration } from '@/types';
import { FormActionTriggerSchema } from '../triggers';

/**
 * Storage Interface for Auto-Save Plugin
 */
export interface AutoSaveStorage {
	/** Save form data to storage */
	save: (key: string, data: unknown) => Promise<void> | void;
	/** Load form data from storage */
	load: (key: string) => Promise<unknown> | unknown;
	/** Remove form data from storage */
	remove: (key: string) => Promise<void> | void;
}

/**
 * Auto-Save Plugin Configuration
 */
export interface AutoSavePluginConfig {
	/** Custom storage implementation */
	storage?: AutoSaveStorage;
	/** Called when auto-save succeeds */
	onSave?: (data: unknown, context: BuilderActionExecutionContext<any>) => void | Promise<void>;
	/** Called when auto-save fails */
	onError?: (error: string, context: BuilderActionExecutionContext<any>) => void | Promise<void>;
	/** Custom storage key generator */
	getStorageKey?: (context: BuilderActionExecutionContext<any>) => string;
}

/**
 * Auto-Save Action Schema
 *
 * Automatically saves form data to storage with configurable storage backend.
 * Configure storage and handlers using the autoSavePlugin() factory function.
 *
 * @example API Storage
 * ```typescript
 * autoSavePlugin({
 *   storage: {
 *     save: async (key, data) => {
 *       await fetch(`/api/auto-save/${key}`, {
 *         method: 'POST',
 *         body: JSON.stringify(data)
 *       });
 *     },
 *     load: async (key) => {
 *       const response = await fetch(`/api/auto-save/${key}`);
 *       return response.json();
 *     }
 *   }
 * });
 * ```
 */
export const AutoSaveActionSchema = z.object({
	/** Unique identifier for this action within the form */
	id: z.string().min(1, 'Action ID cannot be empty'),
	/** Action type identifier */
	$type: z.literal('auto_save'),
	/** Optional description for documentation and debugging purposes */
	description: z.string().optional(),
	/** Whether this action is enabled and should be executed */
	enabled: z.boolean().default(true),
	/** Custom triggers that override the default triggers for this action */
	triggers: z.array(FormActionTriggerSchema).optional(),
	/** Storage key to use (will use generated key if not provided) */
	storageKey: z.string().optional(),
	/** Whether to include sensitive fields in auto-save */
	includeSensitive: z.boolean().default(false).optional(),
});

export type AutoSaveAction = z.infer<typeof AutoSaveActionSchema>;

const defaultStorage: AutoSaveStorage = {
	save: (key: string, data: unknown) => {
		localStorage.setItem(key, JSON.stringify(data));
	},
	load: (key: string) => {
		const stored = localStorage.getItem(key);
		return stored ? JSON.parse(stored) : null;
	},
	remove: (key: string) => {
		localStorage.removeItem(key);
	},
};

/**
 * Auto-Save Plugin Factory
 *
 * Returns a configured action registration object for auto-saving form data.
 *
 * @example Basic LocalStorage Auto-Save
 * ```typescript
 * import { autoSavePlugin } from "@/actions/plugins";
 * import { registerAction } from "@/actions/action-registry";
 *
 * const autoSave = autoSavePlugin({
 *   onSave: (data) => console.log("Auto-saved:", data)
 * });
 *
 * registerAction(autoSave);
 * ```
 *
 * @example API Storage
 * ```typescript
 * const apiAutoSave = autoSavePlugin({
 *   storage: {
 *     save: async (key, data) => {
 *       await fetch(`/api/forms/${key}/auto-save`, {
 *         method: 'POST',
 *         headers: { 'Content-Type': 'application/json' },
 *         body: JSON.stringify(data)
 *       });
 *     },
 *     load: async (key) => {
 *       const response = await fetch(`/api/forms/${key}/auto-save`);
 *       return response.ok ? response.json() : null;
 *     },
 *     remove: async (key) => {
 *       await fetch(`/api/forms/${key}/auto-save`, { method: 'DELETE' });
 *     }
 *   },
 *   onSave: (data, context) => {
 *     console.log(`Auto-saved form ${context.formId} to API`);
 *   }
 * });
 *
 * registerAction(apiAutoSave);
 * ```
 *
 * @example Custom Storage Key
 * ```typescript
 * const userAutoSave = autoSavePlugin({
 *   getStorageKey: (context) => `autosave_${context.formId}_${userId}`,
 *   onSave: (data) => showToast("Draft saved", "success")
 * });
 * ```
 */
export function autoSavePlugin(
	config: AutoSavePluginConfig = {},
): BuilderActionRegistration<'auto_save', AutoSaveAction> {
	const storage = config.storage || defaultStorage;

	const handler = async (context: BuilderActionExecutionContext<AutoSaveAction>) => {
		const action = context.config;
		try {
			const storageKey = action.storageKey || config.getStorageKey?.(context) || `autosave_${context.formId}`;

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
