import { describe, expect, test, vi } from 'vitest';
import { FormController, formController } from '../../src/adapters/radiant/controller';
import type { FormControllerHost } from '../../src/adapters/radiant/controller/form-controller-decorator';

function createHost() {
	const connected: Array<() => void> = [];
	const cleanup: Array<() => void> = [];
	const host = {
		registerConnectedCallback: (callback: () => void) => connected.push(callback),
		registerCleanupCallback: (callback: () => void) => cleanup.push(callback),
		requestUpdate: vi.fn(),
		dispatchEvent: vi.fn(),
	} as unknown as FormControllerHost;
	return { host, connected, cleanup };
}

describe('@formController decorator dispatch', () => {
	test('standard field decorator creates a controller and wires connect/disconnect', () => {
		const { host, connected, cleanup } = createHost();
		const initializers: Array<(this: FormControllerHost) => void> = [];
		const context = {
			name: 'form',
			addInitializer(initializer: (this: FormControllerHost) => void) {
				initializers.push(initializer);
			},
			access: {
				get: (instance: FormControllerHost) => (instance as FormControllerHost & { form: FormController }).form,
			},
		} as unknown as ClassFieldDecoratorContext<FormControllerHost, FormController>;

		const initialize = formController(undefined, context);
		const record = host as FormControllerHost & { form: FormController };
		record.form = initialize.call(host);
		for (const initializer of initializers) initializer.call(host);

		expect(record.form).toBeInstanceOf(FormController);
		expect(record.form.host).toBe(host);
		expect(connected).toHaveLength(1);
		expect(cleanup).toHaveLength(1);
		connected[0]?.();
		cleanup[0]?.();
	});

	test('legacy TypeScript decorator assigns a controller and wires connect/disconnect', () => {
		const proto = {} as FormControllerHost;
		formController(proto, 'form');
		const { host, connected, cleanup } = createHost();
		const initializers = Object.getOwnPropertyDescriptor(
			proto,
			Symbol.for('@ecopages/radiant.legacy-post-construction-initializers'),
		)?.value as Array<(element: FormControllerHost) => void> | undefined;
		if (!initializers) throw new Error('Expected legacy post-construction initializer');

		initializers[0]?.(host);
		const record = host as FormControllerHost & { form: FormController };
		expect(record.form).toBeInstanceOf(FormController);
		expect(record.form.host).toBe(host);
		expect(connected).toHaveLength(1);
		expect(cleanup).toHaveLength(1);
		connected[0]?.();
		cleanup[0]?.();
	});
});
