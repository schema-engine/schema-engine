import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';
import { builtInAxes } from '@schema-engine/layout';
import { createRadiantFormEngine, schemaFormRegistrations } from '@schema-engine/forms-radiant';
import { themedForm } from './config';
import { engine as radiantEngine } from './theming.radiant';
import { engine as reactEngine } from './theming.react';

const css = readFileSync(new URL('./themed.css', import.meta.url), 'utf8');
const size = builtInAxes.find((axis) => axis.$type === 'size')!;

describe('the themed form', () => {
	test.each([
		['React', reactEngine],
		['Radiant', radiantEngine],
	])('is valid in the %s engine built on the theme', (_renderer, engine) => {
		expect(engine.safeValidateForm(themedForm)).toMatchObject({ success: true });
	});

	test('fails in an engine that is not built on the theme', () => {
		const plain = createRadiantFormEngine({ elements: schemaFormRegistrations });
		expect(() => plain.validateForm(themedForm)).toThrow(/Unknown axis 'tone'/);
	});

	test.each([
		['React', reactEngine],
		['Radiant', radiantEngine],
	])(
		'accepts the show_notification entry of the config, so a config naming an unregistered action fails, in the %s engine',
		(_renderer, engine) => {
			const result = engine.safeValidateForm(themedForm);
			expect(result.success && result.data.actions).toMatchObject([
				{
					$type: 'show_notification',
					message: 'Account created.',
					variant: 'success',
					triggers: ['form_submit_success'],
				},
			]);
		},
	);
});

describe('the stylesheet', () => {
	test('sets only hooks the compact size of the theme reads', () => {
		const compact = Object.values(size.values.compact).join(' ');
		const hooks = [...css.matchAll(/(--se-[\w-]+-compact):/g)].map((match) => match[1]!);
		expect(hooks.length).toBeGreaterThan(0);
		for (const hook of hooks) expect(compact, hook).toContain(`var(${hook},`);
	});
});
