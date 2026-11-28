import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import { expect, test } from 'vitest';

const packageDir = path.resolve(import.meta.dirname, '../..');
const sourceDir = path.join(packageDir, 'src');

/** The scripts the build emits, which is every module of `src` that is not a type declaration, a story or a play function. */
function sourceModules(dir: string): string[] {
	return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
		const file = path.join(dir, entry.name);
		if (entry.isDirectory()) return entry.name === 'stories' ? [] : sourceModules(file);
		const isScript = /\.tsx?$/.test(entry.name) && !/\.(d|stories|play)\.tsx?$/.test(entry.name);
		return isScript ? [file] : [];
	});
}

/** Whether a module defines a custom element with `@customElement`, or imports a module only for its effect. */
function hasLoadTimeEffect(file: string): boolean {
	const source = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
	let found = false;
	const visit = (node: ts.Node): void => {
		const isBareScriptImport =
			ts.isImportDeclaration(node) &&
			node.importClause === undefined &&
			ts.isStringLiteral(node.moduleSpecifier) &&
			!node.moduleSpecifier.text.endsWith('.css');
		const isCustomElement =
			ts.isDecorator(node) &&
			ts.isCallExpression(node.expression) &&
			ts.isIdentifier(node.expression.expression) &&
			node.expression.expression.text === 'customElement';
		found ||= isBareScriptImport || isCustomElement;
		ts.forEachChild(node, visit);
	};
	visit(source);
	return found;
}

test('sideEffects names exactly the modules that have a load-time effect, so a bundler drops every other one', () => {
	const effectful = sourceModules(sourceDir)
		.filter(hasLoadTimeEffect)
		.map((file) => path.relative(sourceDir, file).replace(/\.tsx?$/, ''));
	const derived = effectful.map((module) => `./dist/${module}.js`).toSorted();

	const { sideEffects } = JSON.parse(readFileSync(path.join(packageDir, 'package.json'), 'utf8')) as {
		sideEffects: string[];
	};
	const scripts = sideEffects.filter((entry) => !entry.endsWith('.css')).toSorted();

	expect(scripts).toEqual(derived);
	expect(sideEffects.filter((entry) => entry.endsWith('.css'))).toEqual(['**/*.css']);
});

test('the derivation finds the custom elements, so the list above cannot be empty by accident', () => {
	const effectful = sourceModules(sourceDir).filter(hasLoadTimeEffect);
	expect(effectful.length).toBeGreaterThan(20);
	expect(effectful.map((file) => path.relative(sourceDir, file))).toEqual(
		expect.arrayContaining([path.join('elements', 'inputs', 'form-phone-input.tsx'), 'index.ts']),
	);
});
