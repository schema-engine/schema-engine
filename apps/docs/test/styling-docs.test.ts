import { readdirSync, readFileSync } from 'node:fs';
import { join, sep } from 'node:path';
import { runInNewContext } from 'node:vm';
import * as ts from 'typescript';
import { describe, expect, test, vi } from 'vitest';
import * as jsxRuntime from '@ecopages/jsx/jsx-runtime';
import * as layout from '@schema-engine/layout';
import * as forms from '@schema-engine/forms';
import * as radiant from '@schema-engine/forms-radiant';
import * as registryPackage from '@schema-engine/registry';
import * as formsRecipes from '@schema-engine/forms/recipes';
import * as registryYaml from '@schema-engine/registry/yaml';
import * as z from 'zod/mini';
import * as reactJsxRuntime from 'react/jsx-runtime';
import * as reactPrimitives from '@schema-engine/forms-react/primitives';
import { BaseFieldSchema } from '@schema-engine/forms/schemas/base-field';
import { docsReactFormEngine } from '../src/components/react-form-demo/demo-engine';
import { demoFormRegistrations } from '../src/components/react-form-demo/demo-registrations.react';
import { docsEngines } from '../src/lib/form-engine-setup';
import { allRecipes, recipeConfigSource, recipeYamlSources, type Recipe } from '../src/lib/recipes/catalog';
import { slugifyHeadingText } from '../src/mdx/rehype-heading-ids';

vi.setConfig({ testTimeout: 15_000 });

const docsRoot = join(import.meta.dirname, '../src/content/docs');
const recipesDir = join(import.meta.dirname, '../src/lib/recipes');
const snippetDir = join(import.meta.dirname, '__snippets__');

function readPage(page: string): string {
	return readFileSync(join(docsRoot, `${page}.mdx`), 'utf8');
}

interface CodeBlock {
	lang: string;
	code: string;
	heading: string;
}

