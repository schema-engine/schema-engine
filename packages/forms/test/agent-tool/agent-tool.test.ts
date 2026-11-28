import { afterEach, describe, expect, test, vi } from 'vitest';
import * as z from 'zod/mini';
import { createFormEngine } from '@/engine/create-form-engine';
import { registerFormAgentTool, type FormAgentToolResult } from '@/agent-tool';
import { createFormRuntime } from '@/runtime';
import { BaseFieldSchema } from '@/schemas/base-field';
import { defineInput } from '@/types';
import type { FormEngineRuntime } from '@/engine/form-engine';
import type { FormIssueFormatter } from '@/state-container/types';
import type { JSONSchemaObject } from '@/lib/standard-json-schema';

const text = defineInput({
	$type: 'text',
	schema: z.extend(BaseFieldSchema, { $type: z.literal('text') }),
	metadata: { name: 'Text', category: 'input' },
	value: () => z.string(),
	render: () => null,
});

const stars = defineInput({
	$type: 'stars',
	schema: z.extend(BaseFieldSchema, { $type: z.literal('stars') }),
	metadata: { name: 'Stars', category: 'input' },
	value: () => z.number().check(z.int(), z.gte(1), z.lte(5)),
	render: () => null,
});

const rows = defineInput({
	childPaths: [{ keys: ['elements'], list: true }],
	$type: 'rows',
	containerKind: 'array',
	schema: z.extend(BaseFieldSchema, {
		$type: z.literal('rows'),
		elements: z.array(z.looseObject({ $type: z.string() })),
	}),
	metadata: { name: 'Rows', category: 'input' },
	render: () => null,
});

const formatIssue = vi.fn(
	(issue: { type: string; params?: Record<string, unknown> }, field: { path: string }) =>
		`${field.path} says ${issue.type}`,
);
const engine = createFormEngine({ elements: [text, stars, rows], formatIssue });

type Tool = {
	name: string;
	description: string;
	inputSchema: JSONSchemaObject;
	execute(input: unknown, options: { signal: AbortSignal }): Promise<FormAgentToolResult>;
};

function stubModelContext() {
	const registered: Array<{ tool: Tool; signal: AbortSignal }> = [];
	const registerTool = vi.fn(async (tool: Tool, { signal }: { signal: AbortSignal }) => {
		registered.push({ tool, signal });
	});
	vi.stubGlobal('document', { modelContext: { registerTool } });
	return { registered, registerTool };
}

afterEach(() => {
	vi.unstubAllGlobals();
	formatIssue.mockClear();
});

const reviewForm = {
	id: 'review',
	steps: [
		{
			id: 'main',
			title: 'Main',
			elements: [
				{
					$type: 'text',
					name: 'name',
					label: 'Name',
					description: 'Who is reviewing',
					rules: [{ $type: 'required' }],
				},
				{ $type: 'stars', name: 'rating', label: 'Rating' },
				{
					$type: 'rows',
					name: 'tags',
					label: 'Tags',
					elements: [{ $type: 'text', name: 'tag' }],
				},
			],
		},
	],
};

function setup(
	options: {
		autoSubmit?: boolean;
		form?: Record<string, unknown>;
		formatIssue?: FormIssueFormatter;
		engine?: FormEngineRuntime;
	} = {},
) {
	const stub = stubModelContext();
	const usedEngine = options.engine ?? engine;
	const config = usedEngine.validateForm(options.form ?? reviewForm);
	const onSubmit = vi.fn();
	const runtime = createFormRuntime({ engine: usedEngine, config, host: { focus: vi.fn() }, onSubmit });
	runtime.mount();
	const unregister = registerFormAgentTool(runtime, {
		name: 'submit_review',
		description: 'Send a review',
		autoSubmit: options.autoSubmit,
		formatIssue: options.formatIssue,
	});
	const { tool, signal } = stub.registered[0]!;
	const run = (input: unknown, abort = new AbortController()) => tool.execute(input, { signal: abort.signal });
	return { runtime, onSubmit, unregister, tool, signal, run, ...stub };
}

const said = (result: FormAgentToolResult) => result.content[0].text;

