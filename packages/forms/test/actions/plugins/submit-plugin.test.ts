import { test, expect, describe, beforeEach, afterEach } from 'bun:test';
import { formSubmitPlugin, FormSubmitActionSchema, type FormSubmitAction } from '@/actions/plugins/form-submit.plugin';
import { createMockBuilderContext, setupTestEnvironment, createMockFetch, createFailingMockFetch } from '../__tools';
import { asStandardSchema } from '@/lib/standard-schema';

describe('SubmitPlugin', () => {
	let originalFetch: typeof fetch;

	beforeEach(() => {
		setupTestEnvironment();
		originalFetch = global.fetch;
		global.fetch = createMockFetch({
			'/api/submit': { ok: true, data: { success: true, id: '123' } },
		});
	});

	afterEach(() => {
		global.fetch = originalFetch;
	});

	describe('Schema Validation', () => {
		test('should validate valid submit action', () => {
			const validAction: FormSubmitAction = {
				id: 'submit-form',
				$type: 'submit',
				enabled: true,
				endpoint: '/api/submit',
				method: 'POST',
			};

			const result = FormSubmitActionSchema.parse(validAction);
			expect(result).toEqual(validAction);
		});

		test('should validate submit action with all optional fields', () => {
			const fullAction: FormSubmitAction = {
				id: 'submit-form',
				$type: 'submit',
				description: 'Submit the form data',
				enabled: true,
				triggers: ['form_submit'],
				endpoint: 'https://api.example.com/submit',
				method: 'PUT',
				successMessage: 'Form submitted successfully!',
				errorMessage: 'Failed to submit form',
				redirectUrl: '/success',
			};

			const result = FormSubmitActionSchema.parse(fullAction);
			expect(result).toEqual(fullAction);
		});

		test('should reject invalid endpoint', () => {
			const invalidAction = {
				id: 'submit-form',
				$type: 'submit',
				enabled: true,
				endpoint: '', // Empty endpoint
				method: 'POST',
			};

			expect(() => FormSubmitActionSchema.parse(invalidAction)).toThrow('Endpoint cannot be empty');
		});

		test('should reject invalid method', () => {
			const invalidAction = {
				id: 'submit-form',
				$type: 'submit',
				enabled: true,
				endpoint: '/api/submit',
				method: 'DELETE', // Invalid method
			};

			expect(() => FormSubmitActionSchema.parse(invalidAction)).toThrow();
		});

		test('should default method to POST', () => {
			const action = {
				id: 'submit-form',
				$type: 'submit',
				enabled: true,
				endpoint: '/api/submit',
				// No method specified
			};

			const result = FormSubmitActionSchema.parse(action);
			expect(result.method).toBe('POST');
		});
	});

	describe('Plugin Factory', () => {
		test('should create plugin with default configuration', () => {
			const plugin = formSubmitPlugin();

			expect(plugin.$type).toBe('submit');
			expect(plugin.execute).toBeDefined();
			expect(plugin.schema).toBe(asStandardSchema(FormSubmitActionSchema));
			expect(plugin.metadata.defaultTriggers).toEqual(['form_submit']);
		});
	});

	describe('Action Execution', () => {
		test('should execute successful submit action', async () => {
			const plugin = formSubmitPlugin();

			const action: FormSubmitAction = {
				id: 'test-submit',
				$type: 'submit',
				enabled: true,
				endpoint: '/api/submit',
				method: 'POST',
			};

			const context = createMockBuilderContext(action, {
				formData: { name: 'John', email: 'john@example.com' },
			});
			const result = await plugin.execute(context);

			expect(result.success).toBe(true);
			expect(result.message).toContain('Form submitted successfully');
		});

		test('should handle submit failure', async () => {
			global.fetch = createFailingMockFetch();

			const plugin = formSubmitPlugin();

			const action: FormSubmitAction = {
				id: 'test-submit',
				$type: 'submit',
				enabled: true,
				endpoint: '/api/submit',
				method: 'POST',
			};

			const context = createMockBuilderContext(action, {
				formData: { name: 'John', email: 'john@example.com' },
			});
			const result = await plugin.execute(context);

			expect(result.success).toBe(false);
			expect(result.error).toBeDefined();
		});

		test('should call custom success handler', async () => {
			let successData: any = null;
			let successContext: any = null;

			const plugin = formSubmitPlugin({
				onSuccess: (data, context) => {
					successData = data;
					successContext = context;
				},
			});

			const action: FormSubmitAction = {
				id: 'test-submit',
				$type: 'submit',
				enabled: true,
				endpoint: '/api/submit',
				method: 'POST',
			};

			const context = createMockBuilderContext(action, {
				formData: { name: 'John', email: 'john@example.com' },
			});
			await plugin.execute(context);

			expect(successData).toEqual({ success: true, id: '123' });
			expect(successContext).not.toBeNull();
		});

		test('should call custom error handler', async () => {
			global.fetch = createFailingMockFetch();

			let errorData: any = null;
			let errorContext: any = null;

			const plugin = formSubmitPlugin({
				onError: (error, context) => {
					errorData = error;
					errorContext = context;
				},
			});

			const action: FormSubmitAction = {
				id: 'test-submit',
				$type: 'submit',
				enabled: true,
				endpoint: '/api/submit',
				method: 'POST',
			};

			const context = createMockBuilderContext(action, {
				formData: { name: 'John', email: 'john@example.com' },
			});
			await plugin.execute(context);

			expect(errorData).toBeDefined();
			expect(errorContext).not.toBeNull();
		});

		test('should transform data before sending', async () => {
			let requestBody: FormData | null = null;

			(global.fetch as any) = async (url: string, options: any) => {
				requestBody = options.body;
				const mockFetch = createMockFetch({
					[url]: { ok: true, data: { success: true, id: '123' } },
				});
				return mockFetch(url, options);
			};

			const plugin = formSubmitPlugin({
				transformData: (data, context) => ({
					...data,
					timestamp: '2024-01-01T00:00:00Z',
					formId: context.formId,
				}),
			});

			const action: FormSubmitAction = {
				id: 'test-submit',
				$type: 'submit',
				enabled: true,
				endpoint: '/api/submit',
				method: 'POST',
			};

			const context = createMockBuilderContext(action, {
				formData: { name: 'John', email: 'john@example.com' },
			});
			await plugin.execute(context);

			expect(requestBody).toBeInstanceOf(FormData);
			expect(requestBody!.get('name')).toBe('John');
			expect(requestBody!.get('email')).toBe('john@example.com');
			expect(requestBody!.get('timestamp')).toBe('2024-01-01T00:00:00Z');
			expect(requestBody!.get('formId')).toBe('test-form');
			expect(JSON.parse(requestBody!.get('metadata') as string)).toEqual({
				stepStartTime: expect.any(Number),
				totalFormTime: 1000,
				userInteractions: 5,
			});
		});

		test('should use custom request adapter', async () => {
			let customRequestCalled = false;
			let requestUrl: string | null = null;
			let requestOptions: any = null;

			const plugin = formSubmitPlugin({
				request: async (url, options) => {
					customRequestCalled = true;
					requestUrl = url;
					requestOptions = options;
					const mockFetch = createMockFetch({
						[url]: { ok: true, data: { success: true, id: '123' } },
					});
					return mockFetch(url, options);
				},
			});

			const action: FormSubmitAction = {
				id: 'test-submit',
				$type: 'submit',
				enabled: true,
				endpoint: '/api/custom',
				method: 'PUT',
			};

			const context = createMockBuilderContext(action, {
				formData: { name: 'John', email: 'john@example.com' },
			});
			await plugin.execute(context);

			expect(customRequestCalled).toBe(true);
			expect(requestUrl).not.toBeNull();
			expect(requestUrl!).toBe('/api/custom');
			expect(requestOptions?.method).toBe('PUT');
		});

		test('should handle full URL endpoints', async () => {
			let requestUrl: string | null = null;

			(global.fetch as any) = async (url: string, options: any) => {
				requestUrl = url;
				const mockFetch = createMockFetch({
					[url]: { ok: true, data: { success: true, id: '123' } },
				});
				return mockFetch(url, options);
			};

			const plugin = formSubmitPlugin();

			const action: FormSubmitAction = {
				id: 'test-submit',
				$type: 'submit',
				enabled: true,
				endpoint: 'https://api.example.com/submit',
				method: 'POST',
			};

			const context = createMockBuilderContext(action, {
				formData: { name: 'John', email: 'john@example.com' },
			});
			await plugin.execute(context);

			expect(requestUrl).not.toBeNull();
			expect(requestUrl!).toBe('https://api.example.com/submit');
		});

		test('should include custom success and error messages', async () => {
			const plugin = formSubmitPlugin();

			const action: FormSubmitAction = {
				id: 'test-submit',
				$type: 'submit',
				enabled: true,
				endpoint: '/api/submit',
				method: 'POST',
				successMessage: 'Custom success message',
				errorMessage: 'Custom error message',
			};

			const context = createMockBuilderContext(action, {
				formData: { name: 'John', email: 'john@example.com' },
			});
			const result = await plugin.execute(context);

			expect(result.success).toBe(true);
			expect(result.message).toBe('Custom success message');
		});

		test('should handle network errors', async () => {
			(global.fetch as any) = async () => {
				throw new Error('Network error');
			};

			const plugin = formSubmitPlugin();

			const action: FormSubmitAction = {
				id: 'test-submit',
				$type: 'submit',
				enabled: true,
				endpoint: '/api/submit',
				method: 'POST',
			};

			const context = createMockBuilderContext(action, {
				formData: { name: 'John', email: 'john@example.com' },
			});
			const result = await plugin.execute(context);

			expect(result.success).toBe(false);
			expect(result.error).toContain('Network error');
		});

		test('should handle File objects in form data', async () => {
			let requestBody: FormData | null = null;

			(global.fetch as any) = async (url: string, options: any) => {
				requestBody = options.body;
				const mockFetch = createMockFetch({
					[url]: { ok: true, data: { success: true, id: '123' } },
				});
				return mockFetch(url, options);
			};

			const plugin = formSubmitPlugin();

			const mockFile = new File(['file content'], 'test.txt', { type: 'text/plain' });

			const action: FormSubmitAction = {
				id: 'test-submit',
				$type: 'submit',
				enabled: true,
				endpoint: '/api/submit',
				method: 'POST',
			};

			const context = createMockBuilderContext(action, {
				formData: {
					name: 'John',
					email: 'john@example.com',
					avatar: mockFile,
				},
			});
			const result = await plugin.execute(context);

			expect(result.success).toBe(true);
			expect(requestBody).toBeInstanceOf(FormData);
			expect(requestBody!.get('name')).toBe('John');
			expect(requestBody!.get('email')).toBe('john@example.com');
			expect(requestBody!.get('avatar')).toBeInstanceOf(File);
			expect((requestBody!.get('avatar') as File).name).toBe('test.txt');
		});

		test('should handle Blob objects in form data', async () => {
			let requestBody: FormData | null = null;

			// @ts-expect-error: Testing in Bun environment
			global.fetch = async (url: string, options: any) => {
				requestBody = options.body;
				const mockFetch = createMockFetch({
					[url]: { ok: true, data: { success: true, id: '123' } },
				});
				return mockFetch(url, options);
			};

			const plugin = formSubmitPlugin();

			const mockBlob = new Blob(['blob content'], { type: 'application/octet-stream' });

			const action: FormSubmitAction = {
				id: 'test-submit',
				$type: 'submit',
				enabled: true,
				endpoint: '/api/submit',
				method: 'POST',
			};

			const context = createMockBuilderContext(action, {
				formData: {
					name: 'John',
					document: mockBlob,
				},
			});
			const result = await plugin.execute(context);

			expect(result.success).toBe(true);
			expect(requestBody).toBeInstanceOf(FormData);
			expect(requestBody!.get('name')).toBe('John');
			expect(requestBody!.get('document')).toBeInstanceOf(Blob);
		});
	});

	describe('Integration', () => {
		test('should register plugin and execute successfully', async () => {
			const plugin = formSubmitPlugin();

			const action: FormSubmitAction = {
				id: 'integration-test',
				$type: 'submit',
				enabled: true,
				endpoint: '/api/integration',
				method: 'POST',
			};

			const context = createMockBuilderContext(action, {
				formData: { name: 'John', email: 'john@example.com' },
			});
			const result = await plugin.execute(context);

			expect(result.success).toBe(true);
		});
	});
});
