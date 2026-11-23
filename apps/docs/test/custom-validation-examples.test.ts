import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { fileURLToPath } from 'node:url';
import * as ts from 'typescript';
import * as z from 'zod/mini';
import { afterEach, expect, test, vi } from 'vitest';
import { createFormEngine, defineInput } from '@schema-engine/forms';
import { BaseFieldSchema } from '@schema-engine/forms/schemas';
import {
	createDefaultValidationRegistry,
	createValidationContext,
	ValidationSuperseded,
} from '@schema-engine/forms/schemas/validation';
import { createDebounceScope } from '@schema-engine/forms/lib/debounce';

const page = readFileSync(new URL('../src/content/docs/forms/validation-custom.mdx', import.meta.url), 'utf8');

function exampleSource(heading: string, index = 0): string {
	const section = page.split(heading)[1];
	const code = [...(section?.matchAll(/```typescript\n([\s\S]*?)\n```/g) ?? [])][index]?.[1];
	if (!code) throw new Error(`Missing TypeScript example ${index} after ${heading}`);
	return code;
}

function example(heading: string, index = 0): string {
	return ts.transpileModule(exampleSource(heading, index), {
		compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
	}).outputText;
}

vi.setConfig({ testTimeout: 15_000 });

/** Parsed library and package declaration files, kept across programs: parsing them dominates a type-check. */
const sourceFileCache = new Map<string, ts.SourceFile | undefined>();

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

test('the documented postal code rule reports its message through the engine', () => {
	const { engine, postalCodeField } = runInNewContext(`${example('### Simple Custom Validation')}\nexports;`, {
		exports: {},
		require: (name: string) => (name === 'zod/mini' ? z : { createFormEngine }),
	}) as { engine: ReturnType<typeof createFormEngine>; postalCodeField: { rules: Array<{ type: string }> } };
	const schema = engine.getValidationRegistry().createSchema(postalCodeField.rules[1], createValidationContext());
	expect(schema?.safeParse('12345-6789').success).toBe(true);
	expect(schema?.safeParse('nope').error?.issues[0]?.message).toBe('Please enter a valid postal code');
});

test('the documented form uses a registered rule in the rules of an element, and rejects an unregistered one', () => {
	const { engine, form } = runInNewContext(`${example('### Use the Rule in a Form')}\nexports;`, {
		exports: {},
		require: (name: string) => {
			if (name === 'zod/mini') return z;
			if (name === '@schema-engine/forms') return { createFormEngine, defineInput };
			if (name === '@schema-engine/forms/schemas') return { BaseFieldSchema };
			throw new Error(`Unexpected import ${name}`);
		},
	}) as {
		engine: ReturnType<typeof createFormEngine>;
		form: { steps: Array<{ elements: Array<{ rules: unknown[] }> }> };
	};
	expect(form.steps[0]?.elements[0]?.rules).toEqual([
		{ type: 'postalCode', country: 'ca', message: 'Enter a Canadian postal code' },
	]);
	const field = (rule: unknown) => ({
		id: 'address',
		steps: [{ id: 'main', title: 'Address', elements: [{ $type: 'text', id: 'zip', name: 'zip', rules: [rule] }] }],
	});
	expect(engine.safeValidateForm(field({ type: 'postalcode' }))).toMatchObject({
		success: false,
		issues: [{ message: /^Unknown validation rule 'postalcode'\. Register it with/ }],
	});
	expect(engine.safeValidateForm(field({ type: 'postalCode', country: 'mx' }))).toMatchObject({
		success: false,
		issues: [{ path: ['steps', 0, 'elements', 0, 'rules', 0, 'country'] }],
	});
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
	await expect(replaced).rejects.toBeInstanceOf(ValidationSuperseded);
	await vi.advanceTimersByTimeAsync(500);
	await expect(Promise.all([latest, independent])).resolves.toMatchObject([{ success: true }, { success: true }]);
});

const requireModules = { 'zod/mini': z, '@schema-engine/forms': { createFormEngine } };

/**
 * @remarks The exports are whatever the documented snippet declares, so a test reads them untyped.
 */
