import { describe, expect, test } from 'vitest';
import {
	createPatternMaskOptions,
	getMaskedInputPlaceholder,
	loadIMask,
	maskToPlaceholder,
	parseUnmaskMode,
	readMaskValue,
} from '@/lib/mask-options';

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

	test('derives readable placeholders from mask patterns', () => {
		expect(maskToPlaceholder('aa00 0000 0000 000000')).toBe('AA00 0000 0000 000000');
		expect(maskToPlaceholder('0000 0000 0000 0000')).toBe('0000 0000 0000 0000');
		expect(maskToPlaceholder('00/00')).toBe('00/00');
		expect(maskToPlaceholder('\\+{7}(000)000-00-00')).toBe('+7(000)000-00-00');
	});

	test('prefers explicit placeholders over derived mask placeholders', () => {
		expect(getMaskedInputPlaceholder('00/00', 'MM/YY')).toBe('MM/YY');
		expect(getMaskedInputPlaceholder('00/00')).toBe('00/00');
		expect(getMaskedInputPlaceholder('aa00 0000 0000 000000', '  ')).toBe('AA00 0000 0000 000000');
	});
});
