import { Label } from '@/components/ui/label';
import { useControlledFormElement } from '@/hooks';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { SelectFieldConfig } from './form-select.types';

interface FormSelectProps {
	config: SelectFieldConfig;
}

export function FormSelect({ config }: FormSelectProps) {
	const { fieldState, field, fieldProps, labelProps, errorProps, containerStyles } = useControlledFormElement(config);

	return (
		<div className="space-y-2" style={containerStyles}>
			{config.label && <Label {...labelProps}>{config.label}</Label>}
			{config.description && <p className="text-sm text-muted-foreground">{config.description}</p>}
			<Select
				value={field.value || ''}
				onValueChange={field.onChange}
				disabled={fieldProps.disabled}
				{...(config.multiple && { multiple: config.multiple })}
				{...(config.autoFocus && { autoFocus: config.autoFocus })}
				{...(config.autoComplete && { autoComplete: config.autoComplete })}
			>
				<SelectTrigger {...fieldProps}>
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