// oxlint-disable-next-line typescript/no-explicit-any
function runPattern(heading: string, index = 0): Record<string, any> {
	const exports: Record<string, unknown> = {};
	runInNewContext(example(heading, index), {
		exports,
		require: (name: string) => {
			if (!(name in requireModules)) throw new Error(`Unexpected import ${name}`);
			return requireModules[name as keyof typeof requireModules];
		},
	});
	return exports;
}

function parse(engine: ReturnType<typeof createFormEngine>, rule: { type: string }, value: unknown, context = {}) {
	const schema = engine.getValidationRegistry().createSchema(rule, createValidationContext(context));
	if (!schema) throw new Error(`${rule.type} is not registered`);
	return schema.safeParse(value);
}

test('the length range pattern enforces the documented bounds', () => {
	const { engine } = runPattern('### Validation with Parameters');
	const rule = { type: 'lengthRange', value: { min: 3, max: 5 } };
	expect(parse(engine, rule, 'abcd').success).toBe(true);
	expect(parse(engine, rule, 'ab').success).toBe(false);
	expect(parse(engine, rule, 'abcdef').success).toBe(false);
});

test('the credit card pattern accepts a Luhn-valid number and rejects a changed digit', () => {
	const { engine } = runPattern('### Validation with Parameters', 1);
	expect(parse(engine, { type: 'creditCard' }, '4242 4242 4242 4242').success).toBe(true);
	expect(parse(engine, { type: 'creditCard' }, '4242 4242 4242 4241').success).toBe(false);
});

test('the company email pattern accepts only the listed domains', () => {
	const { engine, emailField } = runPattern('### Business Rule Validations');
	const rule = emailField.rules[0];
	expect(parse(engine, rule, 'ada@mycompany.com').success).toBe(true);
	expect(parse(engine, rule, 'ada@other.com').success).toBe(false);
});

test('the password strength pattern applies its documented requirements', () => {
	const { engine, passwordField } = runPattern('### Password Strength');
	const rule = passwordField.rules[0];
	expect(parse(engine, rule, 'Abcdefghij12').success).toBe(true);
	expect(parse(engine, rule, 'abcdefghij12').success).toBe(false);
});

test('the confirm password pattern reads its sibling through the context', () => {
	const { engine } = runPattern('## Cross-Field Validations');
	const context = { values: { password: 'secret' }, fieldPath: 'confirm' };
	expect(parse(engine, { type: 'confirmPassword' }, 'secret', context).success).toBe(true);
	expect(parse(engine, { type: 'confirmPassword' }, 'other', context).success).toBe(false);
	expect(engine.getValidationRegistry().getRuleDependencies({ type: 'confirmPassword' })).toEqual(['password']);
});

test.each([
	['### Simple Custom Validation', 0, ''],
	['## Several Validations at Once', 0, ''],
	['### 4. Document Your Validations', 0, ''],
	['### Validation with Parameters', 0, ''],
	['### Validation with Parameters', 1, ''],
	['### Business Rule Validations', 0, ''],
	['### Age Validation with Date', 0, ''],
	['### Social Security Number (US)', 0, ''],
	['### Password Strength', 0, ''],
	['## Cross-Field Validations', 0, ''],
	['### Built-in Async Validation (Recommended)', 0, ''],
	['### Custom Async Validator (Advanced)', 0, ''],
	['### 3. Handle Edge Cases', 0, ''],
	[
		'### Debouncing Async Validations',
		0,
		"\nimport type { ValidationRule } from '@schema-engine/forms/schemas/validation';\nconst fieldRule: ValidationRule = usernameRule;",
	],
])('the documented example %# under %s (block %i) type-checks for a consumer', (heading, index, suffix) => {
	const fileName = fileURLToPath(new URL('./__validation_snippets__.ts', import.meta.url));
	const snippets = `${exampleSource(heading, index)}${suffix}`;
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
	host.getSourceFile = (name, languageVersion, onError, shouldCreateNewSourceFile) => {
		if (name === fileName) return ts.createSourceFile(name, snippets, languageVersion);
		if (!sourceFileCache.has(name)) {
			sourceFileCache.set(name, original(name, languageVersion, onError, shouldCreateNewSourceFile));
		}
		return sourceFileCache.get(name);
	};
	const program = ts.createProgram([fileName], options, host);
	expect(
		ts
			.getPreEmitDiagnostics(program)
			.map((diagnostic) => ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n')),
	).toEqual([]);
});
