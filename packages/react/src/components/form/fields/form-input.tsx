import { Input } from '@/shadcn/ui/input';
import { FieldGroup } from '@/components/form/field-group';
import { useControlledFormElement, combineHandlers } from '@/hooks';
import type { InputFieldConfig, InputFieldProps } from './form-input.types';
import { InputFieldSchema } from './form-input.types';
import type { ElementRegistration } from '@json-form-engine/core';

export function FormInput({
	onChange: propsOnChange,
	onBlur: propsOnBlur,
	onFocus: propsOnFocus,
	...config
}: InputFieldProps) {
	const { value, error, onChange, onBlur, fieldProps, isRequired, containerStyles } =
		useControlledFormElement(config);

	const { inputType = 'text' } = config;

	return (
		<div style={containerStyles}>
			<FieldGroup
				label={config.label || config.name}
				htmlFor={config.id}
				hiddenLabel={!config.label}
				required={isRequired}
				error={error}
			>
				{config.description && <p className="text-sm text-muted-foreground mb-2">{config.description}</p>}
				<Input
					{...fieldProps}
					type={inputType}
					value={value || ''}
					onChange={(e) => combineHandlers(onChange, propsOnChange)(e.target.value)}
					onBlur={combineHandlers(onBlur, propsOnBlur)}
					onFocus={propsOnFocus}
					{...config}
				/>
			</FieldGroup>
		</div>
	);
}

export const InputElement: ElementRegistration<InputFieldConfig, InputFieldProps> = {
	componentId: 'input',
	render: FormInput,
	schema: InputFieldSchema,
	metadata: {
		name: 'Text Input Field',
		description: 'Text input field for various input types (text, email, password, etc.)',
		category: 'input',
	},
};
