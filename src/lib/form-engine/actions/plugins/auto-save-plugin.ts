import { z } from "zod";
import type { ActionExecutionContext, ActionExecutionResult } from "../types";

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
	onSave?: (data: unknown, context: ActionExecutionContext) => void | Promise<void>;
	/** Called when auto-save fails */
	onError?: (error: string, context: ActionExecutionContext) => void | Promise<void>;
	/** Custom storage key generator */
	getStorageKey?: (context: ActionExecutionContext) => string;
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
	id: z.string().min(1, "Action ID cannot be empty"),
	/** Action type identifier */
	type: z.literal("auto_save"),
	/** Optional description for documentation and debugging purposes */
	description: z.string().optional(),
	/** Whether this action is enabled and should be executed */
	enabled: z.boolean().default(true),
	/** Custom triggers that override the default triggers for this action */
	triggers: z.array(z.string()).optional(),
	/** Storage key to use (will use generated key if not provided) */
	storageKey: z.string().optional(),
	/** Whether to include sensitive fields in auto-save */
	includeSensitive: z.boolean().default(false),
});

export type AutoSaveAction = z.infer<typeof AutoSaveActionSchema>;

// Module augmentation to add auto-save action to PluginActions
declare module "../types" {
	interface PluginActions {
		auto_save: AutoSaveAction;
	}
}

// Default localStorage storage implementation
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
 * import { autoSavePlugin } from "@/lib/form-engine/actions/plugins";
 * import { registerAction } from "@/lib/form-engine/actions/action-registry";
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
export function autoSavePlugin(config: AutoSavePluginConfig = {}) {
	const storage = config.storage || defaultStorage;

	return {
		type: "auto_save" as const,
		schema: AutoSaveActionSchema,
		defaultTriggers: ["form_change"] as const,
		handler: async (
			action: AutoSaveAction,
			context: ActionExecutionContext
		): Promise<ActionExecutionResult> => {
			try {
				// Get storage key
				const storageKey =
					action.storageKey || config.getStorageKey?.(context) || `autosave_${context.formId}`;

				// Get form data
				const formData = context.formData;

				if (!formData || Object.keys(formData).length === 0) {
					return {
						success: false,
						error: "No form data available for auto-save",
						shouldContinue: true,
					};
				}

				// Filter sensitive fields if needed
				let dataToSave = formData;
				if (!action.includeSensitive) {
					// This is a simple implementation - you might want more sophisticated filtering
					dataToSave = Object.fromEntries(
						Object.entries(formData).filter(
							([key]) =>
								!key.toLowerCase().includes("password") &&
								!key.toLowerCase().includes("secret") &&
								!key.toLowerCase().includes("token")
						)
					);
				}

				// Save to storage
				await storage.save(storageKey, dataToSave);

				// Call success handler
				if (config.onSave) {
					await config.onSave(dataToSave, context);
				}

				return {
					success: true,
					message: `Form data auto-saved to ${storageKey}`,
					shouldContinue: true,
				};
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : "Failed to auto-save";

				// Call error handler
				if (config.onError) {
					await config.onError(errorMessage, context);
				}

				return {
					success: false,
					error: errorMessage,
					shouldContinue: true,
				};
			}
		},
	};
}
