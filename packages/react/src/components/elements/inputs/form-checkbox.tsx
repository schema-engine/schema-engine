import { Label } from '@/shadcn/ui/label';
import { Checkbox } from '@/shadcn/ui/checkbox';
import { useControlledFormElement, combineHandlers } from '@/hooks';
import type { CheckboxFieldProps } from './form-checkbox.types';

export function FormCheckbox({
	onChange: propsOnChange,
	onBlur: propsOnBlur,
	onFocus: propsOnFocus,
	...config
}: CheckboxFieldProps) {
	const { fieldState, field, fieldProps, labelProps, errorProps, containerStyles } = useControlledFormElement(config);

	return (
		<div className="space-y-2" style={containerStyles}>
			<div className="flex items-center space-x-2">
				<Checkbox
					{...fieldProps}
					checked={Boolean(field.value)}
					onCheckedChange={(checked) => combineHandlers(field.onChange, propsOnChange)(checked)}
					onBlur={combineHandlers(field.onBlur, propsOnBlur)}
					onFocus={propsOnFocus}
					autoFocus={config.autoFocus}
					data-state={config.indeterminate ? 'indeterminate' : undefined}
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
			{config.description && <p className="text-xs text-muted-foreground">{config.description}</p>}
			{errorProps && <div {...errorProps}>{fieldState.error?.message}</div>}
		</div>
	);
}
