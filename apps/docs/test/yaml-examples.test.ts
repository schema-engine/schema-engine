import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import * as ts from 'typescript';
import * as z from 'zod/mini';
import { expect, test } from 'vitest';
import { createFormEngine, defineInput } from '@schema-engine/forms';
import { ElementGridConfigSchema } from '@schema-engine/layout';
import * as registryYaml from '@schema-engine/registry/yaml';
import { anyValue } from './any-value';

const page = readFileSync(new URL('../src/content/docs/forms/yaml.mdx', import.meta.url), 'utf8');

const input = defineInput({
	value: anyValue,
	$type: 'input',
	schema: z.looseObject({
		$type: z.literal('input'),
		id: z.string(),
		name: z.string(),
		grid: z.optional(ElementGridConfigSchema),
	}),
	metadata: { name: 'Input', category: 'input' },
	render: () => null,
});
const engine = createFormEngine({ elements: [input] });

function codeAfter(heading: string, language: string): string {
	const section = page.split(heading)[1];
	const code = section?.match(new RegExp(`\`\`\`${language}\\n([\\s\\S]*?)\\n\`\`\``))?.[1];
	if (!code) throw new Error(`Missing ${language} example after ${heading}`);
	return code;
}

/** Runs a page example as a CommonJS module and returns its exports. */
function run(code: string, modules: Record<string, unknown>): Record<string, unknown> {
	const output = ts.transpileModule(code, {
		compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
	}).outputText;
	const exports: Record<string, unknown> = {};
	runInNewContext(output, {
		exports,
		require: (name: string) => {
			if (!(name in modules)) throw new Error(`Unexpected import ${name}`);
			return modules[name];
		},
	});
	return exports;
}

const formFile = codeAfter('## A form file', 'yaml');

test('the documented parseForm validates the documented form file', () => {
	const { parseForm } = run(codeAfter('## Parse and validate', 'typescript'), {
		'@schema-engine/registry/yaml': registryYaml,
		'./engine': { engine },
	}) as { parseForm: (text: string, filename: string) => { id: string; steps: unknown[] } };

	const form = parseForm(formFile, 'contact.form.yaml');

	expect(form.id).toBe('contact');
	expect(form.steps).toHaveLength(1);
});

test('the documented error output matches what a bad width prints', () => {
	const bad = formFile.replace(/width: half\n?$/, 'width: halve\n');
	const result = registryYaml.safeParseYaml(bad, (value) => engine.safeValidateForm(value), {
		filename: 'contact.form.yaml',
	});

	expect(result.success).toBe(false);
	if (result.success) return;
	const message = new registryYaml.YamlDocumentError(result.issues).message;
	const documented = codeAfter('With `width: halve` on line 17, the message reads:', 'text');
	const prefix = documented.split('...')[0] ?? '';
	expect(message.startsWith(prefix)).toBe(true);
});

test('the documented stringify example writes the language-server header', () => {
	const { text } = run(codeAfter('## Write a form as YAML', 'typescript'), {
		'@schema-engine/registry/yaml': registryYaml,
		'./engine': { engine },
	}) as { text: string };

	expect(text.startsWith('# yaml-language-server: $schema=./contact.schema.json\n')).toBe(true);
	expect(registryYaml.parseYaml(text, (value) => engine.safeValidateForm(value))).toEqual(
		engine.validateForm({ id: 'contact', steps: [{ id: 'details', title: 'Details', elements: [] }] }),
	);
});

test('the documented merge-key example validates', () => {
	const block = /```yaml\n(\s*defaults: &input[\s\S]*?)\n\s*```/.exec(page)?.[1];
	if (!block) throw new Error('Missing the merge key example');
	const indent = /^\s*/.exec(block)?.[0].length ?? 0;
	const text = block
		.split('\n')
		.map((line) => line.slice(indent))
		.join('\n');

	const result = registryYaml.safeParseYaml(`id: merged\n${text}\n`, (value) => {
		const { defaults: _defaults, ...form } = value as Record<string, unknown>;
		return engine.safeValidateForm(form);
	});

	expect(result, JSON.stringify(result)).toMatchObject({ success: true });
});

test('the documented schema generator input exists on the engine', () => {
	expect(codeAfter('## Editor autocomplete', 'typescript')).toContain(
		"engine.generateFormConfigSchema({ io: 'input', target: 'draft-7' })",
	);
	expect(engine.generateFormConfigSchema({ io: 'input', target: 'draft-7' })).toMatchObject({
		$schema: 'http://json-schema.org/draft-07/schema#',
		type: 'object',
	});
});
