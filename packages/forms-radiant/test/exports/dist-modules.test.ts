import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import { expect, test } from 'vitest';

/**
 * The build keeps every import between the package's own modules as a relative import of the module's own file, so the
 * published folder is a module graph that only holds together when each target was emitted. It needs `dist`, which
 * `build:lib` writes before the tests run.
 */
const packageDir = path.resolve(import.meta.dirname, '../..');
const distDir = path.join(packageDir, 'dist');

function scriptsOf(dir: string): string[] {
	return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
		const file = path.join(dir, entry.name);
		if (entry.isDirectory()) return scriptsOf(file);
		return entry.name.endsWith('.js') ? [file] : [];
	});
}

function relativeImportsOf(file: string): string[] {
	const source = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
	const specifiers: string[] = [];
	const visit = (node: ts.Node): void => {
		if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier) {
			if (ts.isStringLiteral(node.moduleSpecifier)) specifiers.push(node.moduleSpecifier.text);
		}
		if (
			ts.isCallExpression(node) &&
			node.expression.kind === ts.SyntaxKind.ImportKeyword &&
			ts.isStringLiteralLike(node.arguments[0] as ts.Node)
		) {
			specifiers.push((node.arguments[0] as ts.StringLiteral).text);
		}
		ts.forEachChild(node, visit);
	};
	visit(source);
	return specifiers.filter((specifier) => specifier.startsWith('.'));
}

test('every relative import in dist resolves to a file the build emitted', () => {
	const scripts = scriptsOf(distDir);
	expect(scripts.length).toBeGreaterThan(0);

	const unresolved = scripts.flatMap((script) =>
		relativeImportsOf(script)
			.filter((specifier) => !existsSync(path.resolve(path.dirname(script), specifier)))
			.map((specifier) => `${path.relative(distDir, script)} imports ${specifier}`),
	);

	expect(unresolved).toEqual([]);
});

test('every source module of the package, the recipes included, has its own file in dist', () => {
	const sourceDir = path.join(packageDir, 'src');
	const modules = readdirSync(sourceDir, { recursive: true, encoding: 'utf8' })
		.filter(
			(file) => /\.tsx?$/.test(file) && !/\.(d|stories|play)\.tsx?$/.test(file) && !file.startsWith('stories'),
		)
		.map((file) => file.replace(/\.tsx?$/, '.js'));

	expect(modules).toContain(path.join('recipes', 'bind-recipes.js'));
	expect(modules.filter((module) => !existsSync(path.join(distDir, module)))).toEqual([]);
});
