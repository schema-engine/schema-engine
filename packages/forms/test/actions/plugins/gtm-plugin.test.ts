import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import type { BuilderActionExecutionContext } from '@/types';
import { gtmPlugin, GTMEventActionSchema, type GTMEventAction } from '@/actions/plugins/gtm.plugin';
import { GTMTracker } from '@/tools/gtm-tracker';
import { createMockBuilderContext, setupTestEnvironment } from '../__tools';

type GTMEventActionInput = {
	id: string;
	$type: 'gtm_event';
	enabled?: boolean;
	eventName: string;
	description?: string;
	eventData?: Record<string, any>;
	includeFormData?: boolean | string[];
	triggers?: (
		| 'form_mount'
		| 'form_change'
		| 'form_submit'
		| 'step_change'
		| 'step_submit'
		| 'step_enter'
		| 'step_leave'
		| 'step_view'
	)[];
};

interface GTMEvent {
	event: string;
	timestamp: string;
	[key: string]: any;
}

const mockDataLayer: GTMEvent[] = [];

const originalGTMTracker = GTMTracker;

function createGTMContext(
	action: GTMEventActionInput,
	overrides?: Partial<BuilderActionExecutionContext<GTMEventAction>>,
) {
	const normalizedAction: GTMEventAction = {
		...action,
		enabled: action.enabled ?? true,
		eventData: action.eventData ?? {},
		includeFormData: action.includeFormData ?? false,
	};

	const context = createMockBuilderContext(normalizedAction, {
		formData: {
			name: 'John',
			email: 'john@example.com',
			userType: 'premium',
		},
	});
	context.currentStep = 2;
	context.totalSteps = 3;
	context.metadata = {
		stepStartTime: Date.now(),
		totalFormTime: 5000,
		userInteractions: 10,
	};
	return { ...context, ...overrides };
}

