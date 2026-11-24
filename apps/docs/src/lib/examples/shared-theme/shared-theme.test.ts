import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';
import { checkoutEngine, profileEngine } from './engines';
import { checkoutForm, profileForm } from './config';
import { brandTheme } from './theme';

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');

describe('two engines on one theme', () => {
	test('share the theme object, so every form carries one theme id', () => {
		expect(checkoutEngine.getLayout()).toBe(brandTheme);
		expect(profileEngine.getLayout()).toBe(checkoutEngine.getLayout());
	});

	test('each validates its own form, and each form picks its own tone', () => {
		expect(checkoutEngine.safeValidateForm(checkoutForm)).toMatchObject({ success: true });
		expect(profileEngine.safeValidateForm(profileForm)).toMatchObject({ success: true });
		expect([checkoutForm.appearance, profileForm.appearance]).toEqual([{ tone: 'brand' }, { tone: 'forest' }]);
	});

	test('theme.ts is the file of the brand theme example, so the two cannot drift', () => {
		expect(read('./theme.ts')).toBe(read('../brand-theme/theme.ts'));
	});
});
