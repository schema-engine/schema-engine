import { eco } from '@ecopages/core';
import type { JsxRenderable } from '@ecopages/jsx';
import type { FormConfig } from '@schema-engine/forms';
import { FormRendererPreview } from '@/components/form-renderer';
import { ReactFormDemoEmbed } from '@/components/react-form-demo/react-form-demo-embed';
import '@/components/recipe-demo/recipe-demo.css';

/**
 * The live demos of a forms recipe: its config rendered in React and in Radiant, side by side.
 *
 * @remarks
 * Both demos render the object the recipe's config file exports, with the docs' styled kit for each renderer. The
 * recipe's own files, with their plain widgets, run in the browser tests of the recipe.
 */
export const FormRecipeDemo = eco.component<{ config: FormConfig }, JsxRenderable>({
	render: ({ config }) => (
		<div class="recipe-demo not-prose unstyled" data-recipe={config.id}>
			<div class="recipe-demo__demos">
				<figure class="recipe-demo__demo" data-renderer="react">
					<figcaption class="recipe-demo__caption">React</figcaption>
					<ReactFormDemoEmbed config={config} />
				</figure>
				<figure class="recipe-demo__demo" data-renderer="radiant">
					<figcaption class="recipe-demo__caption">Radiant</figcaption>
					<FormRendererPreview config={config} />
				</figure>
			</div>
		</div>
	),
});
