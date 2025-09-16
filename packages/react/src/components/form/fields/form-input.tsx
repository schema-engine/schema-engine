import { Input } from '@/shadcn/ui/input';
import { FieldGroup } from '@/components/form/field-group';
import { useControlledFormElement, combineHandlers } from '@/hooks';
import type { InputFieldProps } from './form-input.types';

export function FormInput({ config, onChange: propsOnChange, onBlur: propsOnBlur }: InputFieldProps) {
	const { value, error, onChange, onBlur, fieldProps, isRequired, containerStyles } =
		useControlledFormElement(config);

	const { inputType = 'text', ...htmlConfig } = config;

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
					{...htmlConfig}
					type={inputType}
					value={value || ''}
					onChange={(e) => combineHandlers(onChange, propsOnChange)(e.target.value)}
					onBlur={combineHandlers(onBlur, propsOnBlur)}
				/>
			</FieldGroup>
		</div>
	);
}
