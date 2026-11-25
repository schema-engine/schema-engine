import { readFileSync } from 'node:fs';
import { runInNewContext, runInThisContext } from 'node:vm';
import * as ts from 'typescript';
import { anyValue } from './any-value';
import * as z from 'zod/mini';
import { afterEach, expect, test, vi } from 'vitest';
import {
	createFormEngine,
	defineInput,
	BaseFieldSchema,
	createDefaultValidationRegistry,
	createValidationContext,
	ValidationSuperseded,
	createDebounceScope,
	ValidationUnavailable,
	type FormFetch,
} from '@schema-engine/forms';

const page = readFileSync(new URL('../src/content/docs/forms/validation-custom.mdx', import.meta.url), 'utf8');

function exampleSource(heading: string, index = 0): string {
	const section = page.split(heading)[1];
	const code = [...(section?.matchAll(/```(?:typescript|ts)[^\n]*\n([\s\S]*?)\n```/g) ?? [])][index]?.[1];
	if (!code) throw new Error(`Missing TypeScript example ${index} after ${heading}`);
	return code;
}

function example(heading: string, index = 0): string {
	return ts.transpileModule(exampleSource(heading, index), {
		compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
	}).outputText;
}

vi.setConfig({ testTimeout: 15_000 });

afterEach(() => {
	vi.restoreAllMocks();
	vi.useRealTimers();
});

test('the documented IBAN rule accepts a valid IBAN and rejects a changed digit or a malformed value', () => {
	const { engine, isValidIban } = runInNewContext(`${example('## Check with an algorithm')}\nexports;`, {
		exports: {},
		require: (name: string) => (name === 'zod/mini' ? z : { createFormEngine }),
	}) as { engine: ReturnType<typeof createFormEngine>; isValidIban: (value: string) => boolean };
	expect(isValidIban('GB82 WEST 1234 5698 7654 32')).toBe(true);
	expect(isValidIban('DE89370400440532013000')).toBe(true);
	expect(isValidIban('GB82 WEST 1234 5698 7654 33')).toBe(false);
	expect(isValidIban('not an iban')).toBe(false);
	const schema = engine.getValidationRegistry().createSchema({ $type: 'iban' }, createValidationContext());
	expect(schema?.safeParse('GB82 WEST 1234 5698 7654 32').success).toBe(true);
	expect(schema?.safeParse('GB82 WEST 1234 5698 7654 33').success).toBe(false);
});

/**
 * Runs a transpiled snippet in this realm.
 *
 * @remarks
 * Zod tells an async check by `instanceof Promise`, which a promise made inside a `vm` context fails, so a snippet
 * with an async rule cannot run there.
 */
function runInThisRealm(code: string, exports: Record<string, unknown>, require: (name: string) => unknown): void {
	const run = runInThisContext(`(function (exports, require) {${code}\n})`) as (
		exports: Record<string, unknown>,
		require: (name: string) => unknown,
	) => void;
	run(exports, require);
}

test('the documented username rule reports a taken name, and a failed request is not reported as taken', async () => {
	const modules: Record<string, unknown> = {
		'zod/mini': z,
		'@schema-engine/forms': { createFormEngine, ValidationUnavailable },
	};
	const exports: Record<string, unknown> = {};
	runInThisRealm(example('## A custom async rule'), exports, (name: string) => modules[name]);
	const { engine } = exports as { engine: ReturnType<typeof createFormEngine> };
	const registration = engine.getValidationRegistry().get('uniqueUsername');
	if (!registration) throw new Error('uniqueUsername is not registered');
	const check = (fetch: FormFetch) => {
		const schema = createFormEngine({ validations: [registration], fetch })
			.getValidationRegistry()
			.createSchema({ $type: 'uniqueUsername' }, createValidationContext());
		if (!schema) throw new Error('uniqueUsername is not registered');
		return schema.safeParseAsync('ada');
	};
	const answer =
		(body: unknown, status = 200) =>
		async () =>
			new Response(JSON.stringify(body), { status });

	expect((await check(answer({ available: true }))).success).toBe(true);
	const taken = await check(answer({ available: false }));
	expect(taken.success).toBe(false);
	await expect(check(answer({}, 503))).rejects.toBeInstanceOf(ValidationUnavailable);
	await expect(
		check(async () => {
			throw new TypeError('offline');
		}),
	).rejects.toBeInstanceOf(ValidationUnavailable);
});

