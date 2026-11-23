import { describe, expect, test } from 'vitest';
import * as z from 'zod/mini';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
	createFormEngine,
	defineInput,
	BaseFieldSchema,
	MinLengthRuleSchema,
	type MinLengthRule,
	type ValidationRegistration,
} from '@schema-engine/forms';
import { FormRenderer } from '@/components/internals/form-renderer';
import { useFormField } from '@/hooks/form-state';
import { anyValue } from '../utils/any-value';

const isolatedInputSchema = z.extend(BaseFieldSchema, {
	$type: z.literal('isolated-input'),
});

type IsolatedInputConfig = z.infer<typeof isolatedInputSchema>;

function createValidation(message: string, minimum: number): ValidationRegistration<MinLengthRule> {
	return {
		$type: 'minLength',
		schema: MinLengthRuleSchema,
		metadata: { name: 'Minimum length' },
		category: 'string',
		handler: (rule) => z.string().check(z.minLength(minimum, rule.message ?? message)),
	};
}

function createIsolationEngine(message: string, minimum: number) {
	const input = defineInput({
		value: anyValue,
		$type: 'isolated-input',
		schema: isolatedInputSchema,
		metadata: { name: 'Isolated input', category: 'input' },
		validations: [createValidation(message, minimum)],
		render: (config: IsolatedInputConfig) => {
			const { defaultValue, error, fieldProps } = useFormField(config);

			return (
				<label>
					{config.label}
					<input
						{...fieldProps}
						data-testid={`${config.id}-input`}
						defaultValue={String(defaultValue ?? '')}
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
						rules: [{ $type: 'minLength' as const, value: 1 }],
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
				<FormRenderer config={createConfig('engine-a')} engine={engineA} />
				<FormRenderer config={createConfig('engine-b')} engine={engineB} />
			</>,
		);

		const inputA = screen.getByTestId('engine-a-field-input');
		const inputB = screen.getByTestId('engine-b-field-input');
		await user.type(inputA, 'x');
		await user.type(inputB, 'x');
		fireEvent.blur(inputA);
		fireEvent.blur(inputB);

		await waitFor(() => {
			expect(inputA).toHaveAttribute('aria-invalid', 'true');
		});
		expect(inputB).toHaveAttribute('aria-invalid', 'false');
	});
});
