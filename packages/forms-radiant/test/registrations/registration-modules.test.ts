import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import { expect, test } from 'vitest';

const elementsDir = path.resolve(import.meta.dirname, '../../src/elements');

const registrationModules = readdirSync(elementsDir, { recursive: true, encoding: 'utf8' })
	.filter((file) => file.endsWith('.registration.ts'))
	.toSorted();

/** Every module a file loads: its imports, bare imports and `export ... from` included, and its dynamic `import()` calls. */
function loadedModules(text: string): string[] {
	const source = ts.createSourceFile('probe.ts', text, ts.ScriptTarget.Latest, true);
	const specifiers: string[] = [];
	const visit = (node: ts.Node): void => {
		if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier) {
			if (ts.isStringLiteral(node.moduleSpecifier)) specifiers.push(node.moduleSpecifier.text);
		}
		if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword) {
			const [argument] = node.arguments;
			specifiers.push(argument !== undefined && ts.isStringLiteralLike(argument) ? argument.text : '<computed>');
		}
		ts.forEachChild(node, visit);
	};
	visit(source);
	return specifiers;
}

test('there is one registration module per default element', () => {
	expect(registrationModules).toHaveLength(18);
});

test('the check sees every way a module can load another', () => {
	const text = `import a from './a.js'; import './b.js'; export { c } from './c.js'; export * from './d.js'; void import('./e.js');`;

	expect(loadedModules(text)).toEqual(['./a.js', './b.js', './c.js', './d.js', './e.js']);
});

test.each(registrationModules)(
	'%s imports its own widget and no other registration module or aggregate, so it loads alone',
	(file) => {
		const specifiers = loadedModules(readFileSync(path.join(elementsDir, file), 'utf8'));

		expect(specifiers.filter((specifier) => /registration|registrations|radiant-elements/.test(specifier))).toEqual(
			[],
		);
		expect(specifiers).toContain(`./${path.basename(file, '.registration.ts')}.js`);
		expect(specifiers.filter((specifier) => specifier === '<computed>')).toEqual([]);
	},
);
