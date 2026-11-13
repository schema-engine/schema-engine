import { describe, expect, test } from 'vitest';
import * as z from 'zod/mini';
import { createFormEngine } from '@/engine/create-form-engine';
import { FormValidationError, formatIssuePath, type FormValidationIssue } from '@/lib/validate-form';
import { elementChildrenSchema } from '@/lib/element-children';
import { BaseFieldSchema } from '@/schemas/base-field';
import { defineFormRecipe } from '@/recipes';
import { cardSpec } from '@/recipes/built-in-specs';
import { formSubmitPlugin } from '@/actions';
import { defineInput } from '@/types';
import { ElementGridConfigSchema } from '@schema-engine/layout';

const field = defineInput({
	$type: 'field',
	schema: z.looseObject({
		$type: z.literal('field'),
		id: z.string(),
		name: z.string(),
		grid: z.optional(ElementGridConfigSchema),
		rules: z.optional(z.array(z.looseObject({ type: z.string() }))),
	}),
	appearanceAxes: ['size'],
	metadata: { name: 'Field', category: 'input' },
	render: () => null,
});

const fieldset = defineInput({
	$type: 'fieldset',
	containerKind: 'object',
	schema: z.extend(BaseFieldSchema, {
		$type: z.literal('fieldset'),
		elements: elementChildrenSchema,
	}),
	metadata: { name: 'Fieldset', category: 'input' },
	render: () => null,
});

const sized = defineInput({
	$type: 'sized',
	schema: z.looseObject({
		$type: z.literal('sized'),
		id: z.string(),
		name: z.string(),
		title: z.optional(z.string().check(z.minLength(3))),
		count: z.optional(z.number().check(z.lte(5))),
		contact: z.optional(z.email()),
		tags: z.optional(z.array(z.string()).check(z.minLength(2))),
		note: z.optional(z.string().check(z.minLength(2, 'Say more.'))),
		short: z.optional(z.string().check(z.maxLength(1))),
	}),
	metadata: { name: 'Sized', category: 'input' },
	render: () => null,
});

const choice = defineInput({
	$type: 'choice',
	schema: z.looseObject({
		$type: z.literal('choice'),
		id: z.string(),
		name: z.string(),
		source: z.union([
			z.object({ kind: z.literal('http'), endpoint: z.string(), method: z.optional(z.enum(['GET', 'POST'])) }),
			z.object({ kind: z.literal('static'), values: z.array(z.string()) }),
		]),
	}),
	metadata: { name: 'Choice', category: 'input' },
	render: () => null,
});

const actionEngine = createFormEngine({ actions: [formSubmitPlugin()] });

const engine = createFormEngine({
	elements: [field, fieldset, sized, choice],
	recipes: [defineFormRecipe(cardSpec, {})],
});

const named = (name: string, extra: Record<string, unknown> = {}) => ({ $type: 'field', id: name, name, ...extra });
const formWith = (elements: unknown[], extra: Record<string, unknown> = {}) => ({
	id: 'paths',
	steps: [{ id: 'main', title: 'Main', elements }],
	...extra,
});

function issuesOf(form: unknown): FormValidationIssue[] {
	const result = engine.safeValidateForm(form);
	if (result.success) throw new Error('expected the form to be invalid');
	return result.issues;
}

