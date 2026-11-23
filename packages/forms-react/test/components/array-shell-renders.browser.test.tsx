import { Profiler } from 'react';
import { expect, test } from 'vitest';
import { render, getAllByRole } from '@testing-library/react';
import { userEvent } from 'vitest/browser';
import { createFormEngine } from '@schema-engine/forms';
import { FormRenderer } from '@/components/internals/form-renderer';
import { InputElementRegistration } from '@/components/schema-engine/forms/inputs/form-input.registration';
import { ArrayElementRegistration } from '@/components/schema-engine/forms/inputs/form-array-elements.registration';

const engine = createFormEngine({ elements: [InputElementRegistration, ArrayElementRegistration] });

const config = engine.validateForm({
	id: 'rows',
	steps: [
		{
			id: 'main',
			title: 'Main',
			elements: [
				{
					$type: 'arrayElements',
					id: 'contacts',
					name: 'contacts',
					label: 'Contacts',
					elements: [{ $type: 'input', id: 'contact-email', name: 'email', label: 'Email' }],
				},
			],
		},
	],
});

test('a keystroke in a row renders neither the array shell nor any other part of the form', async () => {
	let commits = 0;
	const { container } = render(
		<Profiler id="form" onRender={() => (commits += 1)}>
			<FormRenderer
				engine={engine}
				config={config}
				defaultValues={{ contacts: [{ email: '' }, { email: '' }] }}
			/>
		</Profiler>,
	);
	const [first] = getAllByRole(container, 'textbox');

	await userEvent.type(first, 'a');
	const afterFirst = commits;
	await userEvent.type(first, 'bcd');

	expect(first).toHaveValue('abcd');
	expect(commits).toBe(afterFirst);
});
