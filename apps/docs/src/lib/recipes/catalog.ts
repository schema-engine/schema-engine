import type { FormConfig } from '@schema-engine/forms/schemas';
import {
	acmeThemeConfig,
	addressFormConfig,
	brandFormConfig,
	brandFrameConfig,
	checkoutThemeConfig,
	checkoutWizardConfig,
	contactCardConfig,
	drawnLayoutConfig,
	profileThemeConfig,
	tightSizeConfig,
} from '@/lib/form-configs/recipes';
import { formConfigToCode } from '@/lib/form-config-code';
import { stringifyYaml } from '@schema-engine/registry/yaml';
import { readRecipeSource } from './read-source';

/** Radiant engines the docs previews can bind. `default` is the docs engine. */
export type DocsEngineName = 'default' | 'checkout' | 'profile';

export interface RecipeFile {
	id: string;
	label: string;
	lang: 'ts' | 'tsx' | 'css';
	source: string;
}

export interface RecipeDemo {
	renderer: 'radiant' | 'react';
	engine?: DocsEngineName;
	config: FormConfig;
	/** The variable the config tab names it by. */
	configName: string;
	caption?: string;
}

export interface Recipe {
	id: string;
	demos: RecipeDemo[];
	/** Files after the config tab: the CSS, the theme, the shell. */
	files: RecipeFile[];
}

const IMPORT_FORM_CONFIG = "import type { FormConfig } from '@schema-engine/forms/schemas';";

/** The config tab of a recipe: every demo's config as one pasteable TypeScript module. */
export function recipeConfigSource(demos: readonly RecipeDemo[]): string {
	const seen = new Set<FormConfig>();
	const configs = demos
		.filter((demo) => !seen.has(demo.config) && seen.add(demo.config))
		.map((demo) => formConfigToCode(demo.config, demo.configName));
	return `${IMPORT_FORM_CONFIG}\n\n${configs.join('\n\n')}\n`;
}

/** The same configs as YAML, one file per distinct config, for authors who write `.form.yaml`. */
export function recipeYamlSources(demos: readonly RecipeDemo[]): Array<{ id: string; label: string; source: string }> {
	const seen = new Set<FormConfig>();
	const files: Array<{ id: string; label: string; source: string }> = [];
	for (const demo of demos) {
		if (seen.has(demo.config)) continue;
		seen.add(demo.config);
		files.push({
			id: `yaml-${demo.config.id}`,
			label: `${demo.config.id}.form.yaml`,
			source: stringifyYaml(demo.config),
		});
	}
	return files;
}

function file(id: string, label: string, lang: RecipeFile['lang'], name: string): RecipeFile {
	return { id, label, lang, source: readRecipeSource(name) };
}

export const contactCardRecipe: Recipe = {
	id: 'contact-card',
	demos: [
		{ renderer: 'react', config: contactCardConfig, configName: 'contactCard', caption: 'React' },
		{ renderer: 'radiant', config: contactCardConfig, configName: 'contactCard', caption: 'Radiant' },
	],
	files: [file('css', 'contact-card.css', 'css', 'contact-card.css')],
};

export const addressFormRecipe: Recipe = {
	id: 'address-form',
	demos: [{ renderer: 'radiant', config: addressFormConfig, configName: 'addressForm' }],
	files: [file('css', 'address-form.css', 'css', 'address-form.css')],
};

export const checkoutWizardRecipe: Recipe = {
	id: 'checkout-wizard',
	demos: [{ renderer: 'radiant', config: checkoutWizardConfig, configName: 'checkoutWizard' }],
	files: [file('css', 'checkout-wizard.css', 'css', 'checkout-wizard.css')],
};

export const drawnLayoutRecipe: Recipe = {
	id: 'drawn-layout',
	demos: [{ renderer: 'radiant', config: drawnLayoutConfig, configName: 'drawnLayout' }],
	files: [file('css', 'drawn-layout.css', 'css', 'drawn-layout.css')],
};

export const brandThemeRecipe: Recipe = {
	id: 'brand-theme',
	demos: [{ renderer: 'radiant', config: brandFormConfig, configName: 'brandForm' }],
	files: [
		file('theme', 'brand-theme.ts', 'ts', 'brand-theme.ts'),
		file('css', 'brand-tone.css', 'css', 'brand-tone.css'),
	],
};

export const sharedThemeRecipe: Recipe = {
	id: 'shared-theme',
	demos: [
		{
			renderer: 'radiant',
			engine: 'checkout',
			config: checkoutThemeConfig,
			configName: 'checkoutForm',
			caption: 'checkoutEngine',
		},
		{
			renderer: 'radiant',
			engine: 'profile',
			config: profileThemeConfig,
			configName: 'profileForm',
			caption: 'profileEngine',
		},
	],
	files: [
		file('theme', 'brand-theme.ts', 'ts', 'brand-theme.ts'),
		file('engines', 'engines.ts', 'ts', 'shared-engines.ts'),
	],
};

export const tightSizeRecipe: Recipe = {
	id: 'tight-size',
	demos: [
		{ renderer: 'react', config: tightSizeConfig, configName: 'tightForm', caption: 'React' },
		{ renderer: 'radiant', config: tightSizeConfig, configName: 'tightForm', caption: 'Radiant' },
	],
	files: [file('css', 'tight-size.css', 'css', 'tight-size.css')],
};

export const brandFrameRecipe: Recipe = {
	id: 'brand-frame',
	demos: [
		{ renderer: 'react', config: brandFrameConfig, configName: 'brandFrameForm', caption: 'React' },
		{ renderer: 'radiant', config: brandFrameConfig, configName: 'brandFrameForm', caption: 'Radiant' },
	],
	files: [
		file('react', 'brand-frame.react.tsx', 'tsx', 'brand-frame.react.tsx'),
		file('radiant', 'brand-frame.radiant.tsx', 'tsx', 'brand-frame.radiant.tsx'),
		file('css', 'brand-frame.css', 'css', 'brand-frame.css'),
	],
};

export const acmeThemeRecipe: Recipe = {
	id: 'acme-theme',
	demos: [{ renderer: 'radiant', config: acmeThemeConfig, configName: 'acmeForm' }],
	files: [file('css', 'acme-theme.css', 'css', 'acme-theme.css')],
};

export const allRecipes: readonly Recipe[] = [
	contactCardRecipe,
	addressFormRecipe,
	checkoutWizardRecipe,
	drawnLayoutRecipe,
	brandThemeRecipe,
	sharedThemeRecipe,
	tightSizeRecipe,
	brandFrameRecipe,
	acmeThemeRecipe,
];
