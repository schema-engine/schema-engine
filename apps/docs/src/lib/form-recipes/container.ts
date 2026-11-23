import { createFormStateContainer, selectFieldState } from '@schema-engine/forms/state-container';
import { engine } from './engine';

const config = engine.defineForm({
	id: 'signup',
	steps: [
		{
			id: 'account',
			title: 'Account',
			elements: [
				{ $type: 'input', id: 'email', name: 'email', rules: [{ type: 'required', id: 'email-required' }] },
				{
					$type: 'input',
					id: 'password',
					name: 'password',
					rules: [{ type: 'minLength', id: 'password-min', value: 8 }],
				},
			],
		},
	],
});

export const container = createFormStateContainer({
	config,
	registry: engine.getValidationRegistry(),
	defaults: { email: 'ada@example.com', password: '' },
});

export async function fillIn() {
	container.setValue('password', 'short');
	const recordedBefore = container.getSnapshot().isValid;

	const checked = await container.checkValidity();
	const recordedAfterCheck = container.getSnapshot().isValid;

	const validated = await container.validate();
	const snapshot = container.getSnapshot();

	return {
		recordedBefore,
		checked,
		recordedAfterCheck,
		validated,
		isValid: snapshot.isValid,
		error: snapshot.errors['password'],
		field: selectFieldState(snapshot, 'password'),
	};
}
