/** @jsxImportSource react */
import { useState } from 'react';
import { createFormEngine, type FormValues } from '@schema-engine/forms';
import { FormRenderer } from '@schema-engine/forms-react';
import { schemaFormRegistrations } from '@/components/schema-engine/forms/registrations';

const engine = createFormEngine({ elements: schemaFormRegistrations });

const notificationsForm = engine.defineForm({
	id: 'notifications',
	steps: [
		{
			id: 'main',
			title: 'Notifications',
			elements: [
				{ $type: 'switch', id: 'digest', name: 'digest', label: 'Email digest' },
				{
					$type: 'select',
					id: 'frequency',
					name: 'frequency',
					label: 'How often',
					options: [
						{ value: 'daily', label: 'Every day' },
						{ value: 'weekly', label: 'Every week' },
					],
				},
			],
		},
	],
});

export interface NotificationSettings {
	digest: boolean;
	frequency: string;
}

function toSettings(values: FormValues, fallback: NotificationSettings): NotificationSettings {
	return {
		digest: typeof values.digest === 'boolean' ? values.digest : fallback.digest,
		frequency: typeof values.frequency === 'string' ? values.frequency : fallback.frequency,
	};
}

/**
 * A settings panel that holds state of its own and mounts a form for part of it. The panel is not a form, so
 * the form's own `<form>` is the only one. Settings go in as `defaultValues` and come out through `onChange`.
 */
export function SettingsPanel({
	settings,
	save,
}: {
	settings: NotificationSettings;
	save: (settings: NotificationSettings) => Promise<void>;
}) {
	const [draft, setDraft] = useState(settings);
	const [saving, setSaving] = useState(false);

	return (
		<section aria-label="Settings">
			<h2>Notifications</h2>
			<FormRenderer
				engine={engine}
				config={notificationsForm}
				defaultValues={settings}
				onChange={(values) => setDraft(toSettings(values, settings))}
			/>
			<button
				type="button"
				disabled={saving}
				onClick={async () => {
					setSaving(true);
					await save(draft);
					setSaving(false);
				}}
			>
				Save settings
			</button>
		</section>
	);
}
