/** @jsxImportSource react */
import * as z from 'zod/mini';
import { FormRenderer } from '@schema-engine/forms-react';
import { engine } from './react-widgets.react';

const profile = engine.defineForm({
	id: 'profile',
	steps: [
		{
			id: 'main',
			title: 'Profile',
			elements: [
				{ $type: 'text', name: 'name', rules: [{ $type: 'required' }] },
				{ $type: 'rating', name: 'stars' },
			],
		},
	],
});

/**
 * A literal config types `values` as `{ readonly name: string; readonly stars?: number | '' | null }`, with no
 * annotation.
 */
export function TypedProfile({ save }: { save: (name: string, stars: number | undefined) => Promise<void> }) {
	return (
		<FormRenderer
			engine={engine}
			config={profile}
			onSubmit={async (values) => save(values.name, typeof values.stars === 'number' ? values.stars : undefined)}
		/>
	);
}

const Profile = z.object({ name: z.string(), stars: z.optional(z.number()) });

/** A config that arrives as JSON binds the application's schema: `onSubmit` receives its output. */
export function LoadedProfile({
	json,
	save,
}: {
	json: unknown;
	save: (profile: z.output<typeof Profile>) => Promise<void>;
}) {
	return <FormRenderer engine={engine} config={engine.validateForm(json, { values: Profile })} onSubmit={save} />;
}
