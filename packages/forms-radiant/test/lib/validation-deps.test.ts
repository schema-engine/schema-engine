import { describe, expect, test } from 'vitest';
import type { FormController } from '@/adapters/radiant/controller';
import { connectValidationDependencies } from '@/lib/validation-deps';

const passwordForm = [
	{ $type: 'input', name: 'password', rules: [{ type: 'required' }] },
	{
		$type: 'input',
		name: 'confirmPassword',
		rules: [{ type: 'relate', fields: ['password'], assert: 'allEqual' }],
	},
];

const mutualForm = [
	{ $type: 'input', name: 'a', rules: [{ type: 'relate', fields: ['b'], assert: 'allDifferent' }] },
	{ $type: 'input', name: 'b', rules: [{ type: 'relate', fields: ['a'], assert: 'allDifferent' }] },
];

const lineItemsForm = [
	{
		$type: 'arrayElements',
		name: 'lines',
		elements: [
			{ $type: 'number', name: 'quantity', rules: [{ type: 'required' }] },
			{
				$type: 'number',
				name: 'max',
				rules: [{ type: 'relate', fields: ['quantity'], assert: 'descending', as: 'number' }],
			},
		],
	},
];

/**
 * Stands in for the Radiant UI store and controller pair.
 *
 * @remarks
 * `validateField` notifies, as the real store does when it writes `errors`.
 * That is what makes the re-entrancy cases meaningful rather than theoretical.
 */
function createHarness(values: Record<string, unknown>) {
	const listeners = new Set<(values: Record<string, unknown>) => void>();
	const validated: string[] = [];
	const state = { touched: {} as Record<string, boolean>, isSubmitted: false };
	let current = values;

	const notify = () => {
		for (const listener of listeners) listener(current);
	};

	const store = {
		getState: () => state,
		validateField: (name: string) => {
			validated.push(name);
			notify();
			return Promise.resolve(true);
		},
	};

	const controller = {
		store,
		getValues: () => current,
		watchForm(listener: (values: Record<string, unknown>) => void) {
			listeners.add(listener);
			listener(current);
			return () => listeners.delete(listener);
		},
	} as unknown as FormController;

	return {
		controller,
		state,
		validated,
		setValues(next: Record<string, unknown>) {
			current = next;
			notify();
		},
		notifyWithoutChange: notify,
	};
}

describe('connectValidationDependencies', () => {
	test('re-validates a touched dependent when the field it reads changes', () => {
		const harness = createHarness({ password: '', confirmPassword: '' });
		harness.state.touched.confirmPassword = true;
		connectValidationDependencies(harness.controller, passwordForm);

		harness.setValues({ password: 'hunter2', confirmPassword: '' });

		expect(harness.validated).toEqual(['confirmPassword']);
	});

	test('leaves an untouched dependent alone', () => {
		const harness = createHarness({ password: '', confirmPassword: '' });
		connectValidationDependencies(harness.controller, passwordForm);

		harness.setValues({ password: 'hunter2', confirmPassword: '' });

		expect(harness.validated).toEqual([]);
	});

	test('re-validates an untouched dependent once the form has been submitted', () => {
		const harness = createHarness({ password: '', confirmPassword: '' });
		harness.state.isSubmitted = true;
		connectValidationDependencies(harness.controller, passwordForm);

		harness.setValues({ password: 'hunter2', confirmPassword: '' });

		expect(harness.validated).toEqual(['confirmPassword']);
	});

	test('ignores a notification that carries no value change', () => {
		const harness = createHarness({ password: 'hunter2', confirmPassword: 'hunter2' });
		harness.state.touched.confirmPassword = true;
		connectValidationDependencies(harness.controller, passwordForm);

		harness.notifyWithoutChange();

		expect(harness.validated).toEqual([]);
	});

	test('does not loop when two fields depend on each other', () => {
		const harness = createHarness({ a: '', b: '' });
		harness.state.touched.a = true;
		harness.state.touched.b = true;
		connectValidationDependencies(harness.controller, mutualForm);

		harness.setValues({ a: 'x', b: '' });

		expect(harness.validated).toEqual(['b']);
	});

	test('re-validates only the row whose dependency changed', () => {
		const harness = createHarness({
			lines: [
				{ quantity: 1, max: 5 },
				{ quantity: 2, max: 5 },
			],
		});
		harness.state.touched['lines.0.max'] = true;
		harness.state.touched['lines.1.max'] = true;
		connectValidationDependencies(harness.controller, lineItemsForm);

		harness.setValues({
			lines: [
				{ quantity: 1, max: 5 },
				{ quantity: 9, max: 5 },
			],
		});

		expect(harness.validated).toEqual(['lines.1.max']);
	});

	test('stops re-validating once unsubscribed', () => {
		const harness = createHarness({ password: '', confirmPassword: '' });
		harness.state.touched.confirmPassword = true;
		const unsubscribe = connectValidationDependencies(harness.controller, passwordForm);

		unsubscribe();
		harness.setValues({ password: 'hunter2', confirmPassword: '' });

		expect(harness.validated).toEqual([]);
	});
});