describe('validation issue paths', () => {
	test('a schema issue carries its full path and names the allowed widths', () => {
		const issues = issuesOf(formWith([named('a'), named('b'), named('c', { grid: { width: 'halve' } })]));

		expect(issues).toHaveLength(1);
		expect(issues[0]?.path).toEqual(['steps', 0, 'elements', 2, 'grid', 'width']);
		expect(issues[0]?.message).toMatch(/half/);
		expect(issues[0]?.message).toMatch(/quarter/);
	});

	test('a schema issue names the path of the second step, not only the first', () => {
		const form = {
			id: 'paths',
			steps: [
				{ id: 'one', title: 'One', elements: [named('a')] },
				{ id: 'two', title: 'Two', elements: [named('b', { grid: { width: 'halve' } })] },
			],
			view: { $type: 'card' },
		};
		expect(issuesOf(form).map((issue) => issue.path)).toContainEqual(['steps', 1, 'elements', 0, 'grid', 'width']);
	});

	test('an engine-level issue carries the path of the key it rejects', () => {
		const issues = issuesOf(formWith([named('a')], { view: { $type: 'nope' } }));

		expect(issues).toEqual([
			{ path: ['view', '$type'], message: expect.stringContaining("Unknown view recipe 'nope'") },
		]);
	});

	test('a view slot appearance pick carries the path through the view and the slot', () => {
		const issues = issuesOf(
			formWith([named('a')], { view: { $type: 'card', shell: { appearance: { size: 'huge' } } } }),
		);

		expect(issues.map((issue) => issue.path)).toEqual([['view', 'shell', 'appearance', 'size']]);
	});

	test('an unknown element type points at its $type', () => {
		expect(issuesOf(formWith([{ $type: 'missing', id: 'x' }])).map((issue) => issue.path)).toEqual([
			['steps', 0, 'elements', 0, '$type'],
		]);
	});

	test('nested elements carry the path through the container to the child rules', () => {
		const issues = issuesOf(
			formWith([
				named('before'),
				{
					$type: 'fieldset',
					id: 'group',
					name: 'group',
					elements: [
						named('first'),
						named('second', { rules: [{ type: 'required' }, { type: 'unregistered' }] }),
					],
				},
			]),
		);

		expect(issues).toEqual([
			{
				path: ['steps', 0, 'elements', 1, 'elements', 1, 'rules', 1, 'type'],
				message: expect.stringMatching(/field 'second'.*rule 'unregistered'/i),
			},
		]);
	});

	test('a schema issue in a nested child carries the full path', () => {
		const issues = issuesOf(
			formWith([
				{
					$type: 'fieldset',
					id: 'group',
					name: 'group',
					elements: [named('first', { grid: { width: 'halve' } })],
				},
			]),
		);

		expect(issues.map((issue) => issue.path)).toEqual([
			['steps', 0, 'elements', 0, 'elements', 0, 'grid', 'width'],
		]);
	});

	test('an element and an appearance pick are reported at their own keys', () => {
		const issues = issuesOf(
			formWith([named('a', { appearance: { size: 'huge' } })], { appearance: { tone: 'brand' } }),
		);

		expect(issues.map((issue) => issue.path)).toEqual([
			['appearance', 'tone'],
			['steps', 0, 'elements', 0, 'appearance', 'size'],
		]);
	});

	test('a grid placement issue keeps its index when an earlier element failed validation', () => {
		const issues = issuesOf(
			formWith([{ $type: 'missing', id: 'x' }, named('b', { grid: { width: 'half', column: 2 } })]),
		);

		expect(issues.map((issue) => issue.path)).toEqual([
			['steps', 0, 'elements', 0, '$type'],
			['steps', 0, 'elements', 1, 'grid', 'column'],
		]);
	});

	test('area issues point at the area key or the areas template', () => {
		const claims = [named('a', { grid: { area: 'one' } }), named('b', { grid: { area: 'two' } })];

		expect(issuesOf(formWith(claims, { grid: { areas: ['one three'] } })).map((issue) => issue.path)).toEqual([
			['steps', 0, 'elements', 1, 'grid', 'area'],
			['grid', 'areas'],
		]);
		expect(issuesOf(formWith(claims)).map((issue) => issue.path)).toEqual([
			['steps', 0, 'elements', 0, 'grid', 'area'],
			['steps', 0, 'elements', 1, 'grid', 'area'],
		]);
	});

	test('an area set at a breakpoint points into grid.responsive', () => {
		const issues = issuesOf(formWith([named('a', { grid: { responsive: { md: { area: 'one' } } } })]));

		expect(issues.map((issue) => issue.path)).toEqual([
			['steps', 0, 'elements', 0, 'grid', 'responsive', 'md', 'area'],
		]);
	});

	test('a step grid issue points at the step grid', () => {
		const form = {
			id: 'paths',
			steps: [{ id: 'main', title: 'Main', grid: { areas: ['a b'], columns: 2 }, elements: [named('a')] }],
		};
		expect(issuesOf(form).map((issue) => issue.path)).toContainEqual(['steps', 0, 'grid', 'areas']);
	});

	test('a recipe kind that does not fit the step count points at view.$type', () => {
		const issues = issuesOf({
			id: 'paths',
			view: { $type: 'card' },
			steps: [
				{ id: 'one', title: 'One', elements: [] },
				{ id: 'two', title: 'Two', elements: [] },
			],
		});

		expect(issues.map((issue) => issue.path)).toEqual([['view', '$type']]);
	});

	test('an unknown action points at its $type, inside a group too', () => {
		const issues = issuesOf(
			formWith([named('a')], {
				actions: [{ $type: 'missing' }],
			}),
		);
		expect(issues.map((issue) => issue.path)).toEqual([['actions', 0, '$type']]);

		const grouped = issuesOf({
			id: 'paths',
			steps: [{ id: 'main', title: 'Main', elements: [], actions: [[{ $type: 'a' }, { $type: 'b' }]] }],
		});
		expect(grouped.map((issue) => issue.path)).toEqual([
			['steps', 0, 'actions', 0, 0, '$type'],
			['steps', 0, 'actions', 0, 1, '$type'],
		]);
	});

	test('a malformed form reports the envelope issue at its own key', () => {
		const issues = issuesOf({ id: 'paths', steps: 'nope' });

		expect(issues.map((issue) => issue.path)).toEqual([['steps']]);
	});

	test('an issue about the whole form has the empty path', () => {
		const other = createFormEngine({ elements: [field] });
		const issues = issuesOf(other.validateForm(formWith([named('a')])));

		expect(issues).toEqual([
			{ path: [], message: expect.stringMatching(/already normalized by a different engine/i) },
		]);
	});

	test('validateElement reports paths relative to the element', () => {
		try {
			engine.validateElement({
				$type: 'fieldset',
				id: 'group',
				name: 'group',
				elements: [named('a', { grid: { width: 'halve' } })],
			});
			expect.unreachable();
		} catch (error) {
			expect((error as FormValidationError).issues.map((issue) => issue.path)).toEqual([
				['elements', 0, 'grid', 'width'],
			]);
		}
	});
});

