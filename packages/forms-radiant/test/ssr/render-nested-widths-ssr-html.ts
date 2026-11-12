import { renderToString } from '@ecopages/jsx/server';
import {
	withRadiantServerCustomElementRenderBridge,
	withServerRadiantElementSsrRuntime,
} from '@ecopages/radiant/server/radiant-element-ssr';
import { FormRenderer } from '@/components/internals/form-renderer';
import { createRadiantFormEngine } from '@/registries/builder-registry';
import { schemaFormRegistrations } from '@/registrations';
import { ssrNestedFields } from '../../../../test-utils/ssr-grid-acceptance';

const engine = createRadiantFormEngine({ elements: schemaFormRegistrations });

const children = (prefix: 'Nest' | 'Row') =>
	ssrNestedFields(prefix).map(({ id, label, grid }) => ({
		$type: 'input',
		inputType: 'text',
		id,
		name: id,
		label,
		grid,
	}));

const config = engine.validateForm({
	id: 'ssr-nested-widths-acceptance',
	title: 'SSR nested widths acceptance',
	steps: [
		{
			id: 'main',
			title: 'Main',
			elements: [
				{ $type: 'fieldSet', id: 'group', name: 'group', legend: 'Group', elements: children('Nest') },
				{
					$type: 'arrayElements',
					id: 'rows',
					name: 'rows',
					label: 'Rows',
					minItems: 1,
					elements: children('Row'),
				},
			],
		},
	],
});

/**
 * SSR document for a fieldset and an array row whose children set widths,
 * produced by the real fieldset and array renderers.
 */
export function renderSsrNestedWidthsAcceptanceHtml(): string {
	return withServerRadiantElementSsrRuntime(() =>
		withRadiantServerCustomElementRenderBridge(() =>
			renderToString(FormRenderer({ config, engine, defaultValues: { rows: [{}] } }), { mode: 'hydrate' }),
		),
	);
}
