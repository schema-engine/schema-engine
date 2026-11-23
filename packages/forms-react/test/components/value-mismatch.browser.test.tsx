import { useEffect } from 'react';
import { render, screen } from '@testing-library/react';
import { userEvent } from 'vitest/browser';
import { expect, test, vi } from 'vitest';
import * as z from 'zod/mini';
import { createFormEngine, defineInput } from '@schema-engine/forms';
import { BaseFieldSchema } from '@schema-engine/forms/schemas/base-field';
import { useFormContext, useFormField } from '@/hooks';
import { FormRenderer } from '@/components/internals/form-renderer';
import { SubmitButtonElementRegistration } from '@/components/schema-engine/forms/actions/submit-button.registration';

const CountSchema = z.extend(BaseFieldSchema, { $type: z.literal('count') });

/** A control that declares a number and writes the text of a native input: the broken contract the runtime reports. */
function CountField(config: z.output<typeof CountSchema>) {
	const { fieldProps, labelProps } = useFormField(config);
	return (
		<div>
			<label {...labelProps}>{config.label}</label>
			<input {...fieldProps} />
		</div>
	);
}

const count = defineInput({
	$type: 'count',
	schema: CountSchema,
	metadata: { name: 'Count', category: 'input' },
	value: () => z.number(),
	render: CountField,
});

const engine = createFormEngine({ elements: [count, SubmitButtonElementRegistration] });
const config = engine.validateForm({
	id: 'broken',
	steps: [
		{
			id: 'main',
			title: 'Main',
			elements: [
				{ $type: 'count', id: 'count', name: 'count', label: 'Count' },
				{ $type: 'submit', id: 'send', name: 'send', label: 'Send' },
			],
		},
	],
});

let failures: unknown;
function Probe() {
	const { formState } = useFormContext();
	const { failures: current } = formState.submission;
	useEffect(() => {
		failures = current;
	});
	return null;
}

test('a control that writes a value its declaration rejects fails the submission at its path, and onSubmit is not called', async () => {
	const onSubmit = vi.fn();
	vi.spyOn(console, 'error').mockImplementation(() => undefined);
	render(
		<FormRenderer engine={engine} config={config} onSubmit={onSubmit}>
			<Probe />
		</FormRenderer>,
	);

	await userEvent.type(screen.getByRole('textbox', { name: 'Count' }), '3');
	await userEvent.click(screen.getByRole('button', { name: 'Send' }));

	await expect.poll(() => failures).toMatchObject([{ type: 'valueMismatch', params: { path: 'count' } }]);
	expect(onSubmit).not.toHaveBeenCalled();
});
