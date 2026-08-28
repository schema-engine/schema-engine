import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
	FieldGroupRoot,
	FieldLabel,
	FieldInputContainer,
	FieldContent,
	FieldHint,
} from '@/components/ui/schema-engine/components/field';
import { useControlledFormElement, combineHandlers } from '@schema-engine/forms-react/hooks';
import type { RadioFieldProps } from '@/components/schema-engine/forms/inputs/form-radio.types';
import { Label } from '@/components/ui/label';

export function FormRadio({
	onChange: propsOnChange,
	onBlur: propsOnBlur,
	onFocus: propsOnFocus,
	...config
}: RadioFieldProps) {
	const { value, error, onChange, onBlur, fieldProps, isRequired, containerStyles } =
		useControlledFormElement(config);

	return (
		<FieldGroupRoot style={containerStyles}>
			{config.label ? (
				<FieldLabel htmlFor={config.id} required={isRequired} error={error} className="mb-4">
					{config.label}
				</FieldLabel>
			) : null}
			<FieldContent className="space-y-3">
				<RadioGroup
					{...fieldProps}
					value={value || ''}
					onChange={(val: string) => combineHandlers(onChange, propsOnChange)(String(val))}
					onBlur={combineHandlers(onBlur, propsOnBlur)}
					onFocus={propsOnFocus}
					className={config.orientation === 'horizontal' ? 'flex space-x-4' : 'space-y-2'}
					autoFocus={config.autoFocus}
				>
					{config.options.map((option) => (
						<FieldInputContainer key={option.value}>
							<RadioGroupItem
								value={String(option.value)}
								isDisabled={fieldProps.disabled || option.disabled}
								id={`${config.id}-${option.value}`}
							/>
							<Label htmlFor={`${config.id}-${option.value}`}>{option.label}</Label>
						</FieldInputContainer>
					))}
				</RadioGroup>
				<FieldHint error={error} description={config.description} display="alternate" />
			</FieldContent>
		</FieldGroupRoot>
	);
}