describe('issue paths name keys the author wrote', () => {
	test('an area claim resolved through the cascade points at the authored area, keeping the viewport in the message', () => {
		const form = formWith([named('x', { grid: { area: 'a' } })], {
			grid: { areas: { default: ['a b'], md: ['b c'] } },
		});
		const claim = issuesOf(form).find((issue) => /claims area 'a'/.test(issue.message));

		expect(claim?.path).toEqual(['steps', 0, 'elements', 0, 'grid', 'area']);
		expect(claim?.message).toMatch(/at 'md'/);
	});

	test('an area claim written at a breakpoint points at that breakpoint', () => {
		const form = formWith([named('x', { grid: { area: 'a', responsive: { md: { area: 'z' } } } })], {
			grid: { areas: { default: ['a b'], md: ['a b'] } },
		});
		const claim = issuesOf(form).find((issue) => /claims area 'z'/.test(issue.message));

		expect(claim?.path).toEqual(['steps', 0, 'elements', 0, 'grid', 'responsive', 'md', 'area']);
	});

	test('an offset that overflows at a breakpoint points at the key written there', () => {
		const issues = issuesOf(
			formWith([named('a', { grid: { width: 'half', responsive: { md: { offset: 'two-thirds' } } } })]),
		);

		expect(issues.map((issue) => issue.path)).toEqual([
			['steps', 0, 'elements', 0, 'grid', 'responsive', 'md', 'offset'],
		]);
	});

	test('a raw column written at a breakpoint beside a width points at the column', () => {
		const issues = issuesOf(formWith([named('a', { grid: { width: 'half', responsive: { md: { column: 2 } } } })]));

		expect(issues.map((issue) => issue.path)).toEqual([
			['steps', 0, 'elements', 0, 'grid', 'responsive', 'md', 'column'],
		]);
	});

	test('widths beside grid columns point at the columns key', () => {
		expect(
			issuesOf(formWith([named('a', { grid: { width: 'half' } })], { grid: { columns: 2 } })).map(
				(issue) => issue.path,
			),
		).toEqual([['grid', 'columns']]);
		expect(
			issuesOf(
				formWith([named('a', { grid: { width: 'half' } })], { grid: { responsive: { md: { columns: 2 } } } }),
			).map((issue) => issue.path),
		).toEqual([['grid', 'responsive', 'md', 'columns']]);
	});

	test('an area beside a width points at the width', () => {
		const issues = issuesOf(
			formWith([named('a', { grid: { area: 'x', width: 'half' } })], { grid: { areas: ['x'] } }),
		);

		expect(issues[0]?.path).toEqual(['steps', 0, 'elements', 0, 'grid', 'width']);
	});

	test('an unrecognized key is reported at the key itself, as the engine reports a view key', () => {
		const issues = issuesOf(formWith([named('a')], { view: { $type: 'card', shell: { bogus: 1 } } }));

		expect(issues).toMatchObject([{ path: ['view', 'shell', 'bogus'], message: 'Unrecognized key: bogus.' }]);
	});

	test('several unrecognized keys are reported one per key', () => {
		const issues = issuesOf(formWith([named('a')], { view: { $type: 'card', shell: { one: 1, two: 2 } } }));

		expect(issues).toMatchObject([
			{ path: ['view', 'shell', 'one'], message: 'Unrecognized key: one.' },
			{ path: ['view', 'shell', 'two'], message: 'Unrecognized key: two.' },
		]);
	});

	test('a schema issue inside an action group carries the full path', () => {
		const result = actionEngine.safeValidateForm({
			id: 'groups',
			steps: [
				{
					id: 'main',
					title: 'Main',
					elements: [],
					actions: [
						[
							{ id: 'a', $type: 'submit', endpoint: '/a' },
							{ id: 'b', $type: 'submit', endpoint: 3 },
						],
					],
				},
			],
		});

		expect(result.success).toBe(false);
		expect(result.success ? [] : result.issues.map((issue) => issue.path)).toEqual([
			['steps', 0, 'actions', 0, 1, 'endpoint'],
		]);
	});
});

