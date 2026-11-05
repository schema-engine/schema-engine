import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { fileURLToPath } from 'node:url';
import * as ts from 'typescript';
import * as z from 'zod/mini';
import { afterEach, expect, test, vi } from 'vitest';
import { createFormEngine } from '@schema-engine/forms';
import { createDefaultValidationRegistry, createValidationContext } from '@schema-engine/forms/schemas/validation';
import { createDebounceScope } from '@schema-engine/forms/lib/debounce';

const page = readFileSync(new URL('../src/content/docs/forms/validation-custom.mdx', import.meta.url), 'utf8');

function exampleSource(heading: string): string {
	const section = page.split(heading)[1];
	const code = section?.match(/```typescript\n([\s\S]*?)\n```/)?.[1];
	if (!code) throw new Error(`Missing TypeScript example after ${heading}`);
	return code;
}

function example(heading: string): string {
	return ts.transpileModule(exampleSource(heading), {
		compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
	}).outputText;
}

afterEach(() => {
	vi.restoreAllMocks();
	vi.useRealTimers();
});

test('the documented ABN rule delegates to the illustrative validator', () => {
	const engine = runInNewContext(`${example('### 4. Document Your Validations')}\nengine;`, {
		exports: {},
		require: (name: string) => (name === 'zod/mini' ? z : { createFormEngine }),
	}) as ReturnType<typeof createFormEngine>;
	const schema = engine.getValidationRegistry().createSchema({ type: 'australianABN' }, createValidationContext());
	expect(schema?.safeParse('example-valid').success).toBe(true);
	expect(schema?.safeParse('example-invalid').success).toBe(false);
});

test('the documented debounced async rule settles replaced checks and keeps fields independent', async () => {
	vi.useFakeTimers();
	vi.spyOn(globalThis, 'fetch').mockImplementation(
		async () => new Response(JSON.stringify({ valid: true }), { status: 200 }),
	);
	const rule = runInNewContext(`${example('### Debouncing Async Validations')}\nusernameRule;`, { exports: {} });
	const registry = createDefaultValidationRegistry();
	const debounceScope = createDebounceScope();
	const firstField = registry.createSchema(rule, createValidationContext({ fieldPath: 'first', debounceScope }));
	const secondField = registry.createSchema(rule, createValidationContext({ fieldPath: 'second', debounceScope }));
	if (!firstField || !secondField) throw new Error('Documented async rule is not registered');
	const replaced = firstField.safeParseAsync('old');
	const latest = firstField.safeParseAsync('new');
	const independent = secondField.safeParseAsync('other');
	await expect(replaced).resolves.toMatchObject({ error: { issues: [{ message: 'Validation pending' }] } });
	await vi.advanceTimersByTimeAsync(500);
	await expect(Promise.all([latest, independent])).resolves.toMatchObject([{ success: true }, { success: true }]);
});

test('the documented examples type-check for a consumer', () => {
	const fileName = fileURLToPath(new URL('./__validation_snippets__.ts', import.meta.url));
	const snippets = `${exampleSource('### 4. Document Your Validations')}\n${exampleSource('### Debouncing Async Validations')}\nimport type { ValidationRule } from '@schema-engine/forms/schemas/validation';\nconst fieldRule: ValidationRule = usernameRule;`;
	const options: ts.CompilerOptions = {
		module: ts.ModuleKind.ESNext,
		moduleResolution: ts.ModuleResolutionKind.Bundler,
		target: ts.ScriptTarget.ES2022,
		strict: true,
		skipLibCheck: true,
		noEmit: true,
	};
	const host = ts.createCompilerHost(options);
	const original = host.getSourceFile.bind(host);
	host.getSourceFile = (name, languageVersion, onError, shouldCreateNewSourceFile) =>
		name === fileName
			? ts.createSourceFile(name, snippets, languageVersion)
			: original(name, languageVersion, onError, shouldCreateNewSourceFile);
	const program = ts.createProgram([fileName], options, host);
	expect(
		ts
			.getPreEmitDiagnostics(program)
			.map((diagnostic) => ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n')),
	).toEqual([]);
});