/** Fenced code blocks of a page, each with the heading it sits under. */
function codeBlocks(page: string): CodeBlock[] {
	const blocks: CodeBlock[] = [];
	let heading = '';
	let fence: { lang: string; lines: string[] } | undefined;
	for (const line of readPage(page).split('\n')) {
		if (fence) {
			if (line.startsWith('```')) {
				blocks.push({ lang: fence.lang, code: fence.lines.join('\n'), heading });
				fence = undefined;
			} else fence.lines.push(line);
			continue;
		}
		const open = line.match(/^```(\w*)/);
		if (open) {
			fence = { lang: open[1] ?? '', lines: [] };
			continue;
		}
		const title = line.match(/^#{2,6} (.+)$/);
		if (title) heading = title[1]!.replaceAll('`', '');
	}
	return blocks;
}

function tsBlock(page: string, heading: string, index = 0): string {
	const blocks = codeBlocks(page).filter(
		(block) => block.heading === heading && /^(ts|typescript|tsx)$/.test(block.lang),
	);
	const block = blocks[index];
	if (!block) throw new Error(`No TypeScript block ${index} under "${heading}" on ${page}`);
	return block.code;
}

/** Parsed library and package declaration files, kept across programs: parsing them dominates a type-check. */
const sourceFileCache = new Map<string, ts.SourceFile | undefined>();

/** Type-checks virtual modules next to each other and returns the diagnostics per file. */
function typecheck(files: Record<string, string>): Record<string, string[]> {
	const virtual = new Map(Object.entries(files).map(([name, text]) => [join(snippetDir, name), text]));
	const options: ts.CompilerOptions = {
		module: ts.ModuleKind.ESNext,
		moduleResolution: ts.ModuleResolutionKind.Bundler,
		target: ts.ScriptTarget.ES2022,
		jsx: ts.JsxEmit.ReactJSX,
		jsxImportSource: '@ecopages/jsx',
		strict: true,
		skipLibCheck: true,
		noEmit: true,
	};
	const host = ts.createCompilerHost(options);
	const getSourceFile = host.getSourceFile.bind(host);
	const fileExists = host.fileExists.bind(host);
	const readFile = host.readFile.bind(host);
	const directoryExists = host.directoryExists?.bind(host);
	host.directoryExists = (name) => name === snippetDir || (directoryExists?.(name) ?? false);
	host.fileExists = (name) => virtual.has(name) || fileExists(name);
	host.readFile = (name) => virtual.get(name) ?? readFile(name);
	host.getSourceFile = (name, languageVersion, onError, shouldCreate) => {
		if (virtual.has(name)) return ts.createSourceFile(name, virtual.get(name)!, languageVersion);
		if (!sourceFileCache.has(name))
			sourceFileCache.set(name, getSourceFile(name, languageVersion, onError, shouldCreate));
		return sourceFileCache.get(name);
	};
	const program = ts.createProgram([...virtual.keys()], options, host);
	const result: Record<string, string[]> = {};
	for (const name of Object.keys(files)) {
		const source = program.getSourceFile(join(snippetDir, name));
		result[name] = ts
			.getPreEmitDiagnostics(program, source)
			.map((diagnostic) => ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'));
	}
	return result;
}

/** Runs a snippet as a CommonJS module with the given modules and returns its exports. */
function run(code: string, modules: Record<string, unknown>): Record<string, unknown> {
	const output = ts.transpileModule(code, {
		compilerOptions: {
			target: ts.ScriptTarget.ES2022,
			module: ts.ModuleKind.CommonJS,
			jsx: ts.JsxEmit.ReactJSX,
			jsxImportSource: code.includes('@jsxImportSource react') ? 'react' : '@ecopages/jsx',
		},
	}).outputText;
	const exports: Record<string, unknown> = {};
	runInNewContext(output, {
		exports,
		require: (name: string) => {
			if (!(name in modules)) throw new Error(`Unexpected import ${name}`);
			return modules[name];
		},
	});
	return exports;
}

const packages = {
	'@schema-engine/layout': layout,
	'@schema-engine/forms': forms,
	'@schema-engine/forms-radiant': radiant,
	'@schema-engine/registry': registryPackage,
	'@schema-engine/registry/yaml': registryYaml,
	'zod/mini': z,
	'@schema-engine/forms/recipes': formsRecipes,
	'@schema-engine/forms-react/primitives': reactPrimitives,
	'@ecopages/jsx/jsx-runtime': jsxRuntime,
	'react/jsx-runtime': reactJsxRuntime,
};

const REGISTRATIONS = "export { schemaFormRegistrations as elements } from '@schema-engine/forms-radiant';";
const ENGINE = `import { createRadiantFormEngine, schemaFormRegistrations } from '@schema-engine/forms-radiant';
export const engine = createRadiantFormEngine({ elements: schemaFormRegistrations });`;
const POSTAL_CODE = `import * as z from 'zod/mini';
export const postalCode = {
	$type: 'postalCode',
	schema: z.object({ type: z.literal('postalCode'), message: z.optional(z.string()) }),
	metadata: { name: 'Postal code' },
	category: 'string',
	handler: () => z.string(),
} as const;`;

const files = (recipe: Recipe) => Object.fromEntries(recipe.files.map((file) => [file.label, file.source]));
const byId = (id: string): Recipe => allRecipes.find((recipe) => recipe.id === id)!;
const mood = (values: Record<string, Record<string, string>>, fallback = 'a') =>
	layout.defineAxis({ $type: 'mood', metadata: { name: 'Mood' }, default: fallback, values });
const stepsForm = (stepGrid?: Record<string, unknown>) => ({
	id: 'f',
	grid: { areas: ['a b'] },
	steps: [
		{
			id: 's1',
			title: 'One',
			elements: [
				{ $type: 'input', id: 'a', name: 'a', grid: { area: 'a' } },
				{ $type: 'input', id: 'b', name: 'b', grid: { area: 'b' } },
			],
		},
		{ id: 's2', title: 'Two', elements: [], ...(stepGrid ? { grid: stepGrid } : {}) },
	],
});
function pages(): Map<string, string> {
	const map = new Map<string, string>();
	for (const file of readdirSync(docsRoot, { recursive: true }) as string[]) {
		if (!file.endsWith('.mdx')) continue;
		map.set(
			`/docs/${file
				.split(sep)
				.join('/')
				.replace(/\.mdx$/, '')}`,
			readFileSync(join(docsRoot, file), 'utf8'),
		);
	}
	return map;
}
function anchors(text: string): Set<string> {
	const used = new Set<string>();
	let fenced = false;
	for (const line of text.split('\n')) {
		if (line.startsWith('```')) fenced = !fenced;
		const match = !fenced && line.match(/^(#{2,6}) (.+)$/);
		if (!match) continue;
		const base = slugifyHeadingText(match[2]!.replaceAll('`', '')) || 'section';
		let id = base;
		for (let suffix = 2; used.has(id); suffix += 1) id = `${base}-${suffix}`;
		used.add(id);
	}
	return used;
}

describe('snippet harness', () => {
	test('reports a type error, and resolves a relative module of the virtual set', () => {
		const result = typecheck({
			'bad.ts': "import { x } from './other';\nconst n: number = x;",
			'other.ts': "export const x = 'a';",
		});
		expect(result['bad.ts']).toEqual(["Type 'string' is not assignable to type 'number'."]);
		expect(result['other.ts']).toEqual([]);
	});
});

describe('styling recipes', () => {
	test('every recipe is shown on a page', () => {
		const shown = ['styling/recipes', 'styling/theming'].map(readPage).join('\n');
		for (const recipe of allRecipes) {
			const name = `${recipe.id.replace(/-(\w)/g, (_, letter: string) => letter.toUpperCase())}Recipe`;
			expect(shown, recipe.id).toContain(`recipe={${name}}`);
		}
	});

	test.each(allRecipes.flatMap((recipe) => recipe.demos.map((demo) => [recipe.id, demo] as const)))(
		'the %s demo config validates in the engine its demo renders with',
		(_id, demo) => {
			const engine = demo.renderer === 'react' ? docsReactFormEngine : docsEngines[demo.engine ?? 'default'];
			expect(() => engine.validateForm(demo.config)).not.toThrow();
		},
	);

	test('the config tab of every recipe type-checks on its own', () => {
		const sources = Object.fromEntries(
			allRecipes.map((recipe) => [`${recipe.id}.config.ts`, recipeConfigSource(recipe.demos)]),
		);
		expect(typecheck(sources)).toEqual(Object.fromEntries(Object.keys(sources).map((name) => [name, []])));
	});

	test('every recipe file imports only packages and the files of its own recipe', () => {
		for (const recipe of allRecipes) {
			for (const file of recipe.files) {
				const imports = [...file.source.matchAll(/from '([^']+)'/g)].map((match) => match[1]!);
				for (const specifier of imports) {
					const known =
						/^(@schema-engine\/|@ecopages\/|zod\/mini$)/.test(specifier) || specifier.startsWith('./');
					expect(known, `${file.label} imports ${specifier}`).toBe(true);
					if (specifier.startsWith('./')) {
						expect(
							recipe.files.map((other) => other.label),
							`${file.label} imports ${specifier}`,
						).toContain(`${specifier.slice(2)}.ts`);
					}
				}
			}
		}
	});

	test('the YAML tab of every recipe reads back as the config', () => {
		for (const recipe of allRecipes) {
			for (const demo of recipe.demos) {
				const engine = demo.renderer === 'react' ? docsReactFormEngine : docsEngines[demo.engine ?? 'default'];
				const yaml = recipeYamlSources([demo])[0]!;
				const parsed = registryYaml.parseYaml(yaml.source, (value) => engine.safeValidateForm(value), {
					filename: yaml.label,
				});
				expect(parsed, recipe.id).toEqual(engine.validateForm(demo.config));
			}
		}
	});

	test('recipes run in an app built as the getting-started page says', () => {
		const theme = run(files(byId('brand-theme'))['brand-theme.ts']!, packages) as {
			brandTheme: layout.LayoutTheme;
		};
		const engines = run(files(byId('shared-theme'))['engines.ts']!, { ...packages, './brand-theme': theme }) as {
			checkoutEngine: forms.FormEngine;
			profileEngine: forms.FormEngine;
		};
		expect(engines.checkoutEngine.getLayout()).toBe(engines.profileEngine.getLayout());
		expect(engines.checkoutEngine.getLayout().id).toBe(docsEngines.default.getLayout().id);

		const plain = radiant.createRadiantFormEngine({ elements: radiant.schemaFormRegistrations });
		const themed = radiant.createRadiantFormEngine({
			elements: radiant.schemaFormRegistrations,
			layout: theme.brandTheme,
		});
		const radiantFrame = run(files(byId('brand-frame'))['brand-frame.radiant.tsx']!, packages) as {
			BrandFrameRecipe: forms.RecipeRegistrationConstraint;
		};
		const framed = radiant.createRadiantFormEngine({
			elements: radiant.schemaFormRegistrations,
			recipes: [radiantFrame.BrandFrameRecipe],
		});
		const reactFrame = run(files(byId('brand-frame'))['brand-frame.react.tsx']!, packages) as {
			BrandFrameRecipe: forms.RecipeRegistrationConstraint;
		};
		const reactFramed = forms.createFormEngine({
			elements: demoFormRegistrations,
			recipes: [reactFrame.BrandFrameRecipe],
		});

		for (const recipe of allRecipes) {
			const engine = ['brand-theme', 'shared-theme'].includes(recipe.id)
				? themed
				: recipe.id === 'brand-frame'
					? framed
					: plain;
			for (const demo of recipe.demos) {
				expect(() => engine.validateForm(demo.config), recipe.id).not.toThrow();
			}
		}
		expect(() => reactFramed.validateForm(byId('brand-frame').demos[0]!.config)).not.toThrow();
		expect(() => plain.validateForm(byId('brand-theme').demos[0]!.config)).toThrow(/Unknown axis 'tone'/);
	});
});

describe('layout themes page', () => {
	const page = 'styling/layout-themes';
	const modules = { ...packages, './registrations': { elements: radiant.schemaFormRegistrations } };

	test('the compile snippet gives the documented grid', () => {
		const { theme } = run(tsBlock(page, 'Compile a theme'), packages) as { theme: layout.LayoutTheme };
		expect(theme.grid.breakpoints.md).toBe('50rem');
		expect(theme.grid.minColumnWidth).toBe('14rem');
		expect(theme.grid.gap.default).toBe('1rem');
		expect(theme.grid.responsive.lg).toEqual({ default: '1.5rem' });
		expect(layout.createLayoutTheme().grid.breakpoints).toEqual({
			sm: '40rem',
			md: '48rem',
			lg: '64rem',
			xl: '80rem',
			'2xl': '96rem',
		});
		expect(layout.createLayoutTheme().grid.minColumnWidth).toBe('15.625rem');
		expect(layout.createLayoutTheme().grid.gap).toEqual({
			none: '0',
			compact: '0.5rem',
			default: 'var(--space-stack, 1rem)',
			loose: 'var(--space-6, 1.5rem)',
			wide: 'var(--space-8, 2rem)',
		});
	});

	test('an engine takes inline options or a compiled theme and keeps the theme it is given', () => {
		const output = run(tsBlock(page, 'Inline or compiled'), modules) as {
			inline: forms.FormEngine;
			compiled: forms.FormEngine;
			theme: layout.LayoutTheme;
		};
		expect(output).toBeDefined();
		const copy = { ...layout.createLayoutTheme() };
		expect(() => forms.createFormEngine({ layout: copy as never })).toThrow(
			/Invalid layout option: unknown key 'id'/,
		);
	});

	test('engines on one theme share it', () => {
		const { sameTheme } = run(tsBlock(page, 'Share a theme between engines'), modules) as { sameTheme: boolean };
		expect(sameTheme).toBe(true);
		const theme = layout.createLayoutTheme();
		expect(forms.createFormEngine({ layout: theme }).extend().getLayout()).toBe(theme);
	});

	test('the hand-built host writes the hooks, the stylesheet and the item variables', () => {
		const { renderSection } = run(tsBlock(page, 'A hand-built host'), packages) as { renderSection: () => string };
		const html = renderSection();
		expect(html).toContain('<style>');
		expect(html).toContain('class="se-grid"');
		expect(html).toContain('class="se-grid-item"');
		expect(html).toContain('data-se-size="compact"');
		expect(html).toContain('--se-item-grid-column:span 6');
		expect(html).toMatch(/data-se-theme="l[0-9a-z]+"/);
	});

	test('a theme rejects an axis named like a renderer attribute', () => {
		expect(() => run(tsBlock(page, 'A theme for a new domain'), packages)).toThrow(/step/);
		const clash = layout.defineAxis({
			$type: 'theme',
			metadata: { name: 'Theme' },
			default: 'a',
			values: { a: {}, b: {} },
		});
		expect(() => forms.createFormEngine({ layout: { appearance: [...layout.builtInAxes, clash] } })).toThrow(
			/theme/,
		);
	});

	test('the item custom properties named on the page are the ones the compiler writes', () => {
		const variables = layout.getGridItemVariables({
			width: 'half',
			row: 2,
			placeSelf: 'center',
			marginBlockStart: 'loose',
			marginBlockEnd: 'compact',
			responsive: { md: { hidden: true } },
		});
		const documented = [
			'--se-item-grid-column',
			'--se-item-grid-row',
			'--se-item-justify-self',
			'--se-item-align-self',
			'--se-item-margin-block-start',
			'--se-item-margin-block-end',
			'--se-item-display-md',
		];
		expect(Object.keys(variables).toSorted()).toEqual(documented.toSorted());
		const pageText = readPage(page);
		for (const name of [...documented.slice(0, -1), '--se-item-display', '--se-item-display-mode']) {
			expect(pageText, name).toContain(name);
		}
	});
});

describe('appearance axes page', () => {
	const page = 'styling/appearance-axes';

	test('the documented snippets type-check and the host axis works', () => {
		const theme = tsBlock(page, 'Add a host axis');
		const diagnostics = typecheck({
			'registrations.ts': REGISTRATIONS,
			'engine.ts': ENGINE,
			'theme.ts': theme,
			'pick-a-value.ts': tsBlock(page, 'Pick a value'),
			'settings.ts': tsBlock(page, ''),
			'notice.ts': tsBlock(page, 'Declare the axes a registration supports'),
			'newsletter.ts': tsBlock(page, 'Add a host axis', 1),
			'override.ts': tsBlock(page, 'Override a built-in axis'),
		});
		expect(diagnostics).toEqual(Object.fromEntries(Object.keys(diagnostics).map((name) => [name, []])));

		const { theme: compiled } = run(theme, packages) as { theme: layout.LayoutTheme };
		expect(compiled.axes.tone).toEqual(['neutral', 'brand', 'forest']);
		const engine = forms.createFormEngine({ elements: radiant.schemaFormRegistrations, layout: compiled });
		const config = engine.validateForm({
			id: 'newsletter',
			appearance: { tone: 'brand' },
			steps: [{ id: 'signup', title: 'Sign up', elements: [] }],
		});
		expect(config.appearance).toEqual({ tone: 'brand' });
	});

	test('the built-in tokens match the tables', () => {
		const axes = Object.fromEntries(layout.builtInAxes.map((axis) => [axis.$type, axis.values]));
		expect(axes.size).toEqual({
			compact: {
				'--se-space': 'var(--se-space-compact, var(--se-host-space-compact, 1rem))',
				'--se-font-size': '0.875rem',
				'--se-measure': '24rem',
				'--se-control-height':
					'var(--se-control-height-compact, var(--se-host-control-height-compact, 1.75rem))',
			},
			default: {
				'--se-space': 'initial',
				'--se-font-size': 'initial',
				'--se-measure': 'initial',
				'--se-control-height': 'initial',
			},
			comfortable: {
				'--se-space': 'var(--se-space-comfortable, var(--se-host-space-comfortable, 2rem))',
				'--se-font-size': '1.0625rem',
				'--se-measure': '32rem',
				'--se-control-height':
					'var(--se-control-height-comfortable, var(--se-host-control-height-comfortable, 2.25rem))',
			},
		});
		expect(axes.surface).toEqual({
			flat: { '--se-border-width': '0', '--se-shadow': 'none', '--se-surface-background': 'initial' },
			outlined: { '--se-border-width': '1px', '--se-shadow': 'none', '--se-surface-background': 'initial' },
			elevated: {
				'--se-border-width': 'initial',
				'--se-shadow': 'initial',
				'--se-surface-background': 'initial',
			},
		});
		expect(layout.builtInAxes.map((axis) => axis.default)).toEqual(['default', 'elevated']);
	});

	test('a bad pick fails with the documented messages and paths', () => {
		const engine = radiant.createRadiantFormEngine({ elements: radiant.schemaFormRegistrations });
		const issues = (appearance: unknown, element?: Record<string, unknown>) => {
			const result = engine.safeValidateForm({
				id: 'f',
				appearance,
				steps: [{ id: 's', title: 'S', elements: element ? [element] : [] }],
			});
			return result.success ? [] : result.issues;
		};
		expect(issues({ sise: 'compact' })[0]).toMatchObject({
			message: "Unknown axis 'sise'. Declared axes: size, surface.",
			path: ['appearance', 'sise'],
		});
		expect(issues({ size: 'huge' })[0]).toMatchObject({
			message: "'huge' is not a value of 'size'. Allowed: compact, default, comfortable.",
			path: ['appearance', 'size'],
		});
		const field = { $type: 'input', id: 'a', name: 'a', appearance: { surface: 'flat' } };
		const [issue] = issues(undefined, field);
		expect(issue?.message).toMatch(/does not support the axis 'surface'. Supported axes: size\./);
		expect(issue?.path).toEqual(['steps', 0, 'elements', 0, 'appearance', 'surface']);
	});

	test('an engine build names the registration that declares an unknown axis', () => {
		const notice = forms.defineInput({
			$type: 'notice',
			appearanceAxes: ['tone'],
			schema: z.extend(BaseFieldSchema, { $type: z.literal('notice') }),
			metadata: { name: 'Notice', category: 'content' },
			render: () => null,
		});
		expect(() => forms.createFormEngine({ elements: [notice] })).toThrow(
			"Element 'notice' declares unknown appearance axis 'tone'. Declared axes: size, surface. Add it with createFormEngine({ layout: { appearance: [...builtInAxes, defineAxis({ $type: 'tone', ... })] } }).",
		);
	});

	test('defineAxis enforces the documented limits', () => {
		expect(() => mood({ a: {} })).toThrow(/2 to 5 values/);
		expect(() => mood({ a: {}, b: {}, c: {}, d: {}, e: {}, f: {} })).toThrow(/2 to 5 values/);
		expect(() => mood({ a: { color: 'red' }, b: {} })).toThrow(/start with '--'/);
		expect(() => mood({ a: { '--x': 'red; color: blue' }, b: {} })).toThrow(/Invalid appearance token value/);
		expect(() => mood({ a: {}, b: {} }, 'c')).toThrow(/default 'c' is not one of its values/);
		expect(() =>
			layout.defineAxis({ $type: 'Mood', metadata: { name: 'Mood' }, default: 'a', values: { a: {}, b: {} } }),
		).toThrow(/Invalid appearance axis name/);
	});
});

describe('registries page', () => {
	const page = 'registry/registries';
	const modules = { ...packages };

	test('the snippets type-check and run', () => {
		const diagnostics = typecheck({
			'registrations.ts': REGISTRATIONS,
			'postal-code.ts': POSTAL_CODE,
			'brand-frame.ts': `export { BrandFrameRecipe } from '${join(recipesDir, 'brand-frame.radiant')}';`,
			'widgets.ts': tsBlock(page, 'Read-only or mutable'),
			'engine.ts': tsBlock(page, 'What the forms engine registers'),
			'catalog.ts': tsBlock(page, 'The catalog'),
			'section.ts': tsBlock(page, 'Add a registration kind of your own'),
			'plugins.ts': tsBlock(page, 'The mutable registry'),
		});
		expect(diagnostics).toEqual(Object.fromEntries(Object.keys(diagnostics).map((name) => [name, []])));

		const { name } = run(tsBlock(page, 'Read-only or mutable'), modules) as { name: string };
		expect(name).toBe('Tonal card');
		const { html } = run(tsBlock(page, 'Add a registration kind of your own'), modules) as { html: string };
		expect(html).toBe('<section class="hero"><h1>Welcome</h1></section>');
	});

	test('the engine example fills the catalog as documented', () => {
		const tone = layout.defineAxis({
			$type: 'tone',
			metadata: { name: 'Tone' },
			default: 'neutral',
			values: { neutral: {}, brand: { '--primary': '#c2410c' } },
		});
		const engine = forms.createFormEngine({
			elements: radiant.schemaFormRegistrations,
			layout: { appearance: [...layout.builtInAxes, tone] },
		});
		const catalog = engine.getSchemaCatalog();
		expect(catalog.get('axis:tone')?.title).toBe('Tone');
		expect(catalog.get('element:input')?.componentType).toBe('element');
		expect(catalog.getAll().map((entry) => entry.id)).toContain('axis:size');
		expect(engine.getValidationRegistry().kind).toBe('Validation');
		expect(engine.extend().getLayout()).toBe(engine.getLayout());
	});

	test('a schema that is not a Standard Schema fails the build with the documented message', () => {
		expect(() =>
			registryPackage.createRegistry('Widget', [
				{ $type: 'card', schema: {} as never, metadata: { name: 'Card' } },
			]),
		).toThrow("Widget 'card' schema must implement Standard Schema (~standard.validate).");
	});
});

describe('core concepts page', () => {
	test('a step with no fields under a form-level areas needs its own grid', () => {
		const engine = radiant.createRadiantFormEngine({ elements: radiant.schemaFormRegistrations });
		expect(engine.safeValidateForm(stepsForm()).success).toBe(false);
		expect(engine.safeValidateForm(stepsForm({})).success).toBe(true);
	});
});

describe('docs links', () => {
	test('every internal link and fragment resolves to a page and a heading', () => {
		const all = pages();
		const broken: string[] = [];
		for (const [path, text] of all) {
			const prose = text.replace(/```[\s\S]*?```/g, '');
			for (const match of prose.matchAll(/\]\((\/docs\/[^)\s]*|#[^)\s]*)\)/g)) {
				const [target, fragment] = match[1]!.split('#');
				const page = target ? target : path;
				const body = all.get(page);
				if (!body) broken.push(`${path} -> ${match[1]} (no page)`);
				else if (fragment && !anchors(body).has(fragment)) broken.push(`${path} -> ${match[1]} (no heading)`);
			}
		}
		expect(broken).toEqual([]);
	});
});
