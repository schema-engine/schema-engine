import { describe, expect, test } from 'vitest';
import * as actionsPackage from '@schema-engine/actions';
import * as registryPackage from '@schema-engine/registry';
import * as registryYaml from '@schema-engine/registry/yaml';
import * as z from 'zod/mini';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
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
	'@schema-engine/layout': layoutPackage,
	'zod/mini': z,
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
		const lines = await runTitledFiles([quickStart, serialized], packages, 'bad-input.ts');
		expect(await outputBlocks(lines)).toEqual(shownOutput(serialized, 'See the issues'));
	});

	test('a YAML file with a bad value reports its file, line and column', async () => {
		const lines = await runTitledFiles([quickStart, serialized], packages, 'parse-welcome.ts');
		expect(await outputBlocks(lines)).toEqual(shownOutput(serialized, 'YAML'));
	});

	test('the document the server sends passes the client check', async () => {
		const server = titledRunner([quickStart, serialized], packages, { Response });
		const { GET } = server.load('server.ts') as { GET: () => Response };
		const client = titledRunner([quickStart, serialized], packages, { fetch: async () => GET() });
		const { loadDocument } = client.load('client.ts') as {
			loadDocument: (url: string) => Promise<{ success: boolean; data?: string[] }>;
		};
		const result = await loadDocument('https://example.com/documents/order-1042');
		expect(result).toEqual({
			success: true,
			data: [
				'<aside class="callout"><strong>Order 1042 confirmed</strong> Thanks for shopping with us.</aside>',
				'<span class="badge badge-success">Paid</span>',
			],
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

describe('forms/getting-started', () => {
	const page = 'forms/getting-started';

	test('a broken config reports its issues and a submission prints its values', async () => {
		const lines = await runTitledFiles(page, packages, 'broken.ts');
		expect(await outputBlocks(lines)).toEqual(shownOutput(page, '3. Check a form loaded as JSON'));
		const run = await runTitledFiles(page, packages, 'submit.ts', { globals: { Response, FormData } });
		expect(await outputBlocks(run)).toEqual(shownOutput(page, '4. Submit it'));
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
		const lines = await runTitledFiles(['forms/getting-started', page], packages, 'submit-support.ts', {
			globals: { Response, FormData },
		});
		expect(await outputBlocks(lines)).toEqual(shownOutput(page, 'Hidden and disabled fields do not submit'));
	});
});

describe('forms/actions', () => {
	const page = 'forms/actions';

	test('the form validates with every registered action, and an unregistered one is a config issue', () => {
		const { contact } = titledRunner(page, packages).load('contact-actions.ts') as {
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
		const json = titledRunner(page, packages);
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
			const type = /\$type: '([^']+)'/.exec(registration) ?? /\$type: z\.literal\('([^']+)'\)/.exec(types);
			if (!type) throw new Error(`No $type found for ${file}`);
			return type[1]!;
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
