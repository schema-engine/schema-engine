import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from 'vitest';

const dist = fileURLToPath(new URL('../../dist/', import.meta.url));
const agentTool = path.join(dist, 'agent-tool');

const IMPORT = /(?:\bfrom|\bimport)\s*\(?\s*["']([^"']+)["']/g;

const filesUnder = (extension: string) =>
	readdirSync(dist, { recursive: true, withFileTypes: true })
		.filter((entry) => entry.isFile() && entry.name.endsWith(extension))
		.map((entry) => path.join(entry.parentPath, entry.name))
		.filter((file) => !file.startsWith(`${agentTool}${path.sep}`));

/** The built files `file` imports by a relative specifier. */
const reaches = (file: string) =>
	[...readFileSync(file, 'utf8').matchAll(IMPORT)]
		.map((match) => match[1] ?? '')
		.filter((specifier) => specifier.startsWith('.'))
		.map((specifier) => path.resolve(path.dirname(file), specifier));

test('no other entry, chunk or declaration of the package reaches the agent-tool entry', () => {
	const scripts = filesUnder('.js');
	const declarations = filesUnder('.d.ts');
	expect(scripts.length).toBeGreaterThan(10);
	expect(declarations.length).toBeGreaterThan(10);

	const reachingAgentTool = [...scripts, ...declarations].filter((file) =>
		reaches(file).some((target) => target.startsWith(agentTool)),
	);
	expect(reachingAgentTool.map((file) => path.relative(dist, file))).toEqual([]);
});

test('the agent-tool entry is the only published path to the feature', () => {
	const { exports } = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8')) as {
		exports: Record<string, unknown>;
	};
	expect(Object.keys(exports).filter((key) => key.includes('agent-tool'))).toEqual(['./agent-tool']);

	const defining = [...filesUnder('.js'), ...filesUnder('.d.ts')].filter((file) =>
		readFileSync(file, 'utf8').includes('registerFormAgentTool'),
	);
	expect(defining).toEqual([]);
});
