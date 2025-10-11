import { Label } from '@/shadcn/ui/label';
import { useControlledFormElement, combineHandlers } from '@/hooks';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shadcn/ui/select';
import type { SelectFieldConfig, SelectFieldProps } from './form-select.types';
import { SelectFieldConfigSchema } from './form-select.types';
import type { ElementRegistration } from '@json-form-engine/core/types';

export function FormSelect({
	onChange: propsOnChange,
	onBlur: propsOnBlur,
	onFocus: propsOnFocus,
	...config
}: SelectFieldProps) {
	const { fieldState, field, fieldProps, labelProps, errorProps, containerStyles } = useControlledFormElement(config);

	return (
		<div className="space-y-2" style={containerStyles}>
			{config.label && <Label {...labelProps}>{config.label}</Label>}
			{config.description && <p className="text-sm text-muted-foreground">{config.description}</p>}
			<Select
				value={field.value || ''}
				onValueChange={(value) => combineHandlers(field.onChange, propsOnChange)(value)}
				disabled={fieldProps.disabled}
			>
				<SelectTrigger
					{...fieldProps}
					onBlur={combineHandlers(field.onBlur, propsOnBlur)}
					onFocus={propsOnFocus}
				>
					<SelectValue placeholder={config.placeholder} />
				</SelectTrigger>
				<SelectContent>
					{config.options.map((option) => (
						<SelectItem key={option.value} value={String(option.value)} disabled={option.disabled}>
							{option.label}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
			{errorProps && <div {...errorProps}>{fieldState.error?.message}</div>}
		</div>
	);
}

export const SelectElement: ElementRegistration<SelectFieldConfig, SelectFieldProps> = {
	componentId: 'select',
	render: FormSelect,
	schema: SelectFieldConfigSchema,
	metadata: {
		name: 'Select Field',
		description: 'Dropdown select field for choosing from predefined options',
		category: 'input',
	},
};
