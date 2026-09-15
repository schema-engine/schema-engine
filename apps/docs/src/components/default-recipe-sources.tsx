import { eco } from '@ecopages/core';
import type { JsxRenderable } from '@ecopages/jsx';
import { CodeTabs } from '@/components/code-tabs';
import { defaultRecipeSources, type RecipeSourceGroup } from '@/lib/default-recipe-sources';

function isWizardRecipe(id: string) {
	return id === 'bare-controls' || id === 'wizard' || id.endsWith('-wizard');
}

function recipeTabs(recipe: RecipeSourceGroup) {
	return recipe.files.map((file) => ({
		id: file.path.replaceAll(/[^a-zA-Z0-9]+/g, '-'),
		label: file.path.replace(/^recipes\//, ''),
		code: file.code,
	}));
}

export const DefaultRecipeSources = eco.component({
	render: (): JsxRenderable => {
		const singleStep = defaultRecipeSources.recipes.filter((recipe) => !isWizardRecipe(recipe.id));
		const wizard = defaultRecipeSources.recipes.filter((recipe) => isWizardRecipe(recipe.id));

		return (
			<div class="not-prose space-y-8">
				<div class="space-y-2">
					<h3 class="text-lg font-semibold tracking-tight">Recipe registry (copy once)</h3>
					<p class="text-sm text-muted-foreground">
						Augments the form engine recipe map. Copy this file once, then copy any recipe below.
					</p>
					<CodeTabs
						label="Recipe registry"
						copyLabel="Copy file"
						tabs={[
							{
								id: 'recipe-registry',
								label: defaultRecipeSources.registry.path.replace(/^recipes\//, ''),
								code: defaultRecipeSources.registry.code,
							},
						]}
					/>
				</div>
				<div class="space-y-6">
					<h3 class="text-lg font-semibold tracking-tight">Single-step recipes</h3>
					{singleStep.map((recipe) => (
						<div class="space-y-2">
							<h4 class="text-base font-semibold tracking-tight">
								{recipe.title}{' '}
								<code class="text-sm font-normal text-muted-foreground">view.$type: '{recipe.id}'</code>
							</h4>
							<CodeTabs
								label={`${recipe.title} source files`}
								tabs={recipeTabs(recipe)}
								copyLabel="Copy file"
							/>
						</div>
					))}
				</div>
				<div class="space-y-6">
					<h3 class="text-lg font-semibold tracking-tight">Wizard recipes</h3>
					<p class="text-sm text-muted-foreground">
						Use these when the form has two or more steps. Each tab is a file; use Copy on the tab you need.
					</p>
					{wizard.map((recipe) => (
						<div class="space-y-2">
							<h4 class="text-base font-semibold tracking-tight">
								{recipe.title}{' '}
								<code class="text-sm font-normal text-muted-foreground">view.$type: '{recipe.id}'</code>
							</h4>
							<CodeTabs
								label={`${recipe.title} source files`}
								tabs={recipeTabs(recipe)}
								copyLabel="Copy file"
							/>
						</div>
					))}
				</div>
			</div>
		);
	},
});