describe('area template issues', () => {
	test('a ragged template at a breakpoint points at grid, areas and the breakpoint', () => {
		const issues = issuesOf(
			formWith([named('a', { grid: { area: 'a' } })], { grid: { areas: { default: ['a'], md: ['a b', 'a'] } } }),
		);

		expect(issues.map((issue) => issue.path)).toContainEqual(['grid', 'areas', 'md']);
		expect(issues.find((issue) => issue.path.at(-1) === 'md')?.message).toMatch(/areas at 'md': row 2 has 1 cell/);
	});
});

describe('union issues', () => {
	const sourceIssues = (source: unknown) =>
		issuesOf(formWith([{ $type: 'choice', id: 'c', name: 'c', source }])).map((issue) => issue.path);
	const at = (...path: PropertyKey[]) => ['steps', 0, 'elements', 0, ...path];

	test('point at the key that failed inside the branch the value matches', () => {
		expect(sourceIssues({ kind: 'http' })).toEqual([at('source', 'endpoint')]);
		expect(sourceIssues({ kind: 'http', endpoint: 'x', method: 'PUT' })).toEqual([at('source', 'method')]);
		expect(sourceIssues({ kind: 'static', values: [1] })).toEqual([at('source', 'values', 0)]);
	});

	test('stay at the union when no branch matches better than another', () => {
		expect(sourceIssues('http')).toEqual([at('source')]);
		expect(sourceIssues({ kind: 'nope' })).toEqual([at('source')]);
	});
});

