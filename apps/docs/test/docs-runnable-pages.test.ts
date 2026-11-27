import { describe, expect, test } from 'vitest';
import * as actionsPackage from '@schema-engine/actions';
import * as registryPackage from '@schema-engine/registry';
import * as registryYaml from '@schema-engine/registry/yaml';
import * as react from 'react';
import { createElement, type ReactElement } from 'react';
import * as reactJsxRuntime from 'react/jsx-runtime';
import * as reactServer from 'react-dom/server';
import * as v from 'valibot';
import * as z from 'zod/mini';
import * as jsxRuntime from '@ecopages/jsx/jsx-runtime';
import * as jsxServer from '@ecopages/jsx/server';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { registrationType } from './element-contract-types';
import { outputBlocks, type OutputBlock } from './format-html';
import { codeBlocks, readPage, runTitledFiles, titledRunner } from './snippet-harness';
import * as layoutPackage from '@schema-engine/layout';
import * as formsPackage from '@schema-engine/forms';
import * as radiantPackage from '@schema-engine/forms-radiant';
import * as browserPackage from '@schema-engine/forms/browser';
import * as nodeTimers from 'node:timers/promises';

const packages = {
	'@schema-engine/actions': actionsPackage,
	'@schema-engine/registry': registryPackage,
	'@schema-engine/registry/yaml': registryYaml,
	'@schema-engine/forms': formsPackage,
	'@schema-engine/forms/browser': browserPackage,
	'@schema-engine/forms-radiant': radiantPackage,
	'@schema-engine/layout': layoutPackage,
	'zod/mini': z,
	valibot: v,
	'@ecopages/jsx/jsx-runtime': jsxRuntime,
	'@ecopages/jsx/server': jsxServer,
	react,
	'react/jsx-runtime': reactJsxRuntime,
	'react-dom/server': reactServer,
	'node:timers/promises': nodeTimers,
};

const quickStart = 'schema-engine/quick-start';
const serialized = 'schema-engine/serialized-documents';

/**
 * The output fences of a page under one heading: what the page says a run prints, as {@link outputBlocks} returns it,
 * with fences of one kind that follow each other joined.
 */
const shownOutput = (page: string, heading: string): OutputBlock[] =>
	codeBlocks(page)
		.filter((block) => (block.lang === 'text' || block.lang === 'html') && block.heading === heading)
		.reduce<OutputBlock[]>((blocks, { lang, code }) => {
			const last = blocks.at(-1);
			if (last?.lang === lang) last.code = `${last.code}\n${code}`;
			else blocks.push({ lang: lang as OutputBlock['lang'], code });
			return blocks;
		}, []);

describe(quickStart, () => {
	test('main.ts prints the output the page shows', async () => {
		const lines = await runTitledFiles(quickStart, packages, 'main.ts');
		expect(await outputBlocks(lines)).toEqual(shownOutput(quickStart, 'Run it'));
	});
});

describe(serialized, () => {
	test('a bad document and a bad workflow report the issues the page shows', async () => {
		const lines = await runTitledFiles([quickStart, serialized], packages, 'bad-input.react.tsx');
		expect(await outputBlocks(lines)).toEqual(shownOutput(serialized, 'See the issues'));
	});

	test('a YAML file with a bad value reports its file, line and column', async () => {
		const lines = await runTitledFiles([quickStart, serialized], packages, 'parse-welcome.ts');
		expect(await outputBlocks(lines)).toEqual(shownOutput(serialized, 'YAML'));
	});

	test('the document the server sends is drawn by the component of the page', () => {
		const runner = titledRunner([quickStart, serialized], packages, { Response });
		const { GET } = runner.load('server.ts') as { GET: () => Response };
		const { DocumentView } = runner.load('document.react.tsx') as {
			DocumentView: (props: { nodes: unknown[] }) => ReactElement;
		};
		return GET()
			.json()
			.then((nodes: unknown[]) => {
				expect(reactServer.renderToStaticMarkup(createElement(DocumentView, { nodes }))).toBe(
					'<aside class="callout"><strong>Order 1042 confirmed</strong> Thanks for shopping with us.</aside>' +
						'<span class="badge badge-success">Paid</span>',
				);
			});
	});
});

