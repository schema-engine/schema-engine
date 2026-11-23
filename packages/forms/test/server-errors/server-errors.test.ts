import { describe, expect, test } from 'vitest';
import { containerOptions } from '../../../../test-utils/form-state-container-conformance';
import { markNormalizedElementConfig } from '@/lib/normalized-form-config';
import type { ElementConfig } from '@/schemas/field-config';
import { createDefaultValidationRegistry } from '@/schemas/validation';
import { fromJsonApiErrors, fromProblemDetails, ServerErrorsInputError } from '@/server-errors';
import { createFormStateContainer } from '@/state-container/create-form-state-container';
import { FORM_ROOT } from '@/state-container/types';

describe('fromProblemDetails', () => {
	test('maps each error to the dotted path of its pointer, in plain or fragment form, with code, detail and extra members', () => {
		expect(
			fromProblemDetails({
				type: 'https://example.com/problems/invalid',
				title: 'Invalid',
				status: 422,
				errors: [
					{
						pointer: '#/contacts/0/email',
						detail: 'Already registered',
						code: 'taken',
						limit: 3,
						fn: () => 1,
					},
					{ pointer: '/address/street', detail: 'Too short' },
					{ pointer: '/a~1b/c~0d' },
				],
			}),
		).toEqual({
			'contacts.0.email': { type: 'taken', message: 'Already registered', params: { limit: 3 } },
			'address.street': { type: 'https://example.com/problems/invalid', message: 'Too short' },
			'a/b.c~d': { type: 'https://example.com/problems/invalid' },
		});
	});

	test('puts an error with no pointer on the form, and several errors on one path into a list', () => {
		expect(
			fromProblemDetails({
				errors: [
					{ code: 'taken', pointer: '/email' },
					{ code: 'blocked', pointer: '/email', domain: 'example.com' },
					{ detail: 'Try later' },
				],
			}),
		).toEqual({
			email: [{ type: 'taken' }, { type: 'blocked', params: { domain: 'example.com' } }],
			[FORM_ROOT]: { message: 'Try later' },
		});
	});

	test('turns a problem with no errors into one issue on the form, and treats about:blank as no type', () => {
		expect(fromProblemDetails({ type: 'urn:problem:down', detail: 'Maintenance' })).toEqual({
			[FORM_ROOT]: { type: 'urn:problem:down', message: 'Maintenance' },
		});
		expect(fromProblemDetails({ type: 'about:blank', status: 500, errors: [] })).toEqual({ [FORM_ROOT]: {} });
	});

	test('rejects reserved segments, bad pointers and shapes it does not recognise, with a typed error', () => {
		for (const pointer of ['/__x', '/a/constructor', '#/prototype/b', '/__proto__']) {
			expect(() => fromProblemDetails({ errors: [{ pointer }] })).toThrow(ServerErrorsInputError);
			expect(() => fromProblemDetails({ errors: [{ pointer }] })).toThrow(/reserved/);
		}
		expect(() => fromProblemDetails({ errors: [{ pointer: 'email' }] })).toThrow(/not a JSON Pointer/);
		expect(() => fromProblemDetails({ errors: [{ pointer: '/a//b' }] })).toThrow(/empty segment/);
		expect(() => fromProblemDetails({ errors: [{ pointer: '/a.b' }] })).toThrow(/dotted path/);
		for (const pointer of [7, null, ['a'], {}, true]) {
			expect(() => fromProblemDetails({ errors: [{ pointer, detail: 'x' }] })).toThrow(/pointer.*string/);
		}
		expect(() => fromProblemDetails({ errors: [{ title: 'Bad', limit: 3 }] })).toThrow(/none of/);
		expect(() => fromProblemDetails({ errors: [{}] })).toThrow(ServerErrorsInputError);
		for (const input of [null, 'oops', 7, [], {}, { foo: 1 }, { errors: 'x' }, { errors: ['x'] }]) {
			expect(() => fromProblemDetails(input)).toThrow(ServerErrorsInputError);
		}
	});
});

