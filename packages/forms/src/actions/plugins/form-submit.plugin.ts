import * as z from 'zod/mini';
import type { BuilderActionRuntimeContext, BuilderActionRegistration } from '@/types';
import { logger } from '@/lib/logger';
import { FormActionTriggerSchema } from '../triggers';

/**
 * Form Submit Plugin Configuration
 */
export interface FormSubmitPluginConfig {
	/** Custom request adapter (fetch, axios, etc.) */
	request?: (url: string, options: RequestInit) => Promise<Response>;
	/** Transform data before sending */
	transformData?: (
		data: Record<string, unknown>,
		context: BuilderActionRuntimeContext<FormSubmitAction>,
	) => Record<string, unknown>;
	/** Handle successful response */
	onSuccess?: (data: unknown, context: BuilderActionRuntimeContext<FormSubmitAction>) => void;
	/** Handle error response */
	onError?: (error: Error, context: BuilderActionRuntimeContext<FormSubmitAction>) => void;
}

/** Schema for the `submit` action configuration. */
export const FormSubmitActionSchema = z.object({
	/** Unique identifier for this action within the form */
	id: z.string().check(z.minLength(1, 'Action ID cannot be empty')),
	/** Action type identifier */
	$type: z.literal('submit'),
	/** Optional description for documentation and debugging purposes */
	description: z.optional(z.string()),
	/** Whether this action is enabled and should be executed */
	enabled: z._default(z.boolean(), true),
	/** Custom triggers that override the default triggers for this action */
	triggers: z.optional(z.array(FormActionTriggerSchema)),
	/** Target URL for form submission (supports both full URLs and relative paths) */
	endpoint: z.string().check(z.minLength(1, 'Endpoint cannot be empty')),
	/** HTTP method for the request */
	method: z._default(z.enum(['POST', 'PUT', 'PATCH']), 'POST'),
	/** Message to show on successful submission */
	successMessage: z.optional(z.string()),
	/** Message to show on submission failure */
	errorMessage: z.optional(z.string()),
	/** URL to redirect to after successful submission (supports both full URLs and relative paths) */
	redirectUrl: z.optional(z.string().check(z.minLength(1, 'Redirect URL cannot be empty'))),
});

export type FormSubmitAction = z.infer<typeof FormSubmitActionSchema>;

/** Creates a configured `submit` action registration. */
export function formSubmitPlugin(
	config: FormSubmitPluginConfig = {},
): BuilderActionRegistration<'submit', typeof FormSubmitActionSchema> {
	const { transformData = (data) => data, onSuccess = () => {}, onError = () => {} } = config;

	const handler = async (context: BuilderActionRuntimeContext<FormSubmitAction>) => {
		const action = context.config;
		const request = config.request ?? fetch;

		try {
			const transformedData = transformData(
				{
					...context.formData,
					metadata: context.metadata,
				},
				context,
			);

			const formData = new FormData();

			for (const [key, value] of Object.entries(transformedData)) {
				if (value !== null && value !== undefined) {
					if (value instanceof File || value instanceof Blob) {
						formData.append(key, value);
					} else if (typeof value === 'object') {
						formData.append(key, JSON.stringify(value));
					} else {
						formData.append(key, String(value as string | number | boolean | bigint));
					}
				}
			}
			const requestOptions = {
				method: action.method,
				body: formData,
			};

			const response = await request(action.endpoint, requestOptions);

			if (!response.ok) {
				let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
				const contentType = response.headers.get('content-type');

				if (contentType?.includes('application/json')) {
					try {
						const errorData = await response.json();
						const message = errorData.error || errorData.message;
						if (typeof message === 'string' && message) {
							errorMessage = message;
						}
					} catch (parseError) {
						logger.warn('Failed to parse JSON error response', { error: parseError });
					}
				}
				throw new Error(errorMessage);
			}

			const responseData = await response.json();

			onSuccess(responseData, context);

			return {
				success: true,
				message: action.successMessage || 'Form submitted successfully',
				data: responseData,
				redirectUrl: action.redirectUrl,
				shouldContinue: true,
			};
		} catch (error) {
			const err = error instanceof Error ? error : new Error('Submit failed');

			onError(err, context);

			return {
				success: false,
				error: action.errorMessage || err.message,
				shouldContinue: false,
			};
		}
	};

	return {
		$type: 'submit',
		schema: FormSubmitActionSchema,
		metadata: {
			name: 'Submit Form',
			description: 'Submit form data to an endpoint',
			icon: 'send',
			defaultTriggers: ['form_submit'],
		},
		execute: handler,
	};
}
