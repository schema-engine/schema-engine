import type { BuilderActionRuntimeContext } from '@/types/actions';
import type { ActionRuntimeContext } from '@schema-engine/actions';

/**
 * Create a mock builder action execution context with sensible defaults
 */
export function createMockBuilderContext<TConfig = unknown>(
	config: TConfig,
	overrides: Partial<Omit<BuilderActionRuntimeContext<TConfig>, 'config'>> = {},
): BuilderActionRuntimeContext<TConfig> {
	return {
		config,
		formId: 'test-form',
		currentStep: 0,
		totalSteps: 1,
		isValid: true,
		errors: {},
		trigger: 'form_submit',
		signal: new AbortController().signal,
		form: {
			reset: () => {},
			setValue: () => {},
			getValue: () => undefined,
			validate: async () => true,
			checkValidity: async () => true,
		},
		formData: { field1: 'value1' },
		metadata: {
			stepStartTime: Date.now(),
			totalFormTime: 1000,
			userInteractions: 5,
		},
		...overrides,
	};
}

/**
 * Create a mock action execution context with sensible defaults
 */
export function createMockContext(overrides: Partial<ActionRuntimeContext> = {}): ActionRuntimeContext {
	return {
		form: {
			getValues: () => ({ field1: 'value1' }),
			setValue: () => {},
			reset: () => {},
			watch: () => ({}),
			clearErrors: () => {},
			setError: () => {},
			trigger: async () => true,
			formState: {
				isValid: true,
				isSubmitting: false,
				isSubmitSuccessful: false,
				errors: {},
			},
		} as any,
		...overrides,
	} as ActionRuntimeContext;
}

/**
 * Create a simple mock handler that tracks calls
 */
export function createMockHandler<T extends any[]>(): {
	handler: (...args: T) => void;
	calls: T[];
	called: boolean;
	callCount: number;
} {
	const calls: T[] = [];

	return {
		handler: (...args: T) => {
			calls.push(args);
		},
		calls,
		get called() {
			return calls.length > 0;
		},
		get callCount() {
			return calls.length;
		},
	};
}

/**
 * Mock localStorage for testing
 */
export class MockLocalStorage {
	private store: Record<string, string> = {};

	getItem(key: string): string | null {
		return this.store[key] || null;
	}

	setItem(key: string, value: string): void {
		this.store[key] = value;
	}

	removeItem(key: string): void {
		delete this.store[key];
	}

	clear(): void {
		this.store = {};
	}

	get length(): number {
		return Object.keys(this.store).length;
	}

	key(index: number): string | null {
		const keys = Object.keys(this.store);
		return keys[index] || null;
	}

	get data(): Record<string, string> {
		return { ...this.store };
	}
}

/**
 * Set up the test environment by clearing registries and mocking global dependencies
 * Note: No longer needs to clear actionRegistry since actions are now per-engine
 */
export function setupTestEnvironment(): MockLocalStorage {
	// Clear any existing window/global mocks
	delete (global as any).window;

	// Set up localStorage mock
	const mockLocalStorage = new MockLocalStorage();

	// Use Object.defineProperty to override readonly global.localStorage
	Object.defineProperty(global, 'localStorage', {
		value: mockLocalStorage,
		writable: true,
		configurable: true,
	});

	// Set up window mock with localStorage
	(global as any).window = {
		localStorage: mockLocalStorage,
		fetch: global.fetch, // Preserve existing fetch mock if any
		location: {
			href: 'http://localhost:3000',
			origin: 'http://localhost:3000',
		},
	};

	return mockLocalStorage;
}

/**
 * Create a mock fetch function for testing
 */
export function createMockFetch(responses: Record<string, any> = {}, shouldFail = false): any {
	const mockFetch = function (url: string) {
		if (shouldFail) {
			return Promise.resolve({
				ok: false,
				status: 500,
				statusText: 'Internal Server Error',
				headers: {
					get: (name: string) => {
						if (name.toLowerCase() === 'content-type') return 'application/json';
						return null;
					},
				},
				json: () => Promise.resolve({ error: 'Server error' }),
				text: () => Promise.resolve('Server error'),
			});
		}

		const response = responses[url] || { ok: true, status: 200, data: { success: true, id: '123' } };
		return Promise.resolve({
			ok: response.ok ?? true,
			status: response.status ?? 200,
			statusText: response.statusText ?? 'OK',
			json: () => Promise.resolve(response.data || {}),
			text: () => Promise.resolve(response.text || ''),
			headers: {
				get: (name: string) => {
					if (name.toLowerCase() === 'content-type') return 'application/json';
					return null;
				},
			},
			...response,
		});
	};

	return mockFetch;
}

/**
 * Create a failing mock fetch function for testing error scenarios
 */
export function createFailingMockFetch(): any {
	return createMockFetch({}, true);
}

/**
 * Mock global fetch for testing
 */
export function mockGlobalFetch(responses: Record<string, any> = {}): any {
	const mockFetch = createMockFetch(responses);
	global.fetch = mockFetch;
	return mockFetch;
}
