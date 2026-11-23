import { expectTypeOf } from 'vitest';
import * as z from 'zod/mini';
import { createFormEngine } from '@schema-engine/forms';
import type { FormValues } from '@schema-engine/forms';
import type { EngineOutputMaps } from '@schema-engine/forms/engine/form-engine';
import { CheckboxElementRegistration } from '@/components/schema-engine/forms/inputs/form-checkbox.registration';
import { InputElementRegistration } from '@/components/schema-engine/forms/inputs/form-input.registration';
import { SelectElementRegistration } from '@/components/schema-engine/forms/inputs/form-select.registration';
import { FormRenderer } from '@/components/internals/form-renderer';
import { FormProvider } from '@/components/form-provider';

const engine = createFormEngine({
	elements: [InputElementRegistration, SelectElementRegistration, CheckboxElementRegistration],
});

const profile = engine.defineForm({
	id: 'profile',
	steps: [
		{
			id: 'main',
			title: 'Main',
			elements: [
				{ $type: 'input', name: 'email', rules: [{ $type: 'required' }] },
				{ $type: 'select', name: 'stars', options: [{ value: 1, label: 'One' }] },
				{ $type: 'checkbox', name: 'agree', rules: [{ $type: 'required' }] },
			],
		},
	],
});

/** onSubmit, onAction and defaultValues take their types from a literal config, with no annotation. */
FormRenderer({
	engine,
	config: profile,
	defaultValues: { email: 'ada@example.com', stars: 1 },
	onSubmit: (values) => {
		expectTypeOf(values).toEqualTypeOf<{
			readonly email: string;
			readonly stars?: string | number | Array<string | number> | null;
			readonly agree: boolean;
		}>();
	},
	onAction: (_action, data) => {
		expectTypeOf(data.email).toEqualTypeOf<string>();
	},
	onChange: (values) => {
		expectTypeOf(values).toEqualTypeOf<FormValues>();
	},
});

FormRenderer({
	engine,
	config: profile,
	// @ts-expect-error -- the email of a profile is text
	defaultValues: { email: 42 },
});

FormProvider({
	config: profile,
	children: null,
	onSubmit: (values) => {
		expectTypeOf(values.email).toEqualTypeOf<string>();
	},
});

/** A config bound to the application's schema types them as the schema's output. */
const Profile = z.object({ email: z.string(), agree: z.literal(true) });
const bound = engine.validateForm({}, { values: Profile });
FormRenderer({
	engine,
	config: bound,
	onSubmit: (values) => {
		expectTypeOf(values).toEqualTypeOf<{ email: string; agree: true }>();
	},
});

/** An authoring config, or one validated without a schema, is FormValues. */
const plain = engine.validateForm({});
FormRenderer({
	engine,
	config: plain,
	onSubmit: (values) => {
		expectTypeOf(values).toEqualTypeOf<FormValues>();
	},
});
FormRenderer({
	engine,
	config: { id: 'authoring', steps: [] },
	onSubmit: (values) => {
		expectTypeOf(values).toEqualTypeOf<FormValues>();
	},
});

/** A form validated without a schema is FormValues: it cannot stand for a form of a narrower values type. */
FormProvider<EngineOutputMaps, { email: string }>({
	// @ts-expect-error -- the plain result of validateForm holds FormValues, not { email: string }
	config: engine.validateForm({}),
	children: null,
});

/** An authoring config carries no values type, so a callback typed by other values is an error. */
FormRenderer({
	engine,
	// @ts-expect-error -- the values of an authoring config are FormValues, not { email: string }
	config: { id: 'authoring', steps: [] },
	onSubmit: (values: { email: string }) => {
		void values;
	},
});