const quickStartInput = defineInput({
	value: anyValue,
	$type: 'input',
	schema: z.extend(BaseFieldSchema, { $type: z.literal('input') }),
	metadata: { name: 'Input', category: 'input' },
	render: () => null,
});

/** The engine of the quick start the page continues from, with a headless `input` in place of the renderer's. */
const quickStartEngine = createFormEngine({ elements: [quickStartInput] });

test('the documented form uses a registered rule in the rules of an element, and rejects an unregistered one', () => {
	const { engine, form } = runInNewContext(`${example('## Register a rule')}\nexports;`, {
		exports: {},
		require: (name: string) => {
			if (name === 'zod/mini') return z;
			if (name === '@schema-engine/forms') return { createFormEngine, defineInput, BaseFieldSchema };
			if (name === './engine') return { engine: quickStartEngine };
			throw new Error(`Unexpected import ${name}`);
		},
	}) as {
		engine: ReturnType<typeof createFormEngine>;
		form: { steps: Array<{ elements: Array<{ rules: unknown[] }> }> };
	};
	const rule = { $type: 'postalCode', country: 'ca', message: 'Enter a Canadian postal code' };
	expect(form.steps[0]?.elements[0]?.rules).toEqual([rule]);
	const registry = engine.getValidationRegistry();
	expect(registry.getRuleParams(rule)).toEqual({ country: 'ca' });
	expect(registry.getRuleMessage(rule, 'text the schema reported')).toBe('Enter a Canadian postal code');
	expect(registry.getRuleMessage({ $type: 'postalCode' }, 'text the schema reported')).toBeUndefined();
	const schema = registry.createSchema(rule, createValidationContext());
	expect(schema?.safeParse('K1A 0B1').success).toBe(true);
	expect(schema?.safeParse('12345').success).toBe(false);
	const field = (rule: unknown) => ({
		id: 'address',
		steps: [
			{ id: 'main', title: 'Address', elements: [{ $type: 'input', id: 'zip', name: 'zip', rules: [rule] }] },
		],
	});
	expect(engine.safeValidateForm(field({ $type: 'postalcode' }))).toMatchObject({
		success: false,
		issues: [
			{
				path: ['steps', 0, 'elements', 0, 'rules', 0, '$type'],
				message: /^Unknown validation rule 'postalcode'\. Register it with/,
			},
		],
	});
	expect(engine.safeValidateForm(field({ $type: 'postalCode', country: 'mx' }))).toMatchObject({
		success: false,
		issues: [{ path: ['steps', 0, 'elements', 0, 'rules', 0, 'country'] }],
	});
});

test('the documented debounced async rule settles replaced checks and keeps fields independent', async () => {
	vi.useFakeTimers();
	vi.spyOn(globalThis, 'fetch').mockImplementation(
		async () => new Response(JSON.stringify({ valid: true }), { status: 200 }),
	);
	const { usernameRule: rule } = runInNewContext(`${example('## The built-in async rule')}\nexports;`, {
		exports: {},
	}) as {
		usernameRule: { $type: string };
	};
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

test('the confirm password rule reads its sibling through the context and declares what it reads', () => {
	const { engine } = runPattern('## Rules that read other fields');
	const registry = engine.getValidationRegistry();
	const parse = (value: unknown) =>
		registry
			.createSchema(
				{ $type: 'confirmPassword' },
				createValidationContext({ values: { password: 'secret' }, fieldPath: 'confirm' }),
			)
			?.safeParse(value);
	expect(parse('secret')?.success).toBe(true);
	expect(parse('other')?.success).toBe(false);
	expect(registry.getRuleDependencies({ $type: 'confirmPassword' })).toEqual(['password']);
});
