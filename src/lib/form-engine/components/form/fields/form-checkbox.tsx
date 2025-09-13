import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useControlledFormElement } from '@/lib/form-engine';
import type { CheckboxFieldConfig } from './form-checkbox.types';

interface FormCheckboxProps {
	config: CheckboxFieldConfig;
}

export function FormCheckbox({ config }: FormCheckboxProps) {
	const { fieldState, field, fieldProps, labelProps, errorProps, containerStyles } = useControlledFormElement(config);

	return (
		<div className="space-y-2" style={containerStyles}>
			{config.description && <p className="text-sm text-muted-foreground">{config.description}</p>}
			<div className="flex items-center space-x-2">
				<Checkbox
					{...fieldProps}
					checked={Boolean(field.value)}
					onCheckedChange={field.onChange}
					{...(config.autoFocus && { autoFocus: config.autoFocus })}
					{...(config.indeterminate && { 'data-state': 'indeterminate' })}
				/>
				{config.label && (
					<Label
						{...labelProps}
						className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
					>
						{config.label}
					</Label>
				)}
			</div>
			{errorProps && <div {...errorProps}>{fieldState.error?.message}</div>}
		</div>
	);
}
