import assert from 'node:assert/strict';
import { existsSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { symbolsFromOtherPackages, symbolsSharedByEntries } from '../test-utils/entry-exports.ts';

const packagesDir = path.resolve(import.meta.dirname, '../packages');
const packages = readdirSync(packagesDir)
	.map((name) => path.join(packagesDir, name))
	.filter((dir) => existsSync(path.join(dir, 'package.json')));

const violations = packages.flatMap((dir) => {
	const name = path.basename(dir);
	return [
		...symbolsFromOtherPackages(dir).map((symbol) => `${name} exports a foreign symbol: ${symbol}`),
		...symbolsSharedByEntries(dir).map((symbol) => `${name} exports a symbol more than once: ${symbol}`),
	];
});
assert.deepEqual(violations, [], violations.join('\n'));

/**
 * Imports through the published entries after the build. Bundling the same module into both entries would
 * create two classes, so an error from the JSON Schema entry could not be caught as the root RegistryError.
 */
async function assertRegistryErrorIdentity(): Promise<void> {
	const registry = '@schema-engine/registry';
	const [{ RegistryError }, { replaceChildSlot }] = await Promise.all([
		import(registry),
		import(`${registry}/json-schema`),
	]);
	assert.equal(typeof RegistryError, 'function', 'The registry root must export RegistryError');
	assert.throws(
		() => replaceChildSlot({}, { $type: 'box', keys: [] }, {}, { target: 'draft-2020-12' }),
		RegistryError,
	);
}

await assertRegistryErrorIdentity();
process.stdout.write('[check-dist-exports] each export has one owner and registry entries share RegistryError\n');
