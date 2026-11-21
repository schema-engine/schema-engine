import { describe, expect, test } from 'vitest';
import { createDefaultValidationRegistry } from '@/schemas/validation';
import { createFormStore } from '@/store/create-form-store';

/**
 * A copy of the interface a host that bridges native controls into a form store needs, written with
 * property syntax so function types are compared strictly rather than by method bivariance.
 */
interface BridgeFormStore {
	getValue: (path: string) => unknown;
	setValue: (path: string, value: unknown) => void;
	getSnapshot: () => { values: Record<string, unknown>; errors: Record<string, { type?: string; message?: string }> };
	subscribe: (listener: () => void) => () => void;
	reset: () => void;
	validate: (paths?: readonly string[]) => Promise<boolean>;
	setErrors: (source: string, errors: Record<string, { type?: string; message?: string }>) => void;
	blur: (path: string) => void;
}

interface NotTheStore {
	validate: (paths?: readonly string[]) => Promise<string>;
}

const accept = (store: BridgeFormStore): BridgeFormStore => store;

describe('the form store as a bridge host sees it', () => {
	test('is assignable to the bridge interface', async () => {
		const store = accept(createFormStore({ registry: createDefaultValidationRegistry(), elements: [] }));
		store.setErrors('native', { name: { message: 'Fill in this field' } });
		expect(store.getSnapshot().errors.name?.message).toBe('Fill in this field');
		expect(await store.validate()).toBe(false);
	});

	test('is checked strictly', () => {
		const store = createFormStore({ registry: createDefaultValidationRegistry(), elements: [] });
		// @ts-expect-error the store resolves a boolean, so it does not fit a validate that resolves a string
		const notFit: NotTheStore = store;
		expect(notFit).toBe(store);
	});
});
