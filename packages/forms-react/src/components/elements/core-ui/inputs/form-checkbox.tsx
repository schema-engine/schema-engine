import { Checkbox } from '@/components/core-ui/checkbox';
import {
	FieldGroupRoot,
	FieldLabel,
	FieldInputContainer,
	FieldContent,
	FieldHint,
} from '@/components/elements/field-group';
import { useControlledFormElement, combineHandlers } from '@/hooks';
import type { CheckboxFieldProps } from './form-checkbox.types';

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
						checked={Boolean(value)}
						onCheckedChange={combineHandlers(onChange, propsOnChange)}
						onBlur={combineHandlers(onBlur, propsOnBlur)}
						onFocus={propsOnFocus}
						autoFocus={config.autoFocus}
						data-state={config.indeterminate ? 'indeterminate' : undefined}
						aria-label={config.label}
					/>
					{config.label && (
						<FieldLabel htmlFor={config.id} error={error}>
							{config.label}
						</FieldLabel>
					)}
				</FieldInputContainer>
				<FieldHint error={error} description={config.description} display="alternate" />
			</FieldContent>
		</FieldGroupRoot>
	);
}
