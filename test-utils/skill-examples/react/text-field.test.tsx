import { Profiler, useEffect, type ReactNode } from 'react';
import { act, render, screen } from '@testing-library/react';
import { expect, test, vi } from 'vitest';
import { userEvent } from 'vitest/browser';
import { FormRenderer } from '@schema-engine/forms-react';
import { useFormContext, useFormField } from '@schema-engine/forms-react/hooks';
import { engine } from './engine';
import { EmailPreview, ResetButton } from './hooks';
import { profile, ProfileForm } from './profile-form';

let form: ReturnType<typeof useFormContext>;
let emailIssue: ReturnType<typeof useFormField>['issue'];

function Probe() {
	const context = useFormContext();
	const email = useFormField('email');
	useEffect(() => {
		form = context;
		emailIssue = email.issue;
	});
	return null;
}

function mount(defaultValues: Record<string, unknown> = {}, extras: ReactNode = null) {
	const onRender = vi.fn();
	render(
		<Profiler id="form" onRender={onRender}>
			<FormRenderer engine={engine} config={profile} defaultValues={defaultValues}>
				<Probe />
				{extras}
			</FormRenderer>
		</Profiler>,
	);
	return { onRender, input: screen.getByRole('textbox', { name: 'Email' }) };
}

test('typing renders the field zero times once it is dirty', async () => {
	const { onRender, input } = mount();

	await userEvent.type(input, 'a');
	const afterFirst = onRender.mock.calls.length;
	await userEvent.type(input, 'bc');

	expect(onRender).toHaveBeenCalledTimes(afterFirst);
	expect(form.getValues().email).toBe('abc');
});

test('reset and setValue in code write back into the control', async () => {
	const { input } = mount({ email: 'start@example.com' });

	await userEvent.type(input, 'x');
	act(() => form.reset());
	expect(input).toHaveValue('start@example.com');

	act(() => form.setValue('email', 'code@example.com'));
	expect(input).toHaveValue('code@example.com');
});

test('the error is shown, announced, and gone once the value is fixed', async () => {
	const { input } = mount();

	await act(() => form.validate());
	const alert = screen.getByRole('alert');
	expect(alert).toHaveTextContent('Email is required');
	expect(input).toHaveAttribute('aria-invalid', 'true');
	expect(input).toHaveAttribute('aria-describedby', alert.id);

	await userEvent.type(input, 'ada@example.com');
	expect(screen.queryByRole('alert')).toBeNull();
});

test('a native control reports what the browser says about its value', async () => {
	const { input } = mount();

	await userEvent.type(input, 'not an email');
	const result = await act(() => form.validate(['email']));

	expect(result).toEqual({ outcome: 'invalid' });
	expect(screen.getByRole('alert')).toBeInTheDocument();
	expect(emailIssue?.all).toContainEqual(expect.objectContaining({ type: 'typeMismatch', source: 'native' }));
});

test('a controlled component writes through onChange and follows setValue', async () => {
	mount();

	await userEvent.click(screen.getByRole('button', { name: '3 stars' }));
	expect(form.getValues().stars).toBe(3);

	act(() => form.setValue('stars', 5));
	expect(screen.getByRole('button', { name: '5 stars' })).toHaveAttribute('aria-pressed', 'true');
});

test('useWatch follows a value and useFormContext resets the form', async () => {
	const { input } = mount(
		{},
		<>
			<EmailPreview />
			<ResetButton />
		</>,
	);

	await userEvent.type(input, 'ada@example.com');
	expect(screen.getByRole('status')).toHaveTextContent('ada@example.com');

	await userEvent.click(screen.getByRole('button', { name: 'Reset' }));
	expect(input).toHaveValue('');
	expect(screen.getByRole('status')).toHaveTextContent('');
});

test('the form renders its fields and the children it is given', () => {
	render(<ProfileForm />);

	expect(screen.getByRole('textbox', { name: 'Email' })).toBeInTheDocument();
	expect(screen.getByRole('group')).toBeInTheDocument();
	expect(screen.getByRole('button', { name: 'Reset' })).toBeInTheDocument();
});
