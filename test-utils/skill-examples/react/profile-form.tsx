import type { FormSubmitHelpers, FormValues } from '@schema-engine/forms';
import { FormRenderer } from '@schema-engine/forms-react';
import { engine } from './engine';
import { ResetButton } from './hooks';

export const profile = engine.defineForm({
	id: 'profile',
	steps: [
		{
			id: 'main',
			title: 'Profile',
			elements: [
				{
					$type: 'text',
					id: 'email',
					name: 'email',
					label: 'Email',
					inputType: 'email',
					rules: [{ $type: 'required', message: 'Email is required' }],
				},
				{ $type: 'rating', id: 'stars', name: 'stars', label: 'Stars' },
			],
		},
	],
});

async function save(values: FormValues, { fetch }: FormSubmitHelpers) {
	await fetch('/api/profile', { method: 'POST', body: JSON.stringify(values) });
}

export function ProfileForm() {
	return (
		<FormRenderer engine={engine} config={profile} onSubmit={save}>
			<ResetButton />
		</FormRenderer>
	);
}
