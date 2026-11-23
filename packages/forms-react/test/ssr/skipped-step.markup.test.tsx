import { renderToStaticMarkup } from 'react-dom/server';
import { expect, test } from 'vitest';
import { FormEngineProvider } from '@/components/form-engine-provider';
import { FormRenderer } from '@/components/internals/form-renderer';
import { testEngine } from '../utils/form-harness';

const input = (name: string, extra: Record<string, unknown> = {}) => ({ $type: 'input', id: name, name, ...extra });

test('the server markup leaves out a field whose show condition reads a skipped step, as the client will', () => {
	const config = testEngine.validateForm({
		id: 'ssr-skip',
		steps: [
			{ id: 'one', title: 'One', elements: [input('hasCompany', { defaultValue: 'no' })] },
			{
				id: 'company',
				title: 'Company',
				constraints: [{ field: 'hasCompany', operator: 'equals', value: 'yes', $type: 'show' }],
				elements: [input('wants', { defaultValue: 'yes' })],
			},
			{
				id: 'payment',
				title: 'Payment',
				elements: [
					input('vat', {
						constraints: [{ field: 'wants', operator: 'equals', value: 'yes', $type: 'show' }],
					}),
					input('card'),
				],
			},
		],
	});
	const html = renderToStaticMarkup(
		<FormEngineProvider engine={testEngine}>
			<FormRenderer engine={testEngine} config={config} />
		</FormEngineProvider>,
	);
	expect(html).toContain('name="card"');
	expect(html).not.toContain('name="vat"');
	expect(html).not.toContain('name="wants"');
});
