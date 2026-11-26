import { renderToString } from '@ecopages/jsx/server';
import {
	withRadiantServerCustomElementRenderBridge,
	withServerRadiantElementSsrRuntime,
} from '@ecopages/radiant/server/radiant-element-ssr';
import { FormRenderer } from '@/components/internals/form-renderer';
import { createRadiantFormEngine } from '@/registries/builder-registry';
import { schemaFormRegistrations } from '@/registrations';
import {
	SSR_CONTAINER_LAYOUT,
	ssrNestedContainerForm,
	ssrNestedFields,
	type SsrNestedContainerVariant,
} from '../../../../test-utils/ssr-grid-fixtures';

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

/**
 * SSR document of a fieldset that is narrow inside a wide step grid, under the container theme,
 * produced by the real fieldset renderer, and the theme it renders under.
 */
export function renderSsrNestedContainerHtml(variant: SsrNestedContainerVariant): {
	html: string;
	layout: { id: string; css: string };
} {
	const containerEngine = createRadiantFormEngine({
		elements: schemaFormRegistrations,
		layout: SSR_CONTAINER_LAYOUT,
	});
	const containerConfig = containerEngine.validateForm(
		ssrNestedContainerForm('input', variant, { inputType: 'text' }),
	);
	const html = withServerRadiantElementSsrRuntime(() =>
		withRadiantServerCustomElementRenderBridge(() =>
			renderToString(FormRenderer({ config: containerConfig, engine: containerEngine }), { mode: 'hydrate' }),
		),
	);
	const { id, css } = containerEngine.getLayout();
	return { html, layout: { id, css } };
}
