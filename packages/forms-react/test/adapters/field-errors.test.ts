import type { FieldErrors } from 'react-hook-form';
import { describe, expect, test } from 'vitest';
import { fromFieldErrors, toFieldErrors } from '@/lib/field-errors';

/** Hand-written nested errors, which React Hook Form's own types cannot express for a field named `ref`. */
const nested = (value: unknown): FieldErrors => value as FieldErrors;

describe('field errors at the React Hook Form boundary', () => {
	test('keeps a field named ref or types, and skips them only inside an error', () => {
		expect(
			fromFieldErrors(
				nested({ ref: { type: 'required', message: 'Ref is required', ref: {}, types: { required: 'x' } } }),
				{},
			),
		).toEqual({ ref: expect.objectContaining({ message: 'Ref is required' }) });
	});

	test('reads ref and types as metadata below an error, and as fields elsewhere', () => {
		const error = { type: 'validation', message: 'Required' };
		expect(
			fromFieldErrors(
				nested({ profile: { ...error, ref: { type: 'text' }, types: { message: 'Rule failed' } } }),
				{},
			),
		).toEqual({ profile: expect.objectContaining({ message: 'Required' }) });
		expect(fromFieldErrors(nested({ profile: { ref: error, types: error } }), {})).toEqual({
			'profile.ref': error,
			'profile.types': error,
		});
	});

	test("reads an array's own error from its root, and leaves a root field alone", () => {
		const error = { type: 'validation', message: 'Add two contacts' };
		expect(fromFieldErrors(nested({ contacts: { root: error } }), { contacts: [] })).toEqual({ contacts: error });
		expect(fromFieldErrors(nested({ settings: { root: error } }), { settings: { root: 'x' } })).toEqual({
			'settings.root': error,
		});
	});

	test('nests a container error and a row error under one node', () => {
		const built = toFieldErrors({
			'contacts.0.email': { type: 'validation', message: 'Email is required' },
			contacts: { type: 'validation', message: 'Add two contacts' },
		});
		expect(built.contacts).toMatchObject({ message: 'Add two contacts' });
		expect(fromFieldErrors(built, { contacts: [{}] })).toEqual({
			contacts: expect.objectContaining({ message: 'Add two contacts' }),
			'contacts.0.email': expect.objectContaining({ message: 'Email is required' }),
		});
	});
});
