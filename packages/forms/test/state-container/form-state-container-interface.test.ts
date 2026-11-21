import { describe, expect, test } from 'vitest';
import { createDefaultValidationRegistry } from '@/schemas/validation';
import { createFormStateContainer } from '@/state-container/create-form-state-container';
import type { FormStateContainer } from '@/state-container/types';

/**
 * The container with its methods as function-typed properties, so each is compared strictly rather than by
 * method bivariance.
 */
type Strict<T> = {
	[K in keyof T]: T[K] extends (...args: infer A) => infer R ? (...args: A) => R : T[K];
};

/**
 * A local copy of the interface a host that bridges native controls into a form state container needs.
 *
 * @remarks
 * It checks a copy, not the host's own declaration: the host's interface has to declare the same members,
 * or this proves nothing about it. The conformance suite is the guard on behaviour.
 */
type BridgeNativeValidity = { type: string; params?: Record<string, unknown>; message?: string };

interface BridgeFormState {
	getValue: (path: string) => unknown;
	setValue: (path: string, value: unknown, options?: { native?: BridgeNativeValidity | null }) => void;
	blur: (path: string, options?: { native?: BridgeNativeValidity | null }) => void;
	getSnapshot: () => {
		readonly values: Readonly<Record<string, unknown>>;
		readonly errors: Readonly<Record<string, { readonly type?: string; readonly message?: string }>>;
		readonly warnings: Readonly<Record<string, { readonly type?: string; readonly message?: string }>>;
	};
	subscribe: (listener: () => void) => () => void;
	reset: () => void;
	validate: (
		paths?: string[],
		options?: { native?: Record<string, BridgeNativeValidity | null> },
	) => Promise<boolean>;
	releaseNative: (path: string) => void;
}

interface NotTheBridge {
	validate: (paths?: string[]) => Promise<string>;
}

const asBridge = (container: Strict<FormStateContainer>): BridgeFormState => container;

describe('the form state container as a bridge host sees it', () => {
	test('is assignable to the bridge interface with strict function types', async () => {
		const container = createFormStateContainer({ registry: createDefaultValidationRegistry(), elements: [] });
		const bridge = asBridge(container);
		bridge.setValue('name', '', { native: { type: 'valueMissing', message: 'Fill in this field' } });
		bridge.blur('name', { native: { type: 'valueMissing', message: 'Fill in this field' } });
		expect(await bridge.validate()).toBe(false);
		expect(bridge.getSnapshot().errors.name?.message).toBe('Fill in this field');
		expect(await bridge.validate(['name'], { native: { name: null } })).toBe(true);
		bridge.blur('name', { native: { type: 'tooShort', params: { minLength: 8 } } });
		bridge.releaseNative('name');
		expect(bridge.getSnapshot().warnings).toEqual({});
	});

	test('is checked strictly', () => {
		const container = createFormStateContainer({ registry: createDefaultValidationRegistry(), elements: [] });
		// @ts-expect-error the container resolves a boolean, so it does not fit a validate that resolves a string
		const notFit: NotTheBridge = container;
		expect(notFit).toBe(container);
	});
});
