import { readdirSync, readFileSync } from 'node:fs';
import { join, sep } from 'node:path';
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
import { BaseFieldSchema } from '@schema-engine/forms';
import { slugifyHeadingText } from '../src/mdx/rehype-heading-ids';
import { anyValue } from './any-value';
import { codeBlocks, docsRoot, readPage, run, titledRunner, tsBlock, typecheck } from './snippet-harness';

vi.setConfig({ testTimeout: 15_000 });

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

describe('layout themes page', () => {
	const page = 'layout/layout-themes';
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
			loose: 'var(--space-block-lg, 1.5rem)',
			wide: 'var(--space-block-xl, 2rem)',
		});
	});

	test('the container theme snippet compiles a theme that measures its grid wrapper', () => {
		const { cardTheme } = run(tsBlock(page, 'Follow the container, not the window'), packages) as {
			cardTheme: layout.LayoutTheme;
		};
		expect(cardTheme.grid.query).toBe('container');
		expect(cardTheme.grid.breakpoints.md).toBe('36rem');
		expect(cardTheme.css).toContain('@container se-grid (min-width:36rem)');
	});

	test('the card snippet wraps its grid in the container of the theme it imports', () => {
		const { Card } = titledRunner(page, packages).load('card.react.tsx') as { Card: () => unknown };
		expect(JSON.stringify(Card())).toContain(layout.GRID_CONTAINER_CLASS);
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
	const page = 'layout/appearance-axes';

	test('the host axis works', () => {
		const theme = tsBlock(page, 'Add a host axis');
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
				'--se-space': 'var(--se-space-compact, var(--se-renderer-space-compact, 1rem))',
				'--se-font-size': '0.875rem',
				'--se-measure': '24rem',
				'--se-control-height':
					'var(--se-control-height-compact, var(--se-renderer-control-height-compact, 1.75rem))',
			},
			default: {
				'--se-space': 'initial',
				'--se-font-size': 'initial',
				'--se-measure': 'initial',
				'--se-control-height': 'initial',
			},
			comfortable: {
				'--se-space': 'var(--se-space-comfortable, var(--se-renderer-space-comfortable, 2rem))',
				'--se-font-size': '1.0625rem',
				'--se-measure': '32rem',
				'--se-control-height':
					'var(--se-control-height-comfortable, var(--se-renderer-control-height-comfortable, 2.25rem))',
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
			value: anyValue,
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

	test('identity tokens: one rule for each of 17 machines that no axis could hold, with an axis reading the token', () => {
		const files = titledRunner(page, packages);
		const { machineCss, machineAttributes, theme } = files.load('machine-tokens.ts') as {
			machineCss: string;
			machineAttributes: (id: string) => Record<string, string>;
			theme: layout.LayoutTheme;
		};
		const rules = machineCss.split('\n');
		expect(rules).toHaveLength(17);
		expect(rules[0]).toBe('[data-machine="sampler"] { --primary: #e4572e; }');

		const squash = (css: string) => css.replace(/\s+/g, ' ').replaceAll("'", '"').trim();
		const shown = codeBlocks(page).find((block) => block.lang === 'css' && block.heading.startsWith('Identity'));
		expect(squash(machineCss)).toContain(squash(shown?.code ?? ''));

		const { machines } = files.load('machines.helper.ts') as { machines: { id: string; color: string }[] };
		const values = Object.fromEntries(machines.map(({ id }) => [id, {}]));
		expect(() =>
			layout.defineAxis({ $type: 'machine', metadata: { name: 'Machine' }, default: 'sampler', values }),
		).toThrow(/2 to 5 values/);

		expect(machineAttributes('sampler')).toEqual({ 'data-machine': 'sampler', 'data-se-tint': 'tinted' });
		expect(theme.axes.tint).toEqual(['none', 'tinted']);
		expect(theme.css).toContain('[data-se-tint="tinted"]');
		expect(theme.css).toContain('--se-surface-background:color-mix(in srgb, var(--primary) 12%, transparent)');
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

	test('the snippets run', () => {
		const { name } = run(tsBlock(page, 'Read-only or mutable'), modules) as { name: string };
		expect(name).toBe('Tonal card');
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
		expect(engine.getAllElements().map((element) => element.$type)).toContain('input');
		expect(engine.getAllRecipes()).toEqual([]);
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
