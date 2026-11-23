import {
	FieldGroupRoot,
	FieldLabel,
	FieldInputContainer,
	FieldContent,
	FieldHint,
} from '@/components/ui/schema-engine/components/field';
import { useFormField, combineHandlers } from '@schema-engine/forms-react/hooks';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import type { CheckboxGroupFieldProps } from '@/components/schema-engine/forms/inputs/form-checkbox-group.types';

export function FormCheckboxGroup({
	onChange: propsOnChange,
	onBlur: propsOnBlur,
	onFocus: propsOnFocus,
	...config
}: CheckboxGroupFieldProps) {
	const { value, error, onChange, onBlur, fieldProps, required, containerStyles } = useFormField(config, {
		controlled: true,
	});

	const selectedValues = Array.isArray(value) ? value : [];
	const isHorizontal = config.orientation === 'horizontal';

	const handleChange = (itemValue: string | number, checked: boolean) => {
		const newValues = checked ? [...selectedValues, itemValue] : selectedValues.filter((v) => v !== itemValue);
		combineHandlers(onChange, propsOnChange)(newValues);
	};

	return (
		<FieldGroupRoot style={containerStyles}>
			{config.label ? (
				<FieldLabel htmlFor={config.id} required={required} error={error} className="mb-4">
					{config.label}
				</FieldLabel>
			) : null}
			<FieldContent>
				<div className={isHorizontal ? 'flex flex-wrap gap-4' : 'space-y-3'}>
					{config.options.map((option) => (
						<FieldInputContainer key={option.value}>
							<Checkbox
								id={`${config.id}-${option.value}`}
								isSelected={selectedValues.includes(option.value)}
								onChange={(checked: boolean) => handleChange(option.value, Boolean(checked))}
								onBlur={combineHandlers(onBlur, propsOnBlur)}
								onFocus={propsOnFocus}
								isDisabled={fieldProps.disabled || option.disabled}
								autoFocus={config.autoFocus}
							/>
							<Label htmlFor={`${config.id}-${option.value}`}>{option.label}</Label>
						</FieldInputContainer>
					))}
				</div>
				<FieldHint error={error} description={config.description} display="alternate" />
			</FieldContent>
		</FieldGroupRoot>
	);
}
