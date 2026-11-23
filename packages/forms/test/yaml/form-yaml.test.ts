import { YamlDocumentError, parseYaml, safeParseYaml, stringifyYaml } from '@schema-engine/registry/yaml';
import { ElementGridConfigSchema } from '@schema-engine/layout';
import { describe, expect, test } from 'vitest';
import * as z from 'zod/mini';
import { createFormEngine } from '@/engine/create-form-engine';
import { defineInput } from '@/types';
import { anyValue } from '../lib/any-value';

const field = defineInput({
	value: anyValue,
	$type: 'field',
	schema: z.looseObject({
		$type: z.literal('field'),
		id: z.string(),
		name: z.string(),
		grid: z.optional(ElementGridConfigSchema),
	}),
	appearanceAxes: ['size'],
	metadata: { name: 'Field', category: 'input' },
	render: () => null,
});

const engine = createFormEngine({ elements: [field] });
const validate = (value: unknown) => engine.safeValidateForm(value);

const contactYaml = [
	'id: contact',
	'steps:',
	'  - id: main',
	'    title: Main',
	'    elements:',
	'      - $type: field',
	'        id: name',
	'        name: name',
	'        label: Name',
	'        grid: { width: half }',
	'      - $type: field',
	'        id: email',
	'        name: email',
	'        label: Email',
	'        grid:',
	'          width: halve',
	'',
].join('\n');

const contactJson = {
	id: 'contact',
	steps: [
		{
			id: 'main',
			title: 'Main',
			elements: [
				{ $type: 'field', id: 'name', name: 'name', label: 'Name', grid: { width: 'half' } },
				{ $type: 'field', id: 'email', name: 'email', label: 'Email', grid: { width: 'full' } },
			],
		},
	],
};

const validYaml = contactYaml.replace('width: halve', 'width: full');

function catchError(run: () => unknown): YamlDocumentError {
	try {
		run();
	} catch (error) {
		expect(error).toBeInstanceOf(YamlDocumentError);
		return error as YamlDocumentError;
	}
	throw new Error('Expected a YamlDocumentError');
}

describe('a YAML form', () => {
	test('validates like its JSON equivalent', () => {
		expect(parseYaml(validYaml, validate, { filename: 'contact.form.yaml' })).toEqual(
			engine.validateForm(contactJson),
		);
	});

	test('a grid width issue points at the line and names the allowed widths', () => {
		const error = catchError(() => parseYaml(contactYaml, validate, { filename: 'contact.form.yaml' }));

		expect(error.issues).toHaveLength(1);
		expect(error.issues[0]).toMatchObject({
			filename: 'contact.form.yaml',
			line: 16,
			column: 18,
			path: ['steps', 0, 'elements', 1, 'grid', 'width'],
		});
		expect(error.issues[0]?.message).toMatch(/half/);
		expect(error.issues[0]?.message).toMatch(/quarter/);
		expect(error.message).toMatch(/^contact\.form\.yaml:16:18 steps\[0\]\.elements\[1\]\.grid\.width: /);
	});

	test('a missing id points at the element that lacks it', () => {
		const text = contactYaml.replace('        id: email\n', '').replace('width: halve', 'width: full');

		const result = safeParseYaml(text, validate);

		expect(result).toMatchObject({
			success: false,
			issues: [{ path: ['steps', 0, 'elements', 1, 'id'], line: 11, column: 9 }],
		});
	});

	test('a syntax error points at the line and the engine is not asked', () => {
		let calls = 0;
		const text = contactYaml.replace('    title: Main', '   title: Main');

		const result = safeParseYaml(
			text,
			(value) => {
				calls += 1;
				return validate(value);
			},
			{ filename: 'contact.form.yaml' },
		);

		expect(calls).toBe(0);
		expect(result.success).toBe(false);
		if (result.success) {
			return;
		}
		expect(result.issues[0]).toMatchObject({ line: 4, filename: 'contact.form.yaml', path: [] });
	});

	test('no, on and yes stay strings', () => {
		const text = [
			'id: answers',
			'steps:',
			'  - id: main',
			'    title: Main',
			'    elements:',
			'      - $type: field',
			'        id: confirm',
			'        name: confirm',
			'        label: no',
			'        options:',
			'          - { value: on, label: yes }',
			'',
		].join('\n');

		const form = parseYaml(text, validate);
		const element = form.steps[0]?.elements[0] as unknown as { label: unknown; options: unknown };

		expect(element.label).toBe('no');
		expect(element.options).toEqual([{ value: 'on', label: 'yes' }]);
	});

	test('safeParseYaml reports every issue with its line and column', () => {
		const text = contactYaml.replace('width: half }', 'width: halfs }');

		const result = safeParseYaml(text, validate, { filename: 'contact.form.yaml' });

		expect(result.success).toBe(false);
		if (result.success) {
			return;
		}
		expect(result.issues.map((issue) => [issue.line, issue.column])).toEqual([
			[10, 24],
			[16, 18],
		]);
	});

	test('round-trips through stringifyYaml', () => {
		const form = engine.validateForm(contactJson);

		const text = stringifyYaml(form);

		expect(text).toContain('grid: { width: half }');
		expect(parseYaml(text, validate)).toEqual(engine.validateForm(contactJson));
	});

	test('the editor schema header names the generated schema', () => {
		const schema = engine.generateFormConfigSchema({ io: 'input', target: 'draft-7' });

		expect(schema).toMatchObject({ type: 'object' });
		expect(stringifyYaml(contactJson, { schemaUrl: './contact.schema.json' })).toMatch(
			/^# yaml-language-server: \$schema=\.\/contact\.schema\.json\n/,
		);
	});
});