describe('registry pages', () => {
	test('the quick start resolves, rejects and reports as the page shows', async () => {
		const lines = await runTitledFiles('registry/overview', packages, 'check.ts');
		expect(await outputBlocks(lines)).toEqual(shownOutput('registry/overview', '3. Run it'));
	});

	test('a document resolves to HTML, and a broken one reports its paths', async () => {
		const lines = await runTitledFiles('registry/resolve-a-document', packages, 'check.ts');
		expect(await outputBlocks(lines)).toEqual(shownOutput('registry/resolve-a-document', 'Use it'));
	});
});

describe('actions pages', () => {
	test('the quick start runs the workflow and prints the results the page shows', async () => {
		const lines = await runTitledFiles('actions/overview', packages, 'main.ts');
		expect(await outputBlocks(lines)).toEqual(shownOutput('actions/overview', '3. Run it and read the results'));
	});

	test('a failed charge cancels its group sibling and stops the workflow', async () => {
		const lines = await runTitledFiles('actions/sequences-and-cancellation', packages, 'cancel.ts');
		expect(await outputBlocks(lines)).toEqual(shownOutput('actions/sequences-and-cancellation', 'Cancellation'));
	});

	test('the webhook action fails with shouldContinue false on an error status', async () => {
		const { webhook } = titledRunner('actions/writing-actions', packages).load('webhook.ts') as {
			webhook: { execute: (context: unknown) => Promise<unknown> };
		};
		const result = await webhook.execute({
			fetch: async () => new Response(null, { status: 502 }),
			trigger: 'order-paid',
			signal: new AbortController().signal,
			config: { id: 'notify', $type: 'webhook', url: 'https://example.com/hooks/orders', payload: {} },
		});
		expect(result).toMatchObject({ success: false, shouldContinue: false });
		const ok = await webhook.execute({
			fetch: async () => new Response(null, { status: 200 }),
			trigger: 'order-paid',
			signal: new AbortController().signal,
			config: { id: 'notify', $type: 'webhook', url: 'https://example.com/hooks/orders', payload: {} },
		});
		expect(ok).toMatchObject({ success: true });
	});
});

describe('actions/serialized-workflows', () => {
	const page = 'actions/serialized-workflows';

	test('a valid, a bad and a cancelled run print what the page shows', async () => {
		const lines = await runTitledFiles(page, packages, 'check.ts', { settleMs: 1000 });
		expect(await outputBlocks(lines)).toEqual(shownOutput(page, 'Run three workflows'));
	});

	test('the workflow JSON the page shows parses', () => {
		const json = codeBlocks(page).find(
			(block) => block.lang === 'json' && block.heading === 'The workflow as JSON',
		)!;
		const { registry } = titledRunner(page, packages).load('shop-actions.ts') as {
			registry: actionsPackage.ActionRegistry;
		};
		expect(actionsPackage.parseActions(registry, JSON.parse(json.code)).success).toBe(true);
	});
});

/** Submits a form headlessly, as a renderer would: the runtime of the form, no host to draw it. */
async function submitHeadless(config: formsPackage.NormalizedFormConfig, engine: formsPackage.FormEngine) {
	const submitted: unknown[] = [];
	const runtime = formsPackage.createFormRuntime({
		engine,
		config,
		host: { focus: () => {} },
		onSubmit: (values) => void submitted.push(values),
	});
	runtime.mount();
	return { runtime, submitted };
}

