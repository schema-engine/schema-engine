import { z } from 'zod';
import type { BuilderActionExecutionContext, BuilderActionRegistration } from '@/types';
import { asStandardSchema } from '@/lib/standard-schema';
import { FormActionTriggerSchema } from '../triggers';

/**
 * Form Submit Plugin Configuration
 */
export interface FormSubmitPluginConfig {
	/** Custom request adapter (fetch, axios, etc.) */
	request?: (url: string, options: any) => Promise<Response>;
	/** Transform data before sending */
	transformData?: (data: any, context: BuilderActionExecutionContext<any>) => any;
	/** Handle successful response */
	onSuccess?: (data: any, context: BuilderActionExecutionContext<any>) => void;
	/** Handle error response */
	onError?: (error: Error, context: BuilderActionExecutionContext<any>) => void;
}

/**
 * Submit Action Schema
 *
 * Handles form submission with configurable request handling and lifecycle management.
 * Configure behavior using the submitPlugin() factory function.
 *
 * @example Basic HTTP Submit
 * ```typescript
 * submitPlugin({
 *   onSuccess: (data, context) => console.log("Submitted:", data),
 *   onError: (error, context) => console.error("Submit failed:", error)
 * });
 *
 * // Usage in form config
 * {
 *   id: "submit-form",
 *   $type: "submit",
 *   endpoint: "/api/forms",  // Relative path
 *   method: "POST"
 * }
 * ```
 *
 * @example Custom Request with Full URL
 * ```typescript
 * submitPlugin({
 *   request: (url, options) => axios.post(url, options.body),
 *   onSuccess: (data, context) => analytics.track("form_submitted")
 * });
 *
 * // Usage in form config
 * {
 *   id: "submit-form",
 *   $type: "submit",
 *   endpoint: "https://api.example.com/submit",  // Full URL
 *   method: "POST"
 * }
 * ```
 * });
 * ```
 *
 * @example Custom Request Adapter
 * ```typescript
 * submitPlugin({
 *   request: (url, options) => axios.post(url, options.body, {
 *     headers: options.headers
 *   }),
 *   transformData: (data, context) => ({
 *     ...data,
 *     timestamp: new Date().toISOString(),
 *     formId: context.formId
 *   })
 * });
 * ```
 */
export const FormSubmitActionSchema = z.object({
	/** Unique identifier for this action within the form */
	id: z.string().min(1, 'Action ID cannot be empty'),
	/** Action type identifier */
	$type: z.literal('submit'),
	/** Optional description for documentation and debugging purposes */
	description: z.string().optional(),
	/** Whether this action is enabled and should be executed */
	enabled: z.boolean().default(true),
	/** Custom triggers that override the default triggers for this action */
	triggers: z.array(FormActionTriggerSchema).optional(),
	/** Target URL for form submission (supports both full URLs and relative paths) */
	endpoint: z.string().min(1, 'Endpoint cannot be empty'),
	/** HTTP method for the request */
	method: z.enum(['POST', 'PUT', 'PATCH']).default('POST'),
	/** Message to show on successful submission */
	successMessage: z.string().optional(),
	/** Message to show on submission failure */
	errorMessage: z.string().optional(),
	/** URL to redirect to after successful submission (supports both full URLs and relative paths) */
	redirectUrl: z.string().min(1, 'Redirect URL cannot be empty').optional(),
});

export type FormSubmitAction = z.infer<typeof FormSubmitActionSchema>;

/**
 * Submit Plugin Factory
 *
 * Returns a configured action registration object for form submission.
 * Use with the FormComposer pattern.
 *
 * @example Basic Usage
 * ```typescript
 * import { FormComposer, submitPlugin } from '@schema-engine/forms';
 *
 * const engine = new FormComposer()
 *   .addElement(InputElement)
 *   .addAction(submitPlugin({
 *     onSuccess: (data, context) => {
 *       console.log("Form submitted successfully:", data);
 *     },
 *     onError: (error, context) => {
 *       console.error("Submit failed:", error);
 *     }
 *   }))
 *   .build();
 * ```
 *
 * @example Axios Integration
 * ```typescript
 * import axios from 'axios';
 *
 * const apiSubmit = submitPlugin({
 *   request: async (url, options) => {
 *     const response = await axios({
 *       method: options.method,
 *       url,
 *       data: JSON.parse(options.body),
 *       headers: options.headers
 *     });
 *     return {
 *       ok: response.status < 400,
 *       status: response.status,
 *       statusText: response.statusText,
 *       json: async () => response.data
 *     } as Response;
 *   },
 *   transformData: (data, context) => ({
 *     ...data,
 *     metadata: {
 *       formId: context.formId,
 *       timestamp: new Date().toISOString(),
 *       userAgent: navigator.userAgent
 *     }
 *   }),
 *   onSuccess: (data, context) => {
 *     toast.success("Form submitted successfully!");
 *     analytics.track("form_submitted", { formId: context.formId });
 *   }
 * });
 * ```
 *
 * @example Error Handling
 * ```typescript
 * const errorAwareSubmit = submitPlugin({
 *   onError: (error, context) => {
 *     console.error("Submit failed:", error);
 *     Sentry.captureException(error, {
 *       contexts: { form: context }
 *     });
 *   }
 * });
 * ```
 */
export function formSubmitPlugin(
	config: FormSubmitPluginConfig = {},
): BuilderActionRegistration<'submit', FormSubmitAction> {
	const { request = fetch, transformData = (data) => data, onSuccess = () => {}, onError = () => {} } = config;

	const handler = async (context: BuilderActionExecutionContext<FormSubmitAction>) => {
		const action = context.config;

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
						console.warn('Failed to parse JSON error response:', parseError);
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
		schema: asStandardSchema(FormSubmitActionSchema),
		metadata: {
			name: 'Submit Form',
			description: 'Submit form data to an endpoint',
			icon: 'send',
			defaultTriggers: ['form_submit'],
		},
		execute: handler,
	};
}
