import { renderToString } from '@ecopages/jsx/server';
import { jsx } from '@ecopages/jsx/jsx-runtime';
import * as z from 'zod/mini';
import { createFormEngine } from '@schema-engine/forms';
import type { ElementGridConfig, LayoutInput } from '@schema-engine/layout';
import { RecipeRenderer } from '@/components/internals/recipe-renderer';
import { mergeFieldGridHost } from '@/hooks/grid-styles';
import {
	SSR_CONTAINER_LAYOUT,
	SSR_WIDTH_FIELDS,
	ssrAreasForm,
	ssrContainerForm,
	ssrSteppedForm,
} from '../../../../test-utils/ssr-grid-fixtures';

const ssrInputSchema = z.object({
	$type: z.literal('ssr-input'),
	id: z.string(),
	name: z.string(),
	label: z.optional(z.string()),
	grid: z.optional(z.custom<ElementGridConfig>()),
});

type SsrInputConfig = z.infer<typeof ssrInputSchema>;

/**
 * Field host built the way the shipped elements build theirs.
 *
 * @remarks
 * Written with `jsx(...)` rather than JSX syntax because the package tsconfig
 * only covers `src`, so `test/` files are not transformed with the Radiant
 * `jsxImportSource`.
 */
function SsrFixtureInput(config: SsrInputConfig) {
	const host = mergeFieldGridHost(config.grid);
	const label = config.label ?? config.name;

	return jsx('div', {
		class: 'se-form-field se-grid-item',
		'data-se-theme': host.themeId,
		style: host.style,
		children: [
			jsx('label', { for: config.id, children: label }),
			jsx('input', { id: config.id, name: config.name, 'aria-label': label, readonly: true }),
		],
	});
}

/** The fixture engine; pass `layout` to put it on a shared or customised layout theme. */
export function createSsrAcceptanceEngine<const TLayout extends LayoutInput = Record<never, never>>(layout?: TLayout) {
	return createFormEngine({
		layout,
		elements: [
			{
				$type: 'ssr-input',
				kind: 'input',
				schema: ssrInputSchema,
				value: () => z.string(),
				metadata: { name: 'SSR input', category: 'input' },
				render: (config: SsrInputConfig) => SsrFixtureInput(config),
			},
		],
	});
}

let cachedEngine: ReturnType<typeof createSsrAcceptanceEngine> | undefined;

export function getSsrAcceptanceEngine() {
	cachedEngine ??= createSsrAcceptanceEngine();
	return cachedEngine;
}

/**
 * SSR document produced by the renderer itself.
 *
 * @remarks
 * Goes through {@link RecipeRenderer} rather than re-deriving the markup from
 * the grid helpers, so a renderer that stops emitting the theme stylesheet, the
 * grid container, or the `se-grid-item` class fails this test.
 */
export function renderSsrLayoutAcceptanceHtml(): string {
	const engine = getSsrAcceptanceEngine();
	const config = engine.validateForm({
		id: 'ssr-layout-acceptance',
		title: 'SSR layout acceptance',
		grid: {
			columns: 1,
			responsive: { sm: { columns: 2 } },
		},
		steps: [
			{
				id: 'main',
				title: 'Main',
				elements: [
					{
						$type: 'ssr-input',
						id: 'tracked',
						name: 'tracked',
						label: 'Tracked field',
						grid: {
							column: 'span 1',
							responsive: { md: { column: 'span 2', hidden: true } },
						},
					},
					{
						$type: 'ssr-input',
						id: 'visible',
						name: 'visible',
						label: 'Visible field',
					},
				],
			},
		],
	});

	const body = renderToString(RecipeRenderer({ config, engine, recipe: undefined }), { mode: 'plain' });

	return `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body>${body}</body></html>`;
}

/** SSR document for the named width fixture, produced by the renderer itself. */
export function renderSsrWidthsAcceptanceHtml(): string {
	const engine = getSsrAcceptanceEngine();
	const config = engine.validateForm({
		id: 'ssr-widths-acceptance',
		title: 'SSR widths acceptance',
		steps: [
			{
				id: 'main',
				title: 'Main',
				elements: SSR_WIDTH_FIELDS.map(({ id, label, grid }) => ({
					$type: 'ssr-input',
					id,
					name: id,
					label,
					grid,
				})),
			},
		],
	});

	const body = renderToString(RecipeRenderer({ config, engine, recipe: undefined }), { mode: 'plain' });

	return `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body>${body}</body></html>`;
}

/** SSR document of the form that measures its grid's container, and the theme it renders under. */
export function renderSsrContainerAcceptanceHtml(): { html: string; layout: { id: string; css: string } } {
	const engine = createSsrAcceptanceEngine(SSR_CONTAINER_LAYOUT);
	const config = engine.validateForm(ssrContainerForm('ssr-input'));
	const body = renderToString(RecipeRenderer({ config, engine, recipe: undefined }), { mode: 'plain' });
	const { id, css } = engine.getLayout();

	return {
		html: `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body>${body}</body></html>`,
		layout: { id, css },
	};
}

function renderForm(form: unknown): string {
	const engine = getSsrAcceptanceEngine();
	const config = engine.validateForm(form);
	const body = renderToString(RecipeRenderer({ config, engine, recipe: undefined }), { mode: 'plain' });

	return `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body>${body}</body></html>`;
}

/** SSR document for the drawn layout fixture, produced by the renderer itself. */
export function renderSsrAreasAcceptanceHtml(): string {
	return renderForm(ssrAreasForm('ssr-input'));
}

/** SSR document for the stepped fixture: one step with its own template and one without. */
export function renderSsrSteppedAcceptanceHtml(): string {
	return renderForm(ssrSteppedForm('ssr-input'));
}