describe('forms/getting-started', () => {
	const page = 'forms/getting-started';

	test('a broken config reports the issues the page shows', async () => {
		const lines = await runTitledFiles(page, packages, 'broken.ts');
		expect(await outputBlocks(lines)).toEqual(shownOutput(page, '2. Check a form loaded as JSON'));
	});

	test('the contact form blocks an empty submit and submits the values of the page', async () => {
		const files = titledRunner(page, packages);
		const { engine } = files.load('engine.ts') as { engine: formsPackage.FormEngine };
		const { contact } = files.load('contact.ts') as { contact: formsPackage.NormalizedFormConfig };
		const { runtime, submitted } = await submitHeadless(contact, engine);

		expect(await runtime.submit()).toBe('invalid');
		runtime.container.setValue('name', 'Ada Lovelace');
		runtime.container.setValue('email', 'ada@example.com');
		expect(await runtime.submit()).toBe('submitted');
		expect(submitted).toEqual([{ name: 'Ada Lovelace', email: 'ada@example.com' }]);
		expect(readPage(page)).toContain("`{ name: 'Ada Lovelace', email: 'ada@example.com' }`");
	});

	test('the overview rule count is the number of registered rules', () => {
		const engine = formsPackage.createFormEngine({ elements: [] });
		const overview = readPage('forms/overview');
		expect(overview).toContain(`the ${engine.getValidationRegistry().size} validation rules`);
	});
});

describe('forms/constraints', () => {
	const page = 'forms/constraints';

	test('a hidden field leaves the submission, and a required one blocks it only while shown', async () => {
		const files = titledRunner(['forms/getting-started', page], packages);
		const { engine } = files.load('engine.ts') as { engine: formsPackage.FormEngine };
		const { supportRequest } = files.load('support-request.ts') as {
			supportRequest: formsPackage.NormalizedFormConfig;
		};
		const { runtime, submitted } = await submitHeadless(supportRequest, engine);

		runtime.container.setValue('topic', 'billing');
		expect(await runtime.submit()).toBe('submitted');
		runtime.container.setValue('topic', 'order');
		expect(await runtime.submit()).toBe('invalid');
		runtime.container.setValue('orderNumber', '1042');
		expect(await runtime.submit()).toBe('submitted');
		expect(submitted).toEqual([{ topic: 'billing' }, { topic: 'order', orderNumber: '1042' }]);
	});
});

describe('forms/actions', () => {
	const page = 'forms/actions';

	test('the form validates with every registered action, and an unregistered one is a config issue', () => {
		const { contact } = titledRunner(['forms/getting-started', page], packages).load('contact-actions.ts') as {
			contact: formsPackage.NormalizedFormConfig;
		};
		expect((contact.actions ?? []).flat().map((action) => action.$type)).toEqual([
			'submit',
			'show_notification',
			'auto_save',
			'gtm_event',
			'reset',
		]);
		const bare = formsPackage.createFormEngine({ elements: [] });
		const result = bare.safeValidateForm({
			id: 'f',
			steps: [{ id: 's', title: 'S', elements: [] }],
			actions: [{ id: 'send', $type: 'submit', endpoint: '/x' }],
		});
		expect(result.success).toBe(false);
	});

	test('the auto-save example uses only options of its schema', () => {
		const json = titledRunner(['forms/getting-started', page], packages);
		const { contact } = json.load('contact-actions.ts') as { contact: formsPackage.NormalizedFormConfig };
		const draft = (contact.actions ?? []).flat().find((action) => action.$type === 'auto_save') as Record<
			string,
			unknown
		>;
		const options = [
			'$type',
			'id',
			'enabled',
			'triggers',
			...Object.keys((browserPackage.AutoSaveActionRegistration.schema as { shape: object }).shape),
		];
		expect(Object.keys(draft).filter((key) => !options.includes(key))).toEqual([]);
		expect(readPage(page)).not.toContain('debounceMs');
	});
});

