import { Checkbox } from '@/components/ui/checkbox';
import {
	FieldGroupRoot,
	FieldLabel,
	FieldInputContainer,
	FieldContent,
	FieldHint,
} from '@/components/schema-engine/forms/field-group';
import { useControlledFormElement, combineHandlers } from '@schema-engine/forms-react/hooks';
import type { CheckboxFieldProps } from '@/components/schema-engine/forms/inputs/form-checkbox.types';

export function FormCheckbox({
	onChange: propsOnChange,
	onBlur: propsOnBlur,
	onFocus: propsOnFocus,
	...config
}: CheckboxFieldProps) {
	const { value, error, onChange, onBlur, fieldProps, containerStyles } = useControlledFormElement(config);

	return (
		<FieldGroupRoot style={containerStyles}>
			<FieldContent>
				<FieldInputContainer>
					<Checkbox
						{...fieldProps}
						id={config.id}
						isSelected={Boolean(value)}
						onChange={combineHandlers(onChange, propsOnChange)}
						onBlur={combineHandlers(onBlur, propsOnBlur)}
						onFocus={propsOnFocus}
						autoFocus={config.autoFocus}
						aria-label={config.label}
					/>
					{config.label ? (
						<FieldLabel htmlFor={config.id} error={error}>
							{config.label}
						</FieldLabel>
					) : null}
				</FieldInputContainer>
				<FieldHint error={error} description={config.description} display="alternate" />
			</FieldContent>
		</FieldGroupRoot>
	);
}
