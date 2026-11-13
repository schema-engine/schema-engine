import { describe, expect, test } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useFieldHost } from '@/hooks/use-field';
import { getDefaultLayoutTheme } from '@schema-engine/layout';

describe('useFieldHost', () => {
	test('gives any element the grid host attributes, not just inputs', () => {
		const { result } = renderHook(() => useFieldHost({ column: 'span 2' }));
		expect(result.current.className).toBe('se-form-field se-grid-item');
		expect(result.current['data-se-theme']).toBe(getDefaultLayoutTheme().id);
		expect(result.current.style).toMatchObject({ '--se-field-grid-column': 'span 2' });
	});

	test('carries per-element spacing tokens', () => {
		const { result } = renderHook(() => useFieldHost({ marginBlockEnd: 'wide' }));
		expect(result.current.style).toMatchObject({
			'--se-field-margin-block-end': 'var(--se-grid-gap-wide, var(--se-grid-gap-base-wide))',
		});
	});

	test('an authored style wins over the generated variables', () => {
		const { result } = renderHook(() => useFieldHost({ column: 2 }, { marginTop: '1rem' }));
		expect(result.current.style).toMatchObject({ marginTop: '1rem', '--se-field-grid-column': '2' });
	});

	test('emits no grid variables when the element has no grid config', () => {
		const { result } = renderHook(() => useFieldHost());
		expect(result.current.style).toEqual({});
	});
});
