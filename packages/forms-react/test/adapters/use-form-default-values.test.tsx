import { describe, expect, it } from 'bun:test';
import { renderHook } from '@testing-library/react';
import { useFormDefaultValues } from '../../src/adapters/rhf/hooks/use-form-default-values';

describe('useFormDefaultValues', () => {
	it('materializes nested object paths from field defaults', () => {
		const { result } = renderHook(() =>
			useFormDefaultValues([
				{ name: 'profile.name', defaultValue: 'Ada' },
				{ name: 'profile.email', defaultValue: 'ada@example.com' },
			]),
		);

		expect(result.current).toEqual({
			profile: {
				name: 'Ada',
				email: 'ada@example.com',
			},
		});
	});

	it('merges user defaults over field defaults for nested structures', () => {
		const { result } = renderHook(() =>
			useFormDefaultValues(
				[
					{ name: 'profile.name', defaultValue: 'Ada' },
					{ name: 'profile.email', defaultValue: 'ada@example.com' },
					{ name: 'preferences.locale', defaultValue: 'en' },
				],
				{
					profile: { email: 'override@example.com' },
					preferences: { locale: 'es' },
				},
			),
		);

		expect(result.current).toEqual({
			profile: {
				name: 'Ada',
				email: 'override@example.com',
			},
			preferences: {
				locale: 'es',
			},
		});
	});

	it('materializes array-backed dotted paths', () => {
		const { result } = renderHook(() =>
			useFormDefaultValues([
				{ name: 'contacts.0.name', defaultValue: 'Ada' },
				{ name: 'contacts.0.email', defaultValue: 'ada@example.com' },
				{ name: 'contacts.1.name', defaultValue: 'Grace' },
			]),
		);

		expect(result.current).toEqual({
			contacts: [{ name: 'Ada', email: 'ada@example.com' }, { name: 'Grace' }],
		});
	});
});
