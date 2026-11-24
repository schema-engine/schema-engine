/** @jsxImportSource react */
import { useState } from 'react';
import * as z from 'zod/mini';
import { BaseFieldSchema, createFormEngine, defineInput, type FormValues } from '@schema-engine/forms';
import { FormRenderer } from '@schema-engine/forms-react';
import { fieldText, useFormField } from '@schema-engine/forms-react/hooks';

const SwitchSchema = z.extend(BaseFieldSchema, { $type: z.literal('switch') });

/** A component with no native value to read: controlled, so it renders with its value. */
function SwitchField(config: z.output<typeof SwitchSchema>) {
	const { value, onChange, onBlur, fieldProps } = useFormField(config, { controlled: true });
	return (
		<button
			{...fieldProps}
			type="button"
			role="switch"
			aria-checked={value === true}
			aria-label={config.label}
			onClick={() => onChange(value !== true)}
			onBlur={onBlur}
		>
			{config.label}: {value === true ? 'on' : 'off'}
		</button>
	);
}

const SelectSchema = z.extend(BaseFieldSchema, {
	$type: z.literal('select'),
	options: z.array(z.object({ value: z.string(), label: z.string() })),
});

function SelectField(config: z.output<typeof SelectSchema>) {
	const { defaultValue, fieldProps, labelProps } = useFormField(config);
	return (
		<div>
			<label {...labelProps}>{config.label}</label>
			<select {...fieldProps} defaultValue={fieldText(defaultValue)}>
				{config.options.map((option) => (
					<option key={option.value} value={option.value}>
						{option.label}
					</option>
				))}
			</select>
		</div>
	);
}

const switchElement = defineInput({
	$type: 'switch',
	schema: SwitchSchema,
	render: SwitchField,
	value: () => z.boolean(),
	metadata: { name: 'Switch', category: 'input' },
});

const selectElement = defineInput({
	$type: 'select',
	schema: SelectSchema,
	render: SelectField,
	value: () => z.string(),
	metadata: { name: 'Select', category: 'input' },
});

const engine = createFormEngine({ elements: [switchElement, selectElement] });

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
