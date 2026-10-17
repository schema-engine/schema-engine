import { renderToString } from '@ecopages/jsx/server';
import { jsx } from '@ecopages/jsx/jsx-runtime';
import * as z from 'zod/mini';
import { createFormEngine } from '@schema-engine/forms';
import type { ElementGridConfig } from '@schema-engine/forms/schemas';
import { RecipeRenderer } from '@/components/internals/recipe-renderer';
import { mergeFieldGridHost } from '@/hooks/grid-styles';

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
		class: 'se-form-field',
		'data-se-grid-theme': host.themeId,
		style: host.style,
		children: [
			jsx('label', { for: config.id, children: label }),
			jsx('input', { id: config.id, name: config.name, 'aria-label': label, readonly: true }),
		],
	});
}

function createSsrAcceptanceEngine() {
	return createFormEngine({
		elements: [
			{
				$type: 'ssr-input',
				schema: ssrInputSchema,
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
 * grid container, or the `se-form-field` class fails this test.
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