describe('issue codes', () => {
	const issueFor = (element: Record<string, unknown>) =>
		issuesOf(formWith([{ $type: 'sized', id: 's', name: 's', ...element }]))[0];

	test('a bound carries its code and the bound', () => {
		expect(issueFor({ title: 'ab' })).toMatchObject({
			path: ['steps', 0, 'elements', 0, 'title'],
			message: 'Must be at least 3 characters.',
			code: 'too_small',
			params: { origin: 'string', minimum: 3, inclusive: true },
		});
		expect(issueFor({ count: 9 })).toMatchObject({ code: 'too_big', params: { maximum: 5 } });
	});

	test('an enum carries the values it expected', () => {
		const [issue] = issuesOf(formWith([named('a', { grid: { width: 'halve' } })]));

		expect(issue).toMatchObject({
			code: 'invalid_value',
			params: { values: expect.arrayContaining(['half', 'quarter']) },
		});
	});

	test('a type mismatch carries the expected type', () => {
		expect(issueFor({ count: 'many' })).toMatchObject({ code: 'invalid_type', params: { expected: 'number' } });
	});

	test('an unrecognized key carries its code and the key', () => {
		const issues = issuesOf(formWith([named('a')], { view: { $type: 'card', shell: { bogus: 1 } } }));

		expect(issues[0]).toMatchObject({ code: 'unrecognized_keys', params: { keys: ['bogus'] } });
	});

	test('an issue the engine finds itself has no code', () => {
		const issues = issuesOf(formWith([named('a')], { view: { $type: 'nope' } }));

		expect(issues[0]).not.toHaveProperty('code');
		expect(issues[0]).not.toHaveProperty('params');
	});
});

describe('schema issue messages', () => {
	const messagesFor = (element: Record<string, unknown>) =>
		issuesOf(formWith([{ $type: 'sized', id: 's', name: 's', ...element }])).map((issue) => ({
			key: issue.path.at(-1),
			message: issue.message,
		}));

	test('replace the bare fallback with what the issue reports', () => {
		expect(messagesFor({ title: 'ab', count: 9, contact: 'nope', tags: ['one'], extra: undefined })).toEqual([
			{ key: 'title', message: 'Must be at least 3 characters.' },
			{ key: 'count', message: 'Must be at most 5.' },
			{ key: 'contact', message: 'Invalid email format.' },
			{ key: 'tags', message: 'Must be at least 2 items.' },
		]);
		expect(messagesFor({ count: 'many' })).toEqual([{ key: 'count', message: 'Expected number.' }]);
	});

	test('use the singular for a bound of one', () => {
		expect(messagesFor({ short: 'ab' })).toEqual([{ key: 'short', message: 'Must be at most 1 character.' }]);
	});

	test('keep a message the schema author wrote', () => {
		expect(messagesFor({ note: 'x' })).toEqual([{ key: 'note', message: 'Say more.' }]);
	});
});

describe('error message ids', () => {
	test('lines name the id of each element and step a path passes, while issues stay clean', () => {
		const form = {
			id: 'ids',
			steps: [
				{
					id: 'main',
					title: 'Main',
					elements: [
						named('first'),
						{
							$type: 'fieldset',
							id: 'group',
							name: 'group',
							elements: [named('email', { grid: { width: 'halve' } })],
						},
					],
				},
			],
		};
		let thrown: unknown;
		try {
			engine.validateForm(form);
		} catch (error) {
			thrown = error;
		}

		expect(thrown).toBeInstanceOf(FormValidationError);
		const error = thrown as FormValidationError;
		expect(error.message).toMatch(
			/^steps\[0\] \(main\)\.elements\[1\] \(group\)\.elements\[0\] \(email\)\.grid\.width: /,
		);
		expect(error.issues[0]?.path).toEqual(['steps', 0, 'elements', 1, 'elements', 0, 'grid', 'width']);
		expect(error.issues[0]?.message).not.toContain('email');
	});

	test('formatIssuePath adds ids only when it is given the config', () => {
		const source = { steps: [{ id: 'main', elements: [{ id: 'email' }] }] };
		const path = ['steps', 0, 'elements', 0, 'id'];

		expect(formatIssuePath(path)).toBe('steps[0].elements[0].id');
		expect(formatIssuePath(path, source)).toBe('steps[0] (main).elements[0] (email).id');
	});
});

