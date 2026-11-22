import { expect, test, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { userEvent } from 'vitest/browser';
import { fieldText } from '@/hooks/field-text';
import { useFormField } from '@/hooks/form-state';
import { useFormStateContext } from '@/hooks/form-state/context';
import { renderProvider } from '../utils/form-harness';

function Name() {
	const { defaultValue, fieldProps } = useFormField({ $type: 'input', name: 'name', id: 'name' });
	return <input aria-label="name" {...fieldProps} defaultValue={fieldText(defaultValue)} />;
}

function Buttons() {
	const { container } = useFormStateContext();
	return (
		<>
			<button type="button" onClick={() => container.setValue('name', 'from code')}>
				Set
			</button>
			<button type="reset">Reset</button>
			<button type="submit">Send</button>
		</>
	);
}

test('a native reset button restores the defaults in the container, the control and the submission', async () => {
	const onSubmit = vi.fn();
	renderProvider(
		{
			id: 'reset-form',
			steps: [{ id: 's', title: 'S', elements: [{ $type: 'input', name: 'name', id: 'name', label: 'Name' }] }],
		},
		<>
			<Name />
			<Buttons />
		</>,
		{ defaultValues: { name: 'start' }, onSubmit },
	);
	const input = screen.getByRole('textbox', { name: 'name' });
	await userEvent.type(input, ' typed');
	await userEvent.click(screen.getByRole('button', { name: 'Set' }));
	await userEvent.type(input, '!');

	await userEvent.click(screen.getByRole('button', { name: 'Reset' }));
	expect(input).toHaveValue('start');
	await userEvent.click(screen.getByRole('button', { name: 'Send' }));

	await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
	expect(onSubmit.mock.calls[0][0]).toMatchObject({ name: 'start' });
});
