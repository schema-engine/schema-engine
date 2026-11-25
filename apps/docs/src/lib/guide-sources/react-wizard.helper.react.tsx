/** @jsxImportSource react */
import * as z from 'zod/mini';
import { BaseFieldSchema, createFormEngine, defineInput } from '@schema-engine/forms';
import { defineRecipeSpec } from '@schema-engine/forms/recipes';
import { WizardActionsConfigSchema } from '@schema-engine/forms/recipes/built-in';
import { fieldText, useFormField, useViewContext } from '@schema-engine/forms-react/hooks';
import { defineRecipe, type FormShellProps } from '@schema-engine/forms-react/primitives';

const InputSchema = z.extend(BaseFieldSchema, {
	$type: z.literal('input'),
	inputType: z.optional(z.enum(['text', 'email'])),
});

function InputField(config: z.output<typeof InputSchema>) {
	const { defaultValue, error, fieldProps, labelProps, errorProps } = useFormField(config);
	return (
		<div>
			<label {...labelProps}>{config.label}</label>
			<input {...fieldProps} type={config.inputType ?? 'text'} defaultValue={fieldText(defaultValue)} />
			{errorProps && <p {...errorProps}>{error}</p>}
		</div>
	);
}

const SelectSchema = z.extend(BaseFieldSchema, {
	$type: z.literal('select'),
	options: z.array(z.object({ value: z.string(), label: z.string() })),
});

function SelectField(config: z.output<typeof SelectSchema>) {
	const { defaultValue, fieldProps, labelProps } = useFormField(config);
	return (
		<div>
			<label {...labelProps}>{config.label}</label>
			<select {...fieldProps} defaultValue={fieldText(defaultValue)}>
				{config.options.map((option) => (
					<option key={option.value} value={option.value}>
						{option.label}
					</option>
				))}
			</select>
		</div>
	);
}

const wizardSpec = defineRecipeSpec({
	$type: 'wizard',
	kind: 'wizard',
	slotSchemas: { actions: WizardActionsConfigSchema },
	metadata: { name: 'Wizard', category: 'wizard' },
});

function Shell({ slots }: FormShellProps) {
	return (
		<div>
			{slots.content}
			{slots.actions}
		</div>
	);
}

function Controls() {
	const { navigation } = useViewContext();
	return (
		<div>
			<button type="button" onClick={navigation.goToPreviousStep} disabled={navigation.isFirstStep}>
				Previous
			</button>
			{navigation.isLastStep ? (
				<button key="submit" type="submit">
					Pay
				</button>
			) : (
				<button key="next" type="button" onClick={navigation.goToNextStep}>
					Next
				</button>
			)}
		</div>
	);
}

/** The engine of the React wizard examples: an input, a select and a wizard recipe, which the page leaves out. */
export const engine = createFormEngine({
	elements: [
		defineInput({
			$type: 'input',
			schema: InputSchema,
			render: InputField,
			value: () => z.string(),
			metadata: { name: 'Input', category: 'input' },
		}),
		defineInput({
			$type: 'select',
			schema: SelectSchema,
			render: SelectField,
			value: () => z.string(),
			metadata: { name: 'Select', category: 'input' },
		}),
	],
	recipes: [defineRecipe(wizardSpec, { shell: Shell, slots: { actions: Controls } })],
});