describe('GTMPlugin', () => {
	let originalWindow: any;

	beforeEach(() => {
		setupTestEnvironment();

		originalWindow = globalThis.window;
		globalThis.window = {
			dataLayer: mockDataLayer,
		} as any;

		mockDataLayer.length = 0;

		GTMTracker.push = (event: string, data: Record<string, any> = {}) => {
			mockDataLayer.push({
				event,
				...data,
				timestamp: new Date().toISOString(),
			});
		};

		GTMTracker.isAvailable = () => true;
	});

	afterEach(() => {
		mockDataLayer.length = 0;
		globalThis.window = originalWindow;

		Object.assign(GTMTracker, originalGTMTracker);
	});

	describe('Schema Validation', () => {
		test('should validate valid GTM event action', () => {
			const validAction = {
				id: 'test-gtm',
				$type: 'gtm_event',
				enabled: true,
				eventName: 'form_start',
			};

			expect(GTMEventActionSchema.parse(validAction)).toEqual({
				id: 'test-gtm',
				$type: 'gtm_event',
				enabled: true,
				eventName: 'form_start',
				includeFormData: false,
				eventData: {},
			});
		});

		test('should validate GTM action with all optional fields', () => {
			const fullAction = {
				id: 'test-gtm',
				$type: 'gtm_event',
				description: 'Track form submission',
				enabled: true,
				eventName: 'form_submit',
				eventData: {
					category: 'engagement',
					source: 'newsletter',
				},
				includeFormData: ['email', 'userType'],
				triggers: ['form_submit', 'step_submit'],
			};

			expect(GTMEventActionSchema.parse(fullAction)).toEqual(fullAction);
		});

		test('should reject empty event name', () => {
			const invalidAction = {
				id: 'test-gtm',
				$type: 'gtm_event',
				enabled: true,
				eventName: '',
			};

			expect(() => GTMEventActionSchema.parse(invalidAction)).toThrow('Event name cannot be empty');
		});

		test('should reject invalid type', () => {
			const invalidAction = {
				id: 'test-gtm',
				type: 'invalid_type',
				enabled: true,
				eventName: 'form_start',
			};

			expect(() => GTMEventActionSchema.parse(invalidAction)).toThrow();
		});

		test('should default includeFormData to false', () => {
			const action = {
				id: 'test-gtm',
				$type: 'gtm_event',
				enabled: true,
				eventName: 'form_start',
			};

			const parsed = GTMEventActionSchema.parse(action);
			expect(parsed.includeFormData).toBe(false);
		});

		test('should default eventData to empty object', () => {
			const action = {
				id: 'test-gtm',
				$type: 'gtm_event',
				enabled: true,
				eventName: 'form_start',
			};

			const parsed = GTMEventActionSchema.parse(action);
			expect(parsed.eventData).toEqual({});
		});

		test('should accept boolean includeFormData', () => {
			const action = {
				id: 'test-gtm',
				$type: 'gtm_event',
				enabled: true,
				eventName: 'form_start',
				includeFormData: true,
			};

			const parsed = GTMEventActionSchema.parse(action);
			expect(parsed.includeFormData).toBe(true);
		});

		test('should accept array includeFormData', () => {
			const action = {
				id: 'test-gtm',
				$type: 'gtm_event',
				enabled: true,
				eventName: 'form_start',
				includeFormData: ['name', 'email'],
			};

			const parsed = GTMEventActionSchema.parse(action);
			expect(parsed.includeFormData).toEqual(['name', 'email']);
		});

		test('should reject empty field names in includeFormData array', () => {
			const invalidAction = {
				id: 'test-gtm',
				$type: 'gtm_event',
				enabled: true,
				eventName: 'form_start',
				includeFormData: ['name', ''],
			};

			expect(() => GTMEventActionSchema.parse(invalidAction)).toThrow('Field name cannot be empty');
		});

		test('should validate trigger enum values', () => {
			const validAction = {
				id: 'test-gtm',
				$type: 'gtm_event',
				enabled: true,
				eventName: 'form_mount',
				triggers: ['form_mount', 'step_change'],
			};

			expect(GTMEventActionSchema.parse(validAction).triggers).toEqual(['form_mount', 'step_change']);
			const invalidAction = {
				id: 'test-gtm',
				$type: 'gtm_event',
				enabled: true,
				eventName: 'form_start',
				triggers: ['invalid_trigger'],
			};

			expect(() => GTMEventActionSchema.parse(invalidAction)).toThrow();
		});
	});

	describe('Action Execution', () => {
		test('should execute basic GTM event', async () => {
			const plugin = gtmPlugin();

			const action: GTMEventActionInput = {
				id: 'test-gtm',
				$type: 'gtm_event',
				enabled: true,
				eventName: 'form_start',
			};

			const context = createGTMContext(action);
			const result = await plugin.execute(context);

			expect(result.success).toBe(true);
			expect(result.message).toBe("GTM event 'form_start' pushed successfully");
			expect(result.shouldContinue).toBe(true);

			expect(mockDataLayer).toHaveLength(1);
			expect(mockDataLayer[0].event).toBe('form_start');
			expect(mockDataLayer[0].form_id).toBe('test-form');
			expect(mockDataLayer[0].current_step).toBe(2);
			expect(mockDataLayer[0].total_steps).toBe(3);
		});

		test('should include static event data', async () => {
			const plugin = gtmPlugin();
			const action: GTMEventActionInput = {
				id: 'test-gtm',
				$type: 'gtm_event',
				enabled: true,
				eventName: 'form_submit',
				eventData: {
					category: 'engagement',
					source: 'newsletter',
					value: 100,
				},
			};

			await plugin.execute(createGTMContext(action));

			expect(mockDataLayer).toHaveLength(1);
			const pushedEvent = mockDataLayer[0];
			expect(pushedEvent.category).toBe('engagement');
			expect(pushedEvent.source).toBe('newsletter');
			expect(pushedEvent.value).toBe(100);
		});

		test('should include all form data when includeFormData is true', async () => {
			const plugin = gtmPlugin();
			const action: GTMEventActionInput = {
				id: 'test-gtm',
				$type: 'gtm_event',
				enabled: true,
				eventName: 'form_submit',
				includeFormData: true,
			};

			await plugin.execute(createGTMContext(action));

			expect(mockDataLayer).toHaveLength(1);
			const pushedEvent = mockDataLayer[0];
			expect(pushedEvent.form_data).toEqual({
				name: 'John',
				email: 'john@example.com',
				userType: 'premium',
			});
		});

		test('should include specific form fields when includeFormData is array', async () => {
			const plugin = gtmPlugin();
			const action: GTMEventActionInput = {
				id: 'test-gtm',
				$type: 'gtm_event',
				enabled: true,
				eventName: 'form_submit',
				includeFormData: ['email', 'userType'],
			};

			await plugin.execute(createGTMContext(action));

			expect(mockDataLayer).toHaveLength(1);
			const pushedEvent = mockDataLayer[0];
			expect(pushedEvent.form_data).toEqual({
				email: 'john@example.com',
				userType: 'premium',
			});
		});

		test('should exclude non-existent fields from specific inclusion', async () => {
			const plugin = gtmPlugin();
			const action: GTMEventActionInput = {
				id: 'test-gtm',
				$type: 'gtm_event',
				enabled: true,
				eventName: 'form_submit',
				includeFormData: ['email', 'nonExistentField', 'userType'],
			};

			await plugin.execute(createGTMContext(action));

			expect(mockDataLayer).toHaveLength(1);
			const pushedEvent = mockDataLayer[0];
			expect(pushedEvent.form_data).toEqual({
				email: 'john@example.com',
				userType: 'premium',
			});
		});

		test('should not include form data when includeFormData is false', async () => {
			const plugin = gtmPlugin();
			const action: GTMEventActionInput = {
				id: 'test-gtm',
				$type: 'gtm_event',
				enabled: true,
				eventName: 'form_start',
				includeFormData: false,
			};

			await plugin.execute(createGTMContext(action));

			expect(mockDataLayer).toHaveLength(1);
			const pushedEvent = mockDataLayer[0];
			expect(pushedEvent.form_data).toBeUndefined();
		});

		test('should include context metadata', async () => {
			const plugin = gtmPlugin();
			const action: GTMEventActionInput = {
				id: 'test-gtm',
				$type: 'gtm_event',
				enabled: true,
				eventName: 'step_change',
			};

			const context = createGTMContext(action);
			await plugin.execute(context);

			expect(mockDataLayer).toHaveLength(1);
			const pushedEvent = mockDataLayer[0];
			expect(pushedEvent.stepStartTime).toBe(context.metadata.stepStartTime);
			expect(pushedEvent.totalFormTime).toBe(5000);
			expect(pushedEvent.userInteractions).toBe(10);
		});

		test('should include form validation state', async () => {
			const plugin = gtmPlugin();
			const action: GTMEventActionInput = {
				id: 'test-gtm',
				$type: 'gtm_event',
				enabled: true,
				eventName: 'form_error',
			};

			const invalidContext = createGTMContext(action, {
				isValid: false,
				errors: { name: 'Name is required' } as any,
			});

			await plugin.execute(invalidContext);

			expect(mockDataLayer).toHaveLength(1);
			const pushedEvent = mockDataLayer[0];
			expect(pushedEvent.is_valid).toBe(false);
		});

		test('should handle GTM tracker errors', async () => {
			GTMTracker.push = () => {
				throw new Error('GTM push failed');
			};

			const plugin = gtmPlugin();
			const action: GTMEventActionInput = {
				id: 'test-gtm',
				$type: 'gtm_event',
				enabled: true,
				eventName: 'form_start',
			};

			const result = await plugin.execute(createGTMContext(action));

			expect(result.success).toBe(false);
			expect(result.error).toBe('GTM push failed');
			expect(result.shouldContinue).toBe(true);
		});

		test('should handle non-Error exceptions', async () => {
			GTMTracker.push = () => {
				throw 'String error';
			};

			const plugin = gtmPlugin();
			const action: GTMEventActionInput = {
				id: 'test-gtm',
				$type: 'gtm_event',
				enabled: true,
				eventName: 'form_start',
			};

			const result = await plugin.execute(createGTMContext(action));

			expect(result.success).toBe(false);
			expect(result.error).toBe('GTM event push failed');
			expect(result.shouldContinue).toBe(true);
		});
	});

	describe('Complex Event Scenarios', () => {
		test('should handle multi-step form progress tracking', async () => {
			const plugin = gtmPlugin();
			const stepActions: GTMEventActionInput[] = [
				{
					id: 'step-1-enter',
					$type: 'gtm_event',
					enabled: true,
					eventName: 'step_enter',
					eventData: { step_name: 'personal_info' },
				},
				{
					id: 'step-1-complete',
					$type: 'gtm_event',
					enabled: true,
					eventName: 'step_complete',
					eventData: { step_name: 'personal_info' },
					includeFormData: ['name', 'email'],
				},
				{
					id: 'step-2-enter',
					$type: 'gtm_event',
					enabled: true,
					eventName: 'step_enter',
					eventData: { step_name: 'preferences' },
				},
			];

			for (const action of stepActions) {
				await plugin.execute(createGTMContext(action));
			}

			expect(mockDataLayer).toHaveLength(3);

			expect(mockDataLayer[0].event).toBe('step_enter');
			expect(mockDataLayer[0].step_name).toBe('personal_info');

			expect(mockDataLayer[1].event).toBe('step_complete');
			expect(mockDataLayer[1].form_data).toEqual({
				name: 'John',
				email: 'john@example.com',
			});

			expect(mockDataLayer[2].event).toBe('step_enter');
			expect(mockDataLayer[2].step_name).toBe('preferences');
		});

		test('should handle conversion tracking with complete user journey', async () => {
			const plugin = gtmPlugin();
			const formData = {
				name: 'John',
				email: 'john@example.com',
				userType: 'premium',
			};
			const conversionActions: GTMEventActionInput[] = [
				{
					id: 'form-start',
					$type: 'gtm_event',
					enabled: true,
					eventName: 'form_start',
					eventData: {
						form_type: 'lead_gen',
						campaign: 'q4_promo',
					},
				},
				{
					id: 'form-progress',
					$type: 'gtm_event',
					enabled: true,
					eventName: 'form_progress',
					eventData: {
						progress_percent: 66,
					},
					includeFormData: ['userType'],
				},
				{
					id: 'form-conversion',
					$type: 'gtm_event',
					enabled: true,
					eventName: 'conversion',
					eventData: {
						value: 25.0,
						currency: 'USD',
						conversion_label: 'lead_signup',
					},
					includeFormData: true,
				},
			];

			for (const action of conversionActions) {
				await plugin.execute(createGTMContext(action));
			}

			expect(mockDataLayer).toHaveLength(3);

			expect(mockDataLayer[0].event).toBe('form_start');
			expect(mockDataLayer[0].form_type).toBe('lead_gen');
			expect(mockDataLayer[0].campaign).toBe('q4_promo');

			expect(mockDataLayer[1].event).toBe('form_progress');
			expect(mockDataLayer[1].progress_percent).toBe(66);
			expect(mockDataLayer[1].form_data).toEqual({ userType: 'premium' });

			expect(mockDataLayer[2].event).toBe('conversion');
			expect(mockDataLayer[2].value).toBe(25.0);
			expect(mockDataLayer[2].currency).toBe('USD');
			expect(mockDataLayer[2].form_data).toEqual(formData);
		});
	});

	describe('Integration', () => {
		test('should register GTM plugin and execute successfully', async () => {
			const plugin = gtmPlugin();
			expect(plugin.$type).toBe('gtm_event');

			const action: GTMEventActionInput = {
				id: 'integration-test',
				$type: 'gtm_event',
				enabled: true,
				eventName: 'integration_test',
			};

			const context = createGTMContext(action);
			const result = await plugin.execute(context);

			expect(result.success).toBe(true);
			expect(mockDataLayer).toHaveLength(1);
			expect(mockDataLayer[0].event).toBe('integration_test');
		});

		test('should work with different GTM environments', async () => {
			const plugin = gtmPlugin();
			const originalConsoleLog = console.log;
			const consoleMessages: string[] = [];

			console.log = (...args: any[]) => {
				consoleMessages.push(args.join(' '));
			};

			// Remove window to simulate SSR
			globalThis.window = undefined as any;

			// Mock GTMTracker for SSR
			GTMTracker.push = (event: string, data: Record<string, any> = {}) => {
				console.log('[GTM] Server-side event (not sent):', event, data);
			};

			const action: GTMEventActionInput = {
				id: 'ssr-test',
				$type: 'gtm_event',
				enabled: true,
				eventName: 'ssr_event',
			};

			const context = createGTMContext(action);
			const result = await plugin.execute(context);

			expect(result.success).toBe(true);
			expect(consoleMessages.some((msg) => msg.includes('Server-side event'))).toBe(true);

			console.log = originalConsoleLog;
		});

		test('should handle missing dataLayer gracefully', async () => {
			const plugin = gtmPlugin();
			globalThis.window = {} as any;

			const originalPush = GTMTracker.push.bind(GTMTracker);
			let pushCalled = false;

			GTMTracker.push = (event: string, data: Record<string, any> = {}) => {
				pushCalled = true;
				if (!(globalThis.window as any).dataLayer) {
					(globalThis.window as any).dataLayer = [];
				}
				(globalThis.window as any).dataLayer.push({
					event,
					...data,
					timestamp: new Date().toISOString(),
				});
			};
			const action: GTMEventActionInput = {
				id: 'no-datalayer-test',
				$type: 'gtm_event',
				enabled: true,
				eventName: 'test_event',
			};

			const context = createGTMContext(action);
			const result = await plugin.execute(context);

			expect(result.success).toBe(true);
			expect(pushCalled).toBe(true);

			GTMTracker.push = originalPush;
		});
	});
});
