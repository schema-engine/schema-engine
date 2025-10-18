import { FieldGroup } from '@/components/elements/field-group';
import { useControlledFormElement, combineHandlers } from '@/hooks';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/base-ui/select';
import type { SelectFieldProps } from './form-select.types';

export function FormSelect({
	onChange: propsOnChange,
	onBlur: propsOnBlur,
	onFocus: propsOnFocus,
	...config
}: SelectFieldProps) {
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
			<Select
				value={value || ''}
				onValueChange={(val: unknown) => combineHandlers(onChange, propsOnChange)(String(val))}
				disabled={fieldProps.disabled}
			>
				<SelectTrigger {...fieldProps} onBlur={combineHandlers(onBlur, propsOnBlur)} onFocus={propsOnFocus}>
					<SelectValue />
				</SelectTrigger>
				<SelectContent>
					{config.options.map((option) => (
						<SelectItem key={option.value} value={String(option.value)} disabled={option.disabled}>
							{option.label}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
		</FieldGroup>
	);
}
