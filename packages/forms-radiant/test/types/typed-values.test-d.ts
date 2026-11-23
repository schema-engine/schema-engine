import { expectTypeOf } from 'vitest';
import * as z from 'zod/mini';
import type { FormValues } from '@schema-engine/forms';
import { FormRenderer } from '@/components/internals/form-renderer';
import { createRadiantFormEngine } from '@/registries/builder-registry';
import { schemaFormRegistrations } from '@/registrations';

const engine = createRadiantFormEngine({ elements: schemaFormRegistrations });

const profile = engine.defineForm({
	id: 'profile',
	steps: [
		{
			id: 'main',
			title: 'Main',
			elements: [
				{ $type: 'input', name: 'email', rules: [{ $type: 'required' }] },
				{ $type: 'number', name: 'age', rules: [{ $type: 'required' }] },
			],
		},
	],
});

/** onSubmit, onAction and defaultValues take their types from a literal config, with no annotation. */
FormRenderer({
	engine,
	config: profile,
	defaultValues: { email: 'ada@example.com' },
	onSubmit: (values) => {
		expectTypeOf(values).toEqualTypeOf<{ readonly email: string; readonly age: number }>();
	},
	onAction: (_action, data) => {
		expectTypeOf(data.age).toEqualTypeOf<number>();
	},
	onChange: (values) => {
		expectTypeOf(values).toEqualTypeOf<FormValues>();
	},
});

FormRenderer({
	engine,
	config: profile,
	// @ts-expect-error -- the age of a profile is a number
	defaultValues: { age: 'old' },
});

/** A config bound to the application's schema types them as the schema's output. */
const Profile = z.object({ email: z.string(), age: z.number() });
FormRenderer({
	engine,
	config: engine.validateForm({}, { values: Profile }),
	onSubmit: (values) => {
		expectTypeOf(values).toEqualTypeOf<{ email: string; age: number }>();
	},
});

/** An authoring config is FormValues. */
FormRenderer({
	engine,
	config: { id: 'authoring', steps: [] },
	onSubmit: (values) => {
		expectTypeOf(values).toEqualTypeOf<FormValues>();
	},
});

/** A form validated without a schema is FormValues: it cannot stand for a form of a narrower values type. */
FormRenderer<{ email: string }>({
	engine,
	// @ts-expect-error -- the plain result of validateForm holds FormValues, not { email: string }
	config: engine.validateForm({}),
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
