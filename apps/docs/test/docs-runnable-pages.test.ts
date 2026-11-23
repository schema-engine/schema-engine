import { describe, expect, test } from 'vitest';
import * as actionsPackage from '@schema-engine/actions';
import * as registryPackage from '@schema-engine/registry';
import * as registryYaml from '@schema-engine/registry/yaml';
import * as z from 'zod/mini';
import { codeBlocks, runTitledFiles, titledRunner } from './snippet-harness';
import * as nodeTimers from 'node:timers/promises';

const packages = {
	'@schema-engine/actions': actionsPackage,
	'@schema-engine/registry': registryPackage,
	'@schema-engine/registry/yaml': registryYaml,
	'zod/mini': z,
	'node:timers/promises': nodeTimers,
};

const quickStart = 'schema-engine/quick-start';
const serialized = 'schema-engine/serialized-documents';

/** The text fences of a page under one heading, joined: what the page says a run prints. */
const shownOutput = (page: string, heading: string): string =>
	codeBlocks(page)
		.filter((block) => block.lang === 'text' && block.heading === heading)
		.map((block) => block.code)
		.join('\n');

describe(quickStart, () => {
	test('main.ts prints the output the page shows', async () => {
		const lines = await runTitledFiles(quickStart, packages, 'main.ts');
		expect(lines.join('\n')).toEqual(shownOutput(quickStart, 'Run it'));
	});
});

describe(serialized, () => {
	test('a bad document and a bad workflow report the issues the page shows', async () => {
		const lines = await runTitledFiles([quickStart, serialized], packages, 'bad-input.ts');
		expect(lines.join('\n')).toEqual(shownOutput(serialized, 'See the issues'));
	});

	test('a YAML file with a bad value reports its file, line and column', async () => {
		const lines = await runTitledFiles([quickStart, serialized], packages, 'parse-welcome.ts');
		expect(lines.join('\n')).toEqual(shownOutput(serialized, 'YAML'));
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
		expect(lines.join('\n')).toEqual(shownOutput('registry/overview', '3. Run it'));
	});

	test('a document resolves to HTML, and a broken one reports its paths', async () => {
		const lines = await runTitledFiles('registry/resolve-a-document', packages, 'check.ts');
		expect(lines.join('\n')).toEqual(shownOutput('registry/resolve-a-document', 'Use it'));
	});
});

describe('actions pages', () => {
	test('the quick start runs the workflow and prints the results the page shows', async () => {
		const lines = await runTitledFiles('actions/overview', packages, 'main.ts');
		expect(lines.join('\n')).toEqual(shownOutput('actions/overview', '3. Run it and read the results'));
	});

	test('a failed charge cancels its group sibling and stops the workflow', async () => {
		const lines = await runTitledFiles('actions/sequences-and-cancellation', packages, 'cancel.ts');
		expect(lines.join('\n')).toEqual(shownOutput('actions/sequences-and-cancellation', 'Cancellation'));
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
		const lines = await runTitledFiles(page, packages, 'check.ts', 1000);
		expect(lines.join('\n')).toEqual(shownOutput(page, 'Run three workflows'));
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
