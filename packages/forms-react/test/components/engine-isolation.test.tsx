import { describe, expect, test } from 'vitest';
import * as z from 'zod/mini';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createFormEngine, defineInput } from '@schema-engine/forms';
import { BaseFieldSchema, type ElementConfig } from '@schema-engine/forms/schemas';
import type { MinLengthRule, ValidationRegistration } from '@schema-engine/forms/schemas/validation';
import { FormRenderer } from '@/components/internals/form-renderer';
import { rhfAdapter } from '@/adapters/react-hook-form';
import { useControlledFormElement } from '@/hooks/use-field';

const isolatedInputSchema = z.extend(BaseFieldSchema, {
	$type: z.literal('isolated-input'),
});

type IsolatedInputConfig = z.infer<typeof isolatedInputSchema>;

function createValidation(message: string, minimum: number): ValidationRegistration<MinLengthRule> {
	return {
		type: 'minLength',
		category: 'string',
		handler: (rule) => z.string().check(z.minLength(minimum, rule.message ?? message)),
	};
}

function createIsolationEngine(message: string, minimum: number) {
	const input = defineInput({
		$type: 'isolated-input',
		schema: isolatedInputSchema,
		metadata: { name: 'Isolated input', category: 'input' },
		validations: [createValidation(message, minimum)],
		render: (config: IsolatedInputConfig) => {
			const { value, error, onChange, onBlur, fieldProps } = useControlledFormElement(
				config as unknown as ElementConfig,
			);

			return (
				<label>
					{config.label}
					<input
						{...fieldProps}
						data-testid={`${config.id}-input`}
						value={String(value ?? '')}
						onChange={(event) => onChange(event.target.value)}
						onBlur={onBlur}
					/>
					<output data-testid={`${config.id}-error`}>{error}</output>
				</label>
			);
		},
	});

	return createFormEngine({ elements: [input] });
}

function createConfig(id: string) {
	return {
		id,
		validationMode: 'onBlur' as const,
		steps: [
			{
				id: 'main',
				title: 'Main',
				elements: [
					{
						$type: 'isolated-input' as const,
						id: `${id}-field`,
						name: 'value',
						label: id,
						rules: [{ type: 'minLength' as const, value: 1 }],
					},
				],
			},
		],
	};
}

describe('FormRenderer engine isolation', () => {
	test('uses each provider engine validation registry for its own fields', async () => {
		const user = userEvent.setup();
		const engineA = createIsolationEngine('Engine A requires three characters', 3);
		const engineB = createIsolationEngine('Engine B requires one character', 1);

		render(
			<>
				<FormRenderer config={createConfig('engine-a')} engine={engineA} adapter={rhfAdapter} />
				<FormRenderer config={createConfig('engine-b')} engine={engineB} adapter={rhfAdapter} />
			</>,
		);

		const inputA = screen.getByTestId('engine-a-field-input');
		const inputB = screen.getByTestId('engine-b-field-input');
		await user.type(inputA, 'x');
		await user.type(inputB, 'x');
		fireEvent.blur(inputA);
		fireEvent.blur(inputB);

		await waitFor(() => {
			expect(screen.getByTestId('engine-a-field-error')).toHaveTextContent('Engine A requires three characters');
		});
		expect(screen.getByTestId('engine-b-field-error')).toBeEmptyDOMElement();
	});
});
