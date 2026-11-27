import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';
import { publicExportNames } from '../../../test-utils/entry-exports';
import { findSkillSources, PACKAGES_ROOT } from '../scripts/skill-sources';

const sources = await findSkillSources();
const packages = [...new Set(sources.references.map(({ package: pkg }) => pkg))].toSorted();

/**
 * The exports of a package that need no agent docs, each with the reason, by package.
 *
 * @remarks
 * Keep it small and empty where it can be: an export an agent can call or must type belongs in the package's
 * reference. An entry is an error once the reference names the export, so the list cannot go stale.
 */
const NEEDS_NO_AGENT_DOCS: Readonly<Record<string, Readonly<Record<string, string>>>> = {};

/** APIs a package removed or renamed, which no reference may still describe. */
const REMOVED_APIS = ['useFormInstanceActions', 'useChildGridProps', 'mergeChildrenGridHost'] as const;

const referenceText = (pkg: string) =>
	sources.references
		.filter((reference) => reference.package === pkg)
		.map(({ file }) => readFileSync(file, 'utf8'))
		.join('\n');

/** Whether the text names the export as a whole word, not as a part of a longer identifier. */
const mentions = (text: string, name: string) =>
	new RegExp(`(?<![\\w$])${name.replaceAll('$', String.raw`\$`)}(?![\\w$])`).test(text);

describe('the skill references name every public export of their package', () => {
	test.each(packages)('%s', (pkg) => {
		const text = referenceText(pkg);
		const allowed = NEEDS_NO_AGENT_DOCS[pkg] ?? {};
		const exported = publicExportNames(path.join(PACKAGES_ROOT, pkg));
		expect(exported.length).toBeGreaterThan(0);
		expect(exported.filter((name) => !mentions(text, name) && !(name in allowed))).toEqual([]);
	});

	test('an allowlisted export exists, is not named by its reference and says why it needs no docs', () => {
		for (const [pkg, allowed] of Object.entries(NEEDS_NO_AGENT_DOCS)) {
			const exported = publicExportNames(path.join(PACKAGES_ROOT, pkg));
			for (const [name, reason] of Object.entries(allowed)) {
				expect(exported, `${pkg}: ${name} is not exported`).toContain(name);
				expect(mentions(referenceText(pkg), name), `${pkg}: ${name} is documented, so drop it`).toBe(false);
				expect(reason.length, `${pkg}: ${name} needs a reason`).toBeGreaterThan(10);
			}
		}
	});

	test('no reference describes an API a package removed or renamed', () => {
		const text = sources.references.map(({ file }) => readFileSync(file, 'utf8')).join('\n');
		expect(REMOVED_APIS.filter((name) => mentions(text, name))).toEqual([]);
	});
});
