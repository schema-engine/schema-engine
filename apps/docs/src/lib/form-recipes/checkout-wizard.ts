import { createFormRuntime, type FormRuntimeOutcome, type FormValues } from '@schema-engine/forms';
import { engine } from './engine';

export const config = engine.defineForm({
	id: 'checkout',
	navigation: 'linear',
	steps: [
		{
			id: 'contact',
			title: 'Contact',
			elements: [
				{ $type: 'input', id: 'email', name: 'email', rules: [{ $type: 'required' }] },
				{ $type: 'input', id: 'hasCompany', name: 'hasCompany', defaultValue: 'no' },
			],
		},
		{
			id: 'company',
			title: 'Company',
			constraints: [{ field: 'hasCompany', operator: 'equals', value: 'yes', $type: 'show' }],
			elements: [{ $type: 'input', id: 'vat', name: 'vat', rules: [{ $type: 'required' }] }],
		},
		{
			id: 'payment',
			title: 'Payment',
			elements: [{ $type: 'input', id: 'card', name: 'card', rules: [{ $type: 'required' }] }],
		},
	],
});

export function createCheckout(onSubmit: (values: FormValues) => void = () => {}) {
	const runtime = createFormRuntime({ engine, config, host: { focus: () => {} }, onSubmit });
	runtime.mount();
	return runtime;
}

export async function walkThrough() {
	const submitted: FormValues[] = [];
	const checkout = createCheckout((values) => void submitted.push(values));
	const log: Array<[command: string, outcome: FormRuntimeOutcome, current: string]> = [];
	const run = async (command: string, move: () => Promise<FormRuntimeOutcome>) => {
		log.push([command, await move(), checkout.getSnapshot().current]);
	};

	await run('next', checkout.next);
	checkout.container.setValue('email', 'ada@example.com');
	await run('next', checkout.next);
	await run('back', checkout.back);

	checkout.container.setValue('hasCompany', 'yes');
	await run('next', checkout.next);
	await run('goTo payment', () => checkout.goTo('payment'));
	checkout.container.setValue('vat', 'IT12345678901');
	await run('goTo payment', () => checkout.goTo('payment'));

	await run('submit', checkout.submit);
	checkout.container.setValue('card', '4242 4242 4242 4242');
	await run('submit', checkout.submit);

	return { log, steps: checkout.getSnapshot().steps, submitted };
}
