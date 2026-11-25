import { renderToString } from '@ecopages/jsx/server';
import { jsx } from '@ecopages/jsx/jsx-runtime';
import { withRadiantServerCustomElementRenderBridge } from '@ecopages/radiant/server/radiant-element-ssr';
import { ConfiguredRuiForm } from '@/adapters/radiant/rui-form-shell';
import { RecipeRenderer } from '@/components/internals/recipe-renderer';
import {
	nestedGuestLayout,
	nestedHostTheme,
	nestedThemeForm,
	type NestedThemeFormOptions,
} from '../../../../test-utils/nested-theme-fixtures';
import { createSsrAcceptanceEngine } from './render-form-ssr-html';

await import('@/components/form-instance.script');

/** Server output of the embedded form of the nested theme acceptance, on its own engine and theme. */
export function renderNestedThemeGuestHtml(options: NestedThemeFormOptions = {}): {
	html: string;
	layout: { id: string; css: string };
} {
	return renderNestedThemeForm(nestedGuestLayout, options);
}

/** Server output of the same form on the page's own theme, to place below another theme's item. */
export function renderReenteredThemeHtml(): string {
	return renderNestedThemeForm(nestedHostTheme).html;
}

function renderNestedThemeForm(
	layout: Parameters<typeof createSsrAcceptanceEngine>[0],
	options: NestedThemeFormOptions = {},
): { html: string; layout: { id: string; css: string } } {
	const engine = createSsrAcceptanceEngine(layout);
	const config = engine.validateForm(nestedThemeForm('ssr-input', options));
	const html = withRadiantServerCustomElementRenderBridge(() =>
		renderToString(
			jsx(ConfiguredRuiForm, {
				config,
				layoutThemeId: engine.getLayout().id,
				children: RecipeRenderer({ config, engine, recipe: undefined }),
			}),
			{ mode: 'plain' },
		),
	);
	const { id, css } = engine.getLayout();
	return { html, layout: { id, css } };
}