describe('registerFormAgentTool', () => {
	test('registers the submission schema with the labels and help text of the fields as descriptions', () => {
		const { tool, registerTool } = setup();

		expect(registerTool).toHaveBeenCalledOnce();
		expect(tool.name).toBe('submit_review');
		expect(tool.description).toBe('Send a review');
		expect(tool.inputSchema).toEqual(
			expect.objectContaining({ type: 'object', required: ['name'], additionalProperties: false }),
		);
		expect(tool.inputSchema.properties.name.description).toBe('Name: Who is reviewing');
		expect(tool.inputSchema.properties.rating.description).toBe('Rating');
		expect(tool.inputSchema.properties.tags.description).toBe('Tags');
	});

	test('execute with valid input submits through the runtime and calls onSubmit once with the typed values', async () => {
		const { run, onSubmit } = setup({ autoSubmit: true });

		const result = await run({ name: 'Ada', rating: 4, tags: ['a', 'b'] });

		expect(said(result)).toBe('The form was submitted.');
		expect(onSubmit).toHaveBeenCalledOnce();
		expect(onSubmit.mock.calls[0]![0]).toEqual({ name: 'Ada', rating: 4, tags: ['a', 'b'] });
	});

	test('execute with invalid input returns the issues as the form words them and does not call onSubmit', async () => {
		const { run, onSubmit } = setup({ autoSubmit: true });

		const result = await run({ rating: 4 });

		expect(said(result)).toContain('The form was not submitted');
		expect(said(result)).toContain('- name: name says required');
		expect(formatIssue).toHaveBeenCalled();
		expect(onSubmit).not.toHaveBeenCalled();
	});

	test('an issue nothing words is reported by its type and params, so the agent can still act on it', async () => {
		const plain = createFormEngine({ elements: [text] });
		const { run } = setup({
			autoSubmit: true,
			engine: plain,
			form: {
				id: 'short',
				steps: [
					{
						id: 'main',
						title: 'Main',
						elements: [{ $type: 'text', name: 'name', rules: [{ $type: 'minLength', value: 3 }] }],
					},
				],
			},
		});

		const result = await run({ name: 'Al' });

		expect(said(result)).toContain('- name: minLength {"minLength":3}');
	});

	test("the formatIssue option words the issues in place of the engine's formatter", async () => {
		const own: FormIssueFormatter = (issue, { path }) => `own ${path}: ${issue.type}`;
		const { run } = setup({ autoSubmit: true, formatIssue: own });

		const result = await run({ rating: 4 });

		expect(said(result)).toContain('- name: own name: required');
		expect(formatIssue).not.toHaveBeenCalled();
	});

	test('a call aborted while it submits leaves a list the user never had as it was', async () => {
		const { run, runtime } = setup({ autoSubmit: true });
		const abort = new AbortController();

		const pending = run({ name: '', tags: ['new'] }, abort);
		abort.abort();
		await pending;

		expect(runtime.container.getValue('tags')).toBeUndefined();
	});

	test('input of the wrong type is refused before anything is written', async () => {
		const { run, runtime, onSubmit } = setup({ autoSubmit: true });

		const result = await run({ name: 'Ada', rating: 'five' });

		expect(said(result)).toContain('nothing was filled in');
		expect(said(result)).toContain('rating');
		expect(runtime.container.getValue('name')).toBeUndefined();
		expect(onSubmit).not.toHaveBeenCalled();
	});

	test('a refused value inside a row is reported at its list, by the dotted path the form knows the field by', async () => {
		const { run } = setup();

		const result = await run({ name: 'Ada', tags: ['a', 5] });

		expect(said(result).split('\n').slice(1)).toEqual(['- tags: Invalid input']);
	});

	test('autoSubmit defaults to false: the form is filled and waits for the user', async () => {
		const { run, runtime, onSubmit } = setup();

		const result = await run({ name: 'Ada', rating: 2 });

		expect(said(result)).toContain('waits for the user');
		expect(runtime.container.getValue('name')).toBe('Ada');
		expect(runtime.container.getValue('rating')).toBe(2);
		expect(runtime.getSnapshot().submission.submitCount).toBe(0);
		expect(onSubmit).not.toHaveBeenCalled();
	});

	test('cleanup unregisters the tool by aborting the registration signal, and does so once', () => {
		const { unregister, signal } = setup();
		expect(signal.aborted).toBe(false);

		unregister();
		expect(signal.aborted).toBe(true);
		expect(() => unregister()).not.toThrow();
	});

	test('a call aborted before it writes leaves the form as the user had it', async () => {
		const { run, runtime, onSubmit } = setup({ autoSubmit: true });
		runtime.container.setValue('name', 'Grace');
		const abort = new AbortController();
		abort.abort();

		const result = await run({ name: 'Ada' }, abort);

		expect(said(result)).toContain('cancelled');
		expect(runtime.container.getValue('name')).toBe('Grace');
		expect(onSubmit).not.toHaveBeenCalled();
	});

	test('a call aborted while it submits puts back the values the user had', async () => {
		const { run, runtime, onSubmit } = setup({ autoSubmit: true });
		runtime.container.setValue('name', 'Grace');
		runtime.container.fieldArray('tags').replace(['mine']);
		const abort = new AbortController();

		const pending = run({ name: '', rating: 3, tags: [] }, abort);
		abort.abort();
		const result = await pending;

		expect(said(result)).toContain('put back');
		expect(runtime.container.getValue('name')).toBe('Grace');
		expect(runtime.container.getValue('rating')).toBeUndefined();
		expect(runtime.container.getValue('tags')).toEqual(['mine']);
		expect(onSubmit).not.toHaveBeenCalled();
	});

	test('a wizard is filled across the steps the answers make active, and a skipped step is not submitted', async () => {
		const wizard = {
			id: 'wizard',
			steps: [
				{
					id: 'contact',
					title: 'Contact',
					elements: [
						{ $type: 'text', name: 'email', label: 'Email', rules: [{ $type: 'required' }] },
						{ $type: 'text', name: 'hasCompany' },
					],
				},
				{
					id: 'company',
					title: 'Company',
					constraints: [{ field: 'hasCompany', operator: 'equals', value: 'yes', $type: 'show' }],
					elements: [{ $type: 'text', name: 'companyName', rules: [{ $type: 'required' }] }],
				},
				{
					id: 'address',
					title: 'Address',
					elements: [{ $type: 'text', name: 'street', rules: [{ $type: 'required' }] }],
				},
			],
		};
		const wizardEngine = createFormEngine({
			elements: [text],
			recipes: [
				{
					$type: 'bare',
					kind: 'wizard',
					slots: ['actions'],
					schema: z.looseObject({ $type: z.literal('bare') }),
					metadata: { name: 'Bare' },
					render: () => null,
				} as const,
			],
			defaultWizardRecipe: 'bare',
		});
		const stub = stubModelContext();
		const config = wizardEngine.validateForm(wizard);
		const onSubmit = vi.fn();
		const runtime = createFormRuntime({ engine: wizardEngine, config, host: { focus: vi.fn() }, onSubmit });
		runtime.mount();
		registerFormAgentTool(runtime, {
			name: 'wizard',
			description: 'Fill the wizard',
			autoSubmit: true,
		});
		const { tool } = stub.registered[0]!;
		const abort = new AbortController();

		const skipped = await tool.execute(
			{ email: 'a@b.c', hasCompany: 'no', companyName: 'Acme', street: 'Main' },
			{ signal: abort.signal },
		);
		expect(said(skipped)).toBe('The form was submitted.');
		expect(onSubmit.mock.calls[0]![0]).toEqual({ email: 'a@b.c', hasCompany: 'no', street: 'Main' });
		expect(runtime.getSnapshot().steps.find((step) => step.id === 'company')?.skipped).toBe(true);

		runtime.container.reset();
		const shown = await tool.execute(
			{ email: 'a@b.c', hasCompany: 'yes', street: 'Main' },
			{ signal: abort.signal },
		);
		expect(said(shown)).toContain('- companyName:');
		expect(runtime.getSnapshot().current).toBe('company');
		expect(onSubmit).toHaveBeenCalledOnce();
	});
});

describe('without WebMCP', () => {
	const setupBare = () => {
		const config = engine.validateForm(reviewForm);
		const runtime = createFormRuntime({ engine, config, host: { focus: vi.fn() } });
		return () => registerFormAgentTool(runtime, { name: 'x', description: 'x' });
	};

	test('does nothing and does not throw on the server', () => {
		const register = setupBare();
		vi.stubGlobal('document', undefined);
		expect(typeof register()).toBe('function');
		expect(() => register()()).not.toThrow();
	});

	test('does nothing and does not throw where document.modelContext is missing', () => {
		const register = setupBare();
		vi.stubGlobal('document', {});
		expect(() => register()()).not.toThrow();
	});
});
