import {
	FieldGroupRoot,
	FieldLabel,
	FieldInputContainer,
	FieldContent,
	FieldHint,
} from '@/components/elements/field-group';
import { useControlledFormElement, combineHandlers } from '@/hooks';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import type { CheckboxGroupFieldProps } from './form-checkbox-group.types';

export function FormCheckboxGroup({
	onChange: propsOnChange,
	onBlur: propsOnBlur,
	onFocus: propsOnFocus,
	...config
}: CheckboxGroupFieldProps) {
	const { value, error, onChange, onBlur, fieldProps, isRequired, containerStyles } =
		useControlledFormElement(config);

	const selectedValues = Array.isArray(value) ? value : [];

	const handleChange = (itemValue: string | number, checked: boolean) => {
		const newValues = checked ? [...selectedValues, itemValue] : selectedValues.filter((v) => v !== itemValue);
		combineHandlers(onChange, propsOnChange)(newValues);
	};

	return (
		<FieldGroupRoot style={containerStyles}>
			{config.label && (
				<FieldLabel htmlFor={config.id} required={isRequired} error={error} className="mb-4">
					{config.label}
				</FieldLabel>
			)}
			<FieldContent className={config.orientation === 'horizontal' ? 'flex flex-wrap gap-4' : 'space-y-3'}>
				{config.options.map((option) => (
					<FieldInputContainer key={option.value}>
						<Checkbox
							id={`${config.id}-${option.value}`}
							checked={selectedValues.includes(option.value)}
							onCheckedChange={(checked) => handleChange(option.value, Boolean(checked))}
							onBlur={combineHandlers(onBlur, propsOnBlur)}
							onFocus={propsOnFocus}
							disabled={fieldProps.disabled || option.disabled}
							autoFocus={config.autoFocus}
						/>
						<Label htmlFor={`${config.id}-${option.value}`}>{option.label}</Label>
					</FieldInputContainer>
				))}
				<FieldHint error={error} description={config.description} display="alternate" />
			</FieldContent>
		</FieldGroupRoot>
	);
}
