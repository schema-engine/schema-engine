import { act, fireEvent, render, waitFor } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { createFormEngine } from '@schema-engine/forms';
import { FormRenderer } from '@/components/internals/form-renderer';
import { InputElementRegistration } from '@/components/schema-engine/forms/inputs/form-input.registration';
import { ArrayElementRegistration } from '@/components/schema-engine/forms/inputs/form-array-elements.registration';
import { SubmitButtonElementRegistration } from '@/components/schema-engine/forms/actions/submit-button.registration';

const engine = createFormEngine({
	elements: [InputElementRegistration, ArrayElementRegistration, SubmitButtonElementRegistration],
});

const config = engine.validateForm({
	id: 'hydration',
	steps: [
		{
			id: 'main',
			title: 'Main',
			elements: [
				{ $type: 'input', id: 'full-name', name: 'fullName', label: 'Full name' },
				{
					$type: 'arrayElements',
					id: 'contacts',
					name: 'contacts',
					label: 'Contacts',
					elements: [
						{ $type: 'input', id: 'contact-email', name: 'email', label: 'Email' },
						{ $type: 'input', id: 'contact-note', name: 'note', label: 'Note' },
					],
				},
			],
		},
	],
});

const rows = (count: number) =>
	Array.from({ length: count }, (_, index) => ({ email: `row${index}@example.com`, note: '' }));
const form = (rowCount: number, onChange?: (values: Record<string, unknown>) => void) => (
	<FormRenderer
		engine={engine}
		config={config}
		defaultValues={{ fullName: 'Ada', contacts: rows(rowCount) }}
		onChange={onChange}
	/>
);

const hosts: HTMLElement[] = [];
afterEach(() => {
	for (const host of hosts.splice(0)) host.remove();
	vi.restoreAllMocks();
});

/** Server-renders `serverRows` rows and hydrates a client that renders `clientRows` into that markup. */
async function hydrate(serverRows: number, clientRows: number, onChange?: (values: Record<string, unknown>) => void) {
	const host = document.createElement('div');
	host.innerHTML = renderToString(form(serverRows));
	document.body.append(host);
	hosts.push(host);
	const adopted = [...host.querySelectorAll('input')];
	const logged = vi.spyOn(console, 'error').mockImplementation(() => undefined);
	await act(async () => {
		render(form(clientRows, onChange), { container: host, hydrate: true });
	});
	return { host, adopted, logged };
}

describe('hydration', () => {
	test('a form with defaults and array rows hydrates without a mismatch', async () => {
		const { host, adopted, logged } = await hydrate(2, 2);

		expect(logged).not.toHaveBeenCalled();
		const hydrated = [...host.querySelectorAll('input')];
		expect(hydrated).toHaveLength(adopted.length);
		hydrated.forEach((input, index) => expect(input).toBe(adopted[index]));
		expect([...host.querySelectorAll('input')].map((input) => input.value)).toEqual([
			'Ada',
			'row0@example.com',
			'',
			'row1@example.com',
			'',
		]);
	});

	test('the hydrated form is interactive: an edit reaches the form values', async () => {
		const onChange = vi.fn();
		const { host } = await hydrate(2, 2, onChange);
		const email = host.querySelectorAll<HTMLInputElement>('input')[1];

		fireEvent.change(email, { target: { value: 'edited@example.com' } });

		await waitFor(() =>
			expect(onChange).toHaveBeenCalledWith(
				expect.objectContaining({
					contacts: [expect.objectContaining({ email: 'edited@example.com' }), expect.anything()],
				}),
			),
		);
	});
});
