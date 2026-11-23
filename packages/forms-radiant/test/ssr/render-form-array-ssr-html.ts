import { renderToString } from '@ecopages/jsx/server';
import {
	withRadiantServerCustomElementRenderBridge,
	withServerRadiantElementSsrRuntime,
} from '@ecopages/radiant/server/radiant-element-ssr';
import { FormRenderer } from '@/components/internals/form-renderer';
import { createRadiantFormEngine } from '@/registries/builder-registry';
import { schemaFormRegistrations } from '@/registrations';

const engine = createRadiantFormEngine({ elements: schemaFormRegistrations });
const config = engine.validateForm({
	id: 'array-ssr-acceptance',
	title: 'Array SSR acceptance',
	steps: [
		{
			id: 'main',
			title: 'Main',
			elements: [
				{
					$type: 'arrayElements',
					id: 'contacts',
					name: 'contacts',
					label: 'Contacts',
					minItems: 2,
					initialValues: { role: 'Viewer' },
					rules: [{ type: 'minItems', value: 3, message: 'Add at least three contacts' }],
					elements: [
						{
							$type: 'input',
							inputType: 'text',
							id: 'role',
							name: 'role',
							label: 'Role',
						},
					],
				},
				{
					$type: 'submit',
					id: 'submit',
					name: 'submit',
					label: 'Submit contacts',
				},
			],
		},
	],
});

const objectDefaultConfig = engine.validateForm({
	id: 'array-object-defaults',
	title: 'Array object defaults',
	steps: [
		{
			id: 'main',
			title: 'Main',
			elements: [
				{
					$type: 'arrayElements',
					id: 'members',
					name: 'members',
					label: 'Members',
					minItems: 2,
					initialValues: { role: '' },
					elements: [
						{
							$type: 'input',
							inputType: 'text',
							id: 'role',
							name: 'role',
							label: 'Role',
						},
					],
				},
			],
		},
	],
});

export function renderArraySsrAcceptanceHtml(
	defaultValues: Record<string, unknown> = { contacts: [{ role: 'Alice' }, { role: 'Bob' }] },
): string {
	return withServerRadiantElementSsrRuntime(() =>
		withRadiantServerCustomElementRenderBridge(() =>
			renderToString(
				FormRenderer({
					config,
					engine,
					defaultValues,
				}),
				{ mode: 'hydrate' },
			),
		),
	);
}

export function renderArrayObjectDefaultsHtml(): string {
	return withServerRadiantElementSsrRuntime(() =>
		withRadiantServerCustomElementRenderBridge(() =>
			renderToString(
				FormRenderer({
					config: objectDefaultConfig,
					engine,
					defaultValues: { members: [{ role: 'Admin' }] },
				}),
				{ mode: 'hydrate' },
			),
		),
	);
}
