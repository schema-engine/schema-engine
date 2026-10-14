import { describe, expect, test } from 'vitest';
import { renderToString } from '@ecopages/jsx/server';
import { FormField } from '@/elements/form-field';
import { createRadiantFormEngine } from '@/registries/builder-registry';
import { schemaFormRegistrations } from '@/registrations';
import { renderRegisteredElement } from '@/components/internals/render-registered-element';
import { FormElements } from '@/components/internals/form-elements';
import { renderArraySsrAcceptanceHtml } from './render-form-array-ssr-html';

describe('SSR array markup', () => {
	test('serializes a scalar default through RuiField defaultValueData', () => {
		const html = renderToString(FormField({ name: 'role', defaultValueData: '"Alice"', children: 'Role' }), {
			mode: 'plain',
		});

		expect(html).toContain('data-default-value="&quot;Alice&quot;"');
	});

	test('applies an indexed initial value to a rendered child field', () => {
		const engine = createRadiantFormEngine({ elements: schemaFormRegistrations });
		const config = engine.validateElement({
			$type: 'input',
			id: 'role',
			name: 'role',
			label: 'Role',
			inputType: 'text',
		});
		const html = renderToString(
			renderRegisteredElement(
				config,
				engine,
				{ name: 'contacts.0.role' },
				{
					values: { contacts: [{ role: 'Alice' }] },
					initialValues: { contacts: [{ role: 'Alice' }] },
					fieldPath: 'contacts.0.role',
				},
			),
			{ mode: 'plain' },
		);

		expect(html).toContain('data-default-value="&quot;Alice&quot;"');
		expect(html).toContain('value="Alice"');
	});

	test('applies values through the scoped FormElements renderer', () => {
		const engine = createRadiantFormEngine({ elements: schemaFormRegistrations });
		const config = engine.validateElement({
			$type: 'input',
			id: 'role',
			name: 'role',
			label: 'Role',
			inputType: 'text',
		});
		const html = renderToString(
			FormElements({
				elements: [config],
				engine,
				namePrefix: 'contacts.0',
				initialValues: { contacts: [{ role: 'Alice' }] },
			}),
			{ mode: 'plain' },
		);

		expect(html).toContain('name="contacts.0.role"');
		expect(html).toContain('data-default-value="&quot;Alice&quot;"');
		expect(html).toContain('value="Alice"');
	});

	test('renders default rows with deterministic engine seed ids', () => {
		const html = renderArraySsrAcceptanceHtml();

		expect(html.match(/class="se-form-array__item"/g) ?? []).toHaveLength(2);
		expect(html).toContain('data-se-row-id="seed-0"');
		expect(html).toContain('data-se-row-id="seed-1"');
		expect(html).toContain('data-default-value');
		expect(html).toContain('Alice');
		expect(html).toContain('Bob');
	});
});
