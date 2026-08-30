import { describe, expect, test } from 'vitest';
import { createPatternMaskOptions, loadIMask, parseUnmaskMode, readMaskValue } from '@/lib/mask-options';

describe('mask options', () => {
	test('loads imask on demand', async () => {
		const IMask = await loadIMask();
		expect(typeof IMask).toBe('function');
		expect(await loadIMask()).toBe(IMask);
	});

	test('parses unmask modes', () => {
		expect(parseUnmaskMode('typed')).toBe('typed');
		expect(parseUnmaskMode(true)).toBe(true);
		expect(parseUnmaskMode('true')).toBe(true);
		expect(parseUnmaskMode(false)).toBe(false);
		expect(parseUnmaskMode('')).toBe(false);
	});

	test('builds a pattern mask and converts string definitions to regex', () => {
		const options = createPatternMaskOptions({
			mask: '00-00',
			lazy: false,
			overwrite: true,
			placeholderChar: '_',
			definitions: { x: '[0-9]' },
		});

		expect(options.mask).toBe('00-00');
		expect(options.lazy).toBe(false);
		expect(options.definitions?.x).toEqual(/[0-9]/);
	});

	test('reads masked, unmasked, and typed values', () => {
		const mask = {
			value: '12-34',
			unmaskedValue: '1234',
			typedValue: 1234,
		};

		expect(readMaskValue(mask, false)).toBe('12-34');
		expect(readMaskValue(mask, true)).toBe('1234');
		expect(readMaskValue(mask, 'typed')).toBe('1234');
	});
});
