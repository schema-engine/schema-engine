import { renderToString } from '@ecopages/jsx/server';
import { jsx } from '@ecopages/jsx/jsx-runtime';
import { withRadiantServerCustomElementRenderBridge } from '@ecopages/radiant/server/radiant-element-ssr';
import { ConfiguredRuiForm } from '@/adapters/radiant/rui-form-shell';
import { RecipeRenderer } from '@/components/internals/recipe-renderer';
import { nestedGuestLayout, nestedThemeForm } from '../../../../test-utils/nested-theme-acceptance';
import { createSsrAcceptanceEngine } from './render-form-ssr-html';

await import('@/components/form-instance.script');

/** Server output of the embedded form of the nested theme acceptance, on its own engine and theme. */
export function renderNestedThemeGuestHtml(authorClass: boolean): {
	html: string;
	layout: { id: string; css: string };
} {
	const engine = createSsrAcceptanceEngine(nestedGuestLayout);
	const config = engine.validateForm(nestedThemeForm('ssr-input', authorClass));
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
