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

/**
 * Whether a module does something when it loads: imports a script only for its effect, runs a statement at its top
 * level (`registerHostControl(...)`, `customElements.define(...)`), defines a custom element with `customElement` under
 * any local name, or calls `customElements.define` anywhere.
 *
 * @remarks
 * Stylesheet imports do not count: the build stubs them out of the JS graph and `**\/*.css` covers the stylesheets.
 */
function hasLoadTimeEffect(fileName: string, text: string): boolean {
	const source = ts.createSourceFile(fileName, text, ts.ScriptTarget.Latest, true);
	const customElementNames = new Set<string>();
	for (const statement of source.statements) {
		const bindings = ts.isImportDeclaration(statement) ? statement.importClause?.namedBindings : undefined;
		if (bindings && ts.isNamedImports(bindings)) {
			for (const element of bindings.elements) {
				if ((element.propertyName ?? element.name).text === 'customElement') {
					customElementNames.add(element.name.text);
				}
			}
		}
	}
	const runsAtTopLevel = source.statements.some(
		(statement) =>
			ts.isExpressionStatement(statement) ||
			(ts.isImportDeclaration(statement) &&
				statement.importClause === undefined &&
				ts.isStringLiteral(statement.moduleSpecifier) &&
				!statement.moduleSpecifier.text.endsWith('.css')),
	);
	let found = runsAtTopLevel;
	const visit = (node: ts.Node): void => {
		const isCustomElement =
			ts.isDecorator(node) &&
			ts.isCallExpression(node.expression) &&
			ts.isIdentifier(node.expression.expression) &&
			customElementNames.has(node.expression.expression.text);
		const isDefineCall =
			ts.isCallExpression(node) &&
			ts.isPropertyAccessExpression(node.expression) &&
			node.expression.name.text === 'define' &&
			node.expression.expression.getText(source).endsWith('customElements');
		found ||= isCustomElement || isDefineCall;
		if (!found) ts.forEachChild(node, visit);
	};
	visit(source);
	return found;
}

const isEffectful = (file: string): boolean => hasLoadTimeEffect(file, readFileSync(file, 'utf8'));

test('sideEffects names exactly the modules that have a load-time effect, so a bundler drops every other one', () => {
	const effectful = sourceModules(sourceDir)
		.filter(isEffectful)
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
	const effectful = sourceModules(sourceDir).filter(isEffectful);
	expect(effectful.length).toBeGreaterThan(20);
	expect(effectful.map((file) => path.relative(sourceDir, file))).toEqual(
		expect.arrayContaining([path.join('elements', 'inputs', 'form-phone-input.tsx'), 'index.ts']),
	);
});

test.each([
	[
		'a custom element',
		"import { customElement, RadiantElement } from '@ecopages/radiant';\n@customElement('x-a') class A extends RadiantElement {}",
	],
	[
		'a custom element under another name',
		"import { customElement as define } from '@ecopages/radiant';\n@define('x-a') class A extends HTMLElement {}",
	],
	[
		'a direct customElements.define',
		"export function register() { window.customElements.define('x-a', class extends HTMLElement {}); }\nconst ok = register;",
	],
	[
		'a call at the top level',
		"import { registerHostControl } from './host.js';\nregisterHostControl('x-a', { mode: 'owns' });",
	],
	['a script imported for its effect', "import '@ecopages/radiant-ui/checkbox';"],
])('the derivation counts %s as a load-time effect', (_kind, text) => {
	expect(hasLoadTimeEffect('probe.tsx', text)).toBe(true);
});

test('the derivation counts no effect in a module that only declares values and imports a stylesheet', () => {
	const text = [
		"import './probe.css';",
		"import { defineInput } from '@schema-engine/forms';",
		"import { customElement } from '@ecopages/radiant';",
		'export const Probe = defineInput({ $type: "probe" });',
		'export class Plain { static define() {} }',
	].join('\n');
	expect(hasLoadTimeEffect('probe.ts', text)).toBe(false);
});
