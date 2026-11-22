import { expect, test } from 'vitest';
import { renderToString } from '@ecopages/jsx/server';
import { withRadiantServerCustomElementRenderBridge } from '@ecopages/radiant/server/radiant-element-ssr';
import { FormInput } from '@/elements/inputs/form-input';
import { InputFieldSchema } from '@/elements/inputs/form-input.types';
import { renderHydrationHtml } from './render-hydration-html';

const renderField = (rules: unknown[]) =>
	withRadiantServerCustomElementRenderBridge(() =>
		renderToString(FormInput(InputFieldSchema.parse({ $type: 'input', id: 'name', name: 'name', rules })), {
			mode: 'plain',
		}),
	);

test('a field the config requires says so for hydration', () => {
	const html = renderField([{ type: 'required', message: 'Required' }]);
	expect(html).toMatch(/<se-field[^>]*data-se-required/);
	expect(html).toContain('aria-required="true"');
});

test('a field without a required rule carries no required attribute', () => {
	expect(renderField([{ type: 'email' }])).not.toMatch(/<se-field[^>]*data-se-required/);
});

test('no rules are serialized for hydration, because the form container validates', () => {
	const html = renderHydrationHtml();
	expect(html).not.toContain('data-se-validation-rules');
	expect(html).not.toContain('data-se-field-rules');
});
