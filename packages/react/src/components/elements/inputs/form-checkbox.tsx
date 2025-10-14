import { Label } from '@/shadcn/ui/label';
import { Checkbox } from '@/shadcn/ui/checkbox';
import { FieldGroup } from '@/components/elements/field-group';
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
		<FieldGroup
			label={config.label || config.name}
			htmlFor={config.id}
			hiddenLabel
			description={config.description}
			error={error}
			style={containerStyles}
		>
			<div className="flex items-center space-x-2">
				<Checkbox
					{...fieldProps}
					checked={Boolean(value)}
					onCheckedChange={(checked) => combineHandlers(onChange, propsOnChange)(checked)}
					onBlur={combineHandlers(onBlur, propsOnBlur)}
					onFocus={propsOnFocus}
					autoFocus={config.autoFocus}
					data-state={config.indeterminate ? 'indeterminate' : undefined}
				/>
				{config.label && (
					<Label
						htmlFor={config.id}
						className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
					>
						{config.label}
					</Label>
				)}
			</div>
		</FieldGroup>
	);
}
