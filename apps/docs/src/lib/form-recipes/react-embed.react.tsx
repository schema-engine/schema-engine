/** @jsxImportSource react */
import { useState } from 'react';
import { FormRenderer } from '@schema-engine/forms-react';
import { engine } from './react-widgets.react';

const profileForm = engine.defineForm({
	id: 'profile',
	steps: [
		{
			id: 'main',
			title: 'Profile',
			elements: [
				{
					$type: 'text',
					id: 'name',
					name: 'name',
					label: 'Name',
					rules: [{ type: 'required', message: 'Required' }],
				},
				{ $type: 'rating', id: 'stars', name: 'stars', label: 'Rating' },
				{ $type: 'submit', id: 'save', name: 'save', label: 'Save' },
			],
		},
	],
});

interface Profile {
	name: string;
	stars?: number;
}

/**
 * A hand-written form that hosts a Schema Engine form: values go in as `defaultValues` and come out through
 * `onChange` and `onSubmit`. The two share no form state.
 */
export function ProfileEditor({ profile, save }: { profile: Profile; save: (profile: Profile) => Promise<void> }) {
	const [name, setName] = useState(profile.name);

	return (
		<section>
			<h2>{name || 'New profile'}</h2>
			<FormRenderer
				engine={engine}
				config={profileForm}
				defaultValues={{ ...profile }}
				onChange={(values) => setName(typeof values['name'] === 'string' ? values['name'] : '')}
				onSubmit={async (values) => save(values as unknown as Profile)}
			/>
		</section>
	);
}
