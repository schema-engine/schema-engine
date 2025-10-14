import { Label } from '@/shadcn/ui/label';
import { RadioGroup, RadioGroupItem } from '@/shadcn/ui/radio-group';
import { FieldGroup } from '@/components/elements/field-group';
import { useControlledFormElement, combineHandlers } from '@/hooks';
import type { RadioFieldProps } from './form-radio.types';

export function FormRadio({
	onChange: propsOnChange,
	onBlur: propsOnBlur,
	onFocus: propsOnFocus,
	...config
}: RadioFieldProps) {
	const { value, error, onChange, onBlur, fieldProps, isRequired, containerStyles } =
		useControlledFormElement(config);

	return (
		<FieldGroup
			label={config.label || config.name}
			htmlFor={config.id}
			hiddenLabel={!config.label}
			required={isRequired}
			description={config.description}
			error={error}
			style={containerStyles}
		>
			<RadioGroup
				{...fieldProps}
				value={value || ''}
				onValueChange={(value) => combineHandlers(onChange, propsOnChange)(value)}
				onBlur={combineHandlers(onBlur, propsOnBlur)}
				onFocus={propsOnFocus}
				className={config.orientation === 'horizontal' ? 'flex space-x-4' : 'space-y-2 my-4'}
				autoFocus={config.autoFocus}
			>
				{config.options.map((option) => (
					<div key={option.value} className="flex items-center space-x-2">
						<RadioGroupItem
							value={String(option.value)}
							disabled={fieldProps.disabled || option.disabled}
						/>
						<Label
							htmlFor={`${config.id}-${option.value}`}
							className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
						>
							{option.label}
						</Label>
					</div>
				))}
			</RadioGroup>
		</FieldGroup>
	);
}
