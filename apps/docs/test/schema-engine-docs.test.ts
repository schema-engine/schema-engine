import { describe, expect, test } from 'vitest';
import * as actionsPackage from '@schema-engine/actions';
import * as registryPackage from '@schema-engine/registry';
import * as registryYaml from '@schema-engine/registry/yaml';
import * as z from 'zod/mini';
import { codeBlocks, runTitledFiles, titledRunner } from './snippet-harness';

const packages = {
	'@schema-engine/actions': actionsPackage,
	'@schema-engine/registry': registryPackage,
	'@schema-engine/registry/yaml': registryYaml,
	'zod/mini': z,
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
