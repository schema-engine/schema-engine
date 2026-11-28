import { createFormStateContainer } from '@schema-engine/forms/state-container';
import { engine } from './engine';

const config = engine.defineForm({
	id: 'newsletter',
	validationMode: 'onBlur',
	steps: [
		{
			id: 'main',
			title: 'Newsletter',
			elements: [
				{ $type: 'input', id: 'email', name: 'email', rules: [{ $type: 'required', id: 'email-required' }] },
			],
		},
	],
});

const settled = () => new Promise((resolve) => setTimeout(resolve, 0));

export async function walkThrough() {
	const form = createFormStateContainer({
		config,
		registry: engine.validations,
		defaults: { email: '' },
	});
	const error = () => form.getSnapshot().errors['email'];

	form.setValue('email', 'abc');
	form.reportNative({ email: { type: 'typeMismatch', params: { inputType: 'email' } } });
	const typing = error();

	form.blur('email');
	await settled();
	const leaving = error();

	form.setValue('email', '');
	form.reportNative({ email: null });
	form.blur('email');
	await settled();
	const clearing = error();

	form.setValue('email', 'ada@example.com');
	form.reportNative({ email: null });
	form.blur('email');
	await settled();
	const fixed = error();

	return { typing, leaving, clearing, fixed };
}
