import { describe, expect, test } from 'vitest';
import * as z from 'zod/mini';
import { createFormEngine } from '@/engine/create-form-engine';
import { defineInput } from '@/types';

const field = defineInput({
	$type: 'field',
	schema: z.looseObject({ $type: z.literal('field'), id: z.string(), name: z.string() }),
	metadata: { name: 'Field', category: 'input' },
	render: () => null,
});
const engine = createFormEngine({ elements: [field] });
const form = (extra: Record<string, unknown> = {}) => ({
	id: 'timing',
	steps: [
		{
			id: 'main',
			title: 'Main',
			elements: [{ $type: 'field', id: 'name', name: 'name' }],
		},
	],
	...extra,
});

describe('validation timing of a form config', () => {
	test('normalization fills both modes, and keeps the ones the author wrote', () => {
		const filled = engine.validateForm(form());
		expect(filled.validationMode).toBe('onSubmit');
		expect(filled.reValidateMode).toBe('onChange');

		const written = engine.validateForm(form({ validationMode: 'onTouched', reValidateMode: 'onBlur' }));
		expect(written.validationMode).toBe('onTouched');
		expect(written.reValidateMode).toBe('onBlur');
	});

	test('the JSON Schema export shows the defaults and the payload', () => {
		const input = engine.getFormConfigStandardSchema()['~standard'].jsonSchema.input({ target: 'draft-2020-12' });
		const properties = (input.properties ?? {}) as Record<string, { default?: unknown; description?: string }>;

		expect(properties.validationMode?.default).toBe('onSubmit');
		expect(properties.reValidateMode?.default).toBe('onChange');
		expect(properties.payload?.description).toMatch(/never rendered or validated/);
		expect(input.required).not.toContain('validationMode');
	});
});

describe('the payload of a form config', () => {
	test('is kept on the normalized config, and is plain data', () => {
		const config = engine.validateForm(form({ payload: { tenant: 't1', context: { source: 'email' } } }));
		expect(config.payload).toEqual({ tenant: 't1', context: { source: 'email' } });
	});

	test('a key that names a field, or a reserved segment, is rejected with an issue naming it', () => {
		expect(() => engine.validateForm(form({ payload: { name: 'x' } }))).toThrow(/payload.*'name'.*field/is);
		expect(() => engine.validateForm(form({ payload: { __secret: 'x' } }))).toThrow(
			/payload.*'__secret'.*reserved/is,
		);
		expect(() => engine.validateForm(form({ payload: { constructor: 'x' } }))).toThrow(/payload.*'constructor'/is);
	});
});

describe('the issue formatter of an engine', () => {
	const formatIssue = (issue: { type: string }, field: { path: string }) => `${field.path}: ${issue.type}`;

	test('is the one both bindings read, and an extended engine inherits it', () => {
		expect(createFormEngine().getIssueFormatter()).toBeUndefined();
		const engine = createFormEngine({ formatIssue });
		expect(engine.getIssueFormatter()).toBe(formatIssue);
		expect(engine.extend().getIssueFormatter()).toBe(formatIssue);
	});
});