describe('fromJsonApiErrors', () => {
	test('maps source.pointer without the leading /data/attributes, with code, detail and meta', () => {
		expect(
			fromJsonApiErrors({
				errors: [
					{
						source: { pointer: '/data/attributes/email' },
						code: 'taken',
						detail: 'Already registered',
						meta: { limit: 3 },
					},
					{ source: { pointer: '/data/attributes/contacts/1/email' }, title: 'ignored' },
					{ source: { pointer: '/data/relationships/owner' } },
					{ source: { pointer: '/data' }, detail: 'Whole resource' },
					{ source: { parameter: 'q' }, detail: 'Bad query' },
				],
			}),
		).toEqual({
			email: { type: 'taken', message: 'Already registered', params: { limit: 3 } },
			'contacts.1.email': {},
			'data.relationships.owner': {},
			[FORM_ROOT]: [{ message: 'Whole resource' }, { message: 'Bad query' }],
		});
	});

	test('groups several errors on one path, and rejects reserved segments and shapes it does not recognise', () => {
		expect(
			fromJsonApiErrors({
				errors: [
					{ source: { pointer: '/data/attributes/name' }, code: 'a' },
					{ source: { pointer: '/data/attributes/name' }, code: 'b' },
				],
			}),
		).toEqual({ name: [{ type: 'a' }, { type: 'b' }] });
		expect(fromJsonApiErrors({ errors: [] })).toEqual({});
		expect(() => fromJsonApiErrors({ errors: [{ source: { pointer: '/data/attributes/__x' } }] })).toThrow(
			/reserved/,
		);
		for (const pointer of [7, null, ['a']]) {
			expect(() => fromJsonApiErrors({ errors: [{ source: { pointer }, detail: 'x' }] })).toThrow(
				/pointer.*string/,
			);
		}
		expect(() => fromJsonApiErrors({ errors: [{ title: 'Bad' }] })).toThrow(/none of/);
		expect(() => fromJsonApiErrors({ errors: [{ source: { parameter: 'q' } }] })).toThrow(/none of/);
		for (const input of [null, 'x', {}, { errors: {} }, { errors: [1] }, { errors: [{ source: 'x' }] }]) {
			expect(() => fromJsonApiErrors(input)).toThrow(ServerErrorsInputError);
		}
	});
});

describe('the helpers and setServerErrors', () => {
	test('a response from either helper is accepted by a passed submission', async () => {
		const store = createFormStateContainer(
			containerOptions({
				registry: createDefaultValidationRegistry(),
				elements: [
					markNormalizedElementConfig({ $type: 'input', name: 'email' } as unknown as ElementConfig),
					markNormalizedElementConfig(
						{
							$type: 'arrayElements',
							name: 'contacts',
							elements: [{ $type: 'input', name: 'email' }],
						} as unknown as ElementConfig,
						'array',
					),
				],
				defaults: { email: 'a@example.com', contacts: [{ email: 'b@example.com' }] },
			}),
		);
		const submitted = await store.submit();
		if (submitted.outcome !== 'passed') throw new Error('The submission did not pass.');
		submitted.setServerErrors({
			...fromProblemDetails({
				errors: [
					{ pointer: '/email', code: 'taken' },
					{ pointer: '/email', code: 'blocked' },
				],
			}),
			...fromJsonApiErrors({
				errors: [{ source: { pointer: '/data/attributes/contacts/0/email' }, code: 'bounced' }],
			}),
			...fromProblemDetails({ detail: 'Try later' }),
		});
		expect(store.getSnapshot().errors.email.all.map(({ type }) => type)).toEqual(['taken', 'blocked']);
		expect(store.getSnapshot().errors['contacts.0.email'].type).toBe('bounced');
		expect(store.getSnapshot().errors[FORM_ROOT].message).toBe('Try later');
	});
});