describe('safeValidateForm', () => {
	test('does not throw, and lists every issue with its path', () => {
		const form = formWith([named('a', { grid: { width: 'halve' } }), { $type: 'missing', id: 'x' }], {
			view: { $type: 'nope' },
		});

		expect(() => engine.safeValidateForm(form)).not.toThrow();
		const result = engine.safeValidateForm(form);
		expect(result.success).toBe(false);
		expect(result.success ? [] : result.issues.map((issue) => issue.path)).toEqual([
			['steps', 0, 'elements', 0, 'grid', 'width'],
			['steps', 0, 'elements', 1, '$type'],
			['view', '$type'],
		]);
	});

	test('returns the same normalized form validateForm does', () => {
		const form = formWith([named('a', { grid: { width: 'half' } })]);
		const result = engine.safeValidateForm(form);

		expect(result.success).toBe(true);
		expect(result.success && result.data).toEqual(engine.validateForm(form));
	});

	test('returns an already normalized form of the same engine as it is', () => {
		const normalized = engine.validateForm(formWith([named('a')]));
		const result = engine.safeValidateForm(normalized);

		expect(result.success && result.data).toBe(normalized);
	});

	test('its issues satisfy the shape a YAML integration reads', () => {
		const [issue] = issuesOf(formWith([named('a', { grid: { width: 'halve' } })]));

		expect(Object.keys(issue ?? {}).toSorted()).toEqual(['code', 'message', 'params', 'path']);
		expect(typeof issue?.message).toBe('string');
		expect(issue?.path.every((key) => typeof key === 'string' || typeof key === 'number')).toBe(true);
	});
});

function thrownBy(form: unknown): FormValidationError {
	try {
		engine.validateForm(form);
	} catch (error) {
		if (error instanceof FormValidationError) return error;
	}
	throw new Error('expected a FormValidationError');
}

describe('FormValidationError', () => {
	test('exposes the same issues validateForm and safeValidateForm report', () => {
		const form = formWith([named('a', { grid: { width: 'halve' } })], { view: { $type: 'nope' } });

		expect(thrownBy(form).issues).toEqual(issuesOf(form));
	});

	test('lists each issue on its own line as the path and the message', () => {
		const error = thrownBy(formWith([named('a', { grid: { width: 'halve' } })], { view: { $type: 'nope' } }));
		const lines = error.message.split('\n');

		expect(lines).toHaveLength(2);
		expect(lines[0]).toMatch(/^steps\[0\] \(main\)\.elements\[0\] \(a\)\.grid\.width: .*half/);
		expect(lines[1]).toMatch(/^view\.\$type: Unknown view recipe 'nope'/);
	});

	test('prints an issue about the whole form without a path prefix', () => {
		const error = new FormValidationError([{ path: [], message: 'Form is broken.' }]);

		expect(error.message).toBe('Form is broken.');
		expect(error.name).toBe('FormValidationError');
	});
});

describe('formatIssuePath', () => {
	test.each([
		[[], ''],
		[['view', '$type'], 'view.$type'],
		[['steps', 0, 'elements', 2, 'grid', 'width'], 'steps[0].elements[2].grid.width'],
		[['actions', 1, 0, '$type'], 'actions[1][0].$type'],
		[[0, 'id'], '[0].id'],
	])('%j reads as %j', (path, text) => {
		expect(formatIssuePath(path)).toBe(text);
	});
});
