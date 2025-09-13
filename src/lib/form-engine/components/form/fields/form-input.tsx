import { Input } from '@/components/ui/input';
import { FieldGroup } from '@/lib/form-engine/components/form/field-group';
import { useControlledFormElement, combineHandlers } from '@/lib/form-engine/hooks';
import type { InputFieldProps } from './form-input.types';

/**
 * Enhanced Input field component for the form engine.
 * Integrates with React Hook Form and provides validation, state management, etc.
 */
export function FormInput({ config, onChange: propsOnChange, onBlur: propsOnBlur }: InputFieldProps) {
	const { value, error, onChange, onBlur, fieldProps, isRequired, containerStyles } =
		useControlledFormElement(config);

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
					{...config}
					type={config.inputType}
					value={value || ''}
					onChange={(e) => combineHandlers(onChange, propsOnChange)(e.target.value)}
					onBlur={combineHandlers(onBlur, propsOnBlur)}
				/>
			</FieldGroup>
		</div>
	);
}
