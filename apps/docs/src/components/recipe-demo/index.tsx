import { eco } from '@ecopages/core';
import type { JsxRenderable } from '@ecopages/jsx';
import { CodeTabs } from '@/components/code-tabs';
import { FormRendererPreview } from '@/components/form-renderer';
import { ReactFormDemoEmbed } from '@/components/react-form-demo/react-form-demo-embed';
import { highlightToHtml } from '@/lib/pierre-highlight';
import { recipeConfigSource, recipeYamlSources, type Recipe } from '@/lib/recipes/catalog';
import './recipe-demo.css';
import '@/lib/recipes/acme-theme.css';
import '@/lib/recipes/address-form.css';
import '@/lib/recipes/brand-frame.css';
import '@/lib/recipes/brand-tone.css';
import '@/lib/recipes/checkout-wizard.css';
import '@/lib/recipes/contact-card.css';
import '@/lib/recipes/drawn-layout.css';
import '@/lib/recipes/tight-size.css';

function tab(id: string, label: string, lang: 'ts' | 'tsx' | 'css' | 'yaml', source: string) {
	return { id, label, html: highlightToHtml(source, lang), content: source };
}

/**
 * A styling recipe: its live demos, then its source in tabs. The config tab is serialized from the
 * object the demos render, and each file tab shows the text of the file the demos run, so the
 * snippet cannot drift from the demo.
 *
 * @remarks
 * The recipe CSS files are imported here, so they load on every page that shows a recipe. Each one
 * is scoped by the class its config puts on the form.
 */
export const RecipeDemo = eco.component<{ recipe: Recipe }, JsxRenderable>({
	render: ({ recipe }) => {
		const tabs = [
			tab('config', 'config.ts', 'ts', recipeConfigSource(recipe.demos)),
			...recipe.files.map((file) => tab(file.id, file.label, file.lang, file.source)),
			...recipeYamlSources(recipe.demos).map((file) => tab(file.id, file.label, 'yaml', file.source)),
		];
		return (
			<div class="recipe-demo not-prose unstyled" data-recipe={recipe.id}>
				<div class="recipe-demo__demos">
					{recipe.demos.map((demo) => (
						<figure class="recipe-demo__demo" data-renderer={demo.renderer}>
							{demo.caption ? <figcaption class="recipe-demo__caption">{demo.caption}</figcaption> : null}
							{demo.renderer === 'react' ? (
								<ReactFormDemoEmbed config={demo.config} />
							) : (
								<FormRendererPreview config={demo.config} engine={demo.engine} />
							)}
						</figure>
					))}
				</div>
				<CodeTabs
					name={`recipe-${recipe.id}`}
					label={`${recipe.id} source files`}
					tabs={tabs}
					copyLabel="Copy file"
				/>
			</div>
		);
	},
});