describe('forms-react/components', () => {
	const registryRoot = join(import.meta.dirname, '../../../registry/shared/forms');

	/** The `$type` of every registration the generated barrel lists, read from the source files it imports. */
	function barrelTypes(): string[] {
		const barrel = readFileSync(join(registryRoot, 'registrations.ts'), 'utf8');
		const files = [...barrel.matchAll(/from '\.\/([^']+)\.registration'/g)].map((match) => match[1]!);
		return files.map((file) => {
			const registration = readFileSync(join(registryRoot, `${file}.registration.ts`), 'utf8');
			const types = readFileSync(join(registryRoot, `${file}.types.ts`), 'utf8');
			const type = registrationType(registration) ?? /\$type: z\.literal\('([^']+)'\)/.exec(types)?.[1];
			if (!type) throw new Error(`No $type found for ${file}`);
			return type;
		});
	}

	test('the table of elements equals the barrel the registry generates', () => {
		const text = readPage('forms-react/components');
		const table = text.slice(text.indexOf('## What the registry installs'), text.indexOf('## Own them'));
		const listed = [...table.matchAll(/^\|\s*((?:`[^`]+`(?:,\s*)?)+)\s*\|/gm)].flatMap((row) =>
			[...row[1]!.matchAll(/`([^`]+)`/g)].map((token) => token[1]!),
		);
		expect(listed.filter((type) => type !== '$type').toSorted()).toEqual(barrelTypes().toSorted());
	});
});

describe('forms-radiant/overview', () => {
	test('the table of elements equals the registrations barrel of the package', () => {
		const text = readPage('forms-radiant/overview');
		const table = text.slice(text.indexOf('## What ships'), text.indexOf('## When to use'));
		const listed = [...table.matchAll(/^\|\s*((?:`[^`]+`(?:,\s*)?)+)\s*\|/gm)].flatMap((row) =>
			[...row[1]!.matchAll(/`([^`]+)`/g)].map((token) => token[1]!),
		);
		const registered = radiantPackage.schemaFormRegistrations.map((registration) => registration.$type);
		expect(registered).toHaveLength(18);
		expect(listed.filter((type) => type !== '$type').toSorted()).toEqual(registered.toSorted());
	});
});

describe('layout/overview', () => {
	test('the quick start builds the section the page shows from its own files', async () => {
		const page = 'layout/overview';
		const lines = await runTitledFiles(page, packages, 'page.ts');
		expect(await outputBlocks(lines)).toEqual(shownOutput(page, 'Quick start'));
	});
});

describe('layout/recipes-outside-forms', () => {
	const page = 'layout/recipes-outside-forms';

	test('one document draws with the React and the Radiant binding of the same spec, as the page shows', async () => {
		const lines = await runTitledFiles(page, packages, 'page.ts');
		expect(await outputBlocks(lines)).toEqual(shownOutput(page, 'Render it'));
	});

	test('a bad document reports the issues the page lists, at the places it names', () => {
		const files = titledRunner(page, packages);
		const { cardSpec } = files.load('card-recipe.ts') as { cardSpec: layoutPackage.ProtocolRecipeSpec };
		const card = layoutPackage.bindRecipe(cardSpec, null);
		const scope = { axes: layoutPackage.getDefaultLayoutTheme().axes, inherited: {} };

		const unknown = layoutPackage.resolveRecipeView(card, { $type: 'card', aside: {} }, scope);
		expect(unknown.schemaIssues?.[0]).toMatchObject({
			path: ['aside'],
			message: "Recipe 'card' does not accept view key 'aside'. Allowed: shell, header, body, footer.",
		});

		const bad = layoutPackage.resolveRecipeView(card, { $type: 'card', footer: { align: 'middle' } }, scope);
		expect(
			bad.schemaIssues?.map((issue) =>
				(issue.path ?? []).map((key) => (typeof key === 'object' ? key.key : key)),
			),
		).toEqual([['footer', 'align']]);

		const axis = layoutPackage.resolveRecipeView(
			card,
			{ $type: 'card', header: { appearance: { size: 'compact' } } },
			scope,
		);
		expect(axis.issues.map((issue) => issue.path)).toEqual([['header', 'appearance', 'size']]);
	});

	test('the recipe defaults sit under the document: a level 3 heading unless the document says otherwise', () => {
		const { cardSpec } = titledRunner(page, packages).load('card-recipe.ts') as {
			cardSpec: layoutPackage.ProtocolRecipeSpec;
		};
		expect(cardSpec.slotDefaults).toEqual({ header: { level: 3 } });
		expect(cardSpec.appearanceAxes).toEqual({ shell: ['size', 'surface'] });
	});
});
