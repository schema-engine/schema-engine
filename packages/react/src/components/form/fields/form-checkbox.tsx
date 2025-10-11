import { Label } from '@/shadcn/ui/label';
import { Checkbox } from '@/shadcn/ui/checkbox';
import { useControlledFormElement, combineHandlers } from '@/hooks';
import type { CheckboxFieldConfig, CheckboxFieldProps } from './form-checkbox.types';
import { CheckboxFieldConfigSchema } from './form-checkbox.types';
import type { ElementRegistration } from '@json-form-engine/core/types';

export function FormCheckbox({
	onChange: propsOnChange,
	onBlur: propsOnBlur,
	onFocus: propsOnFocus,
	...config
}: CheckboxFieldProps) {
	const { fieldState, field, fieldProps, labelProps, errorProps, containerStyles } = useControlledFormElement(config);

	return (
		<div className="space-y-2" style={containerStyles}>
			{config.description && <p className="text-sm text-muted-foreground">{config.description}</p>}
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
			{errorProps && <div {...errorProps}>{fieldState.error?.message}</div>}
		</div>
	);
}

export const CheckboxElement: ElementRegistration<CheckboxFieldConfig, CheckboxFieldProps> = {
	componentId: 'checkbox',
	render: FormCheckbox,
	schema: CheckboxFieldConfigSchema,
	metadata: {
		name: 'Checkbox Field',
		description: 'Single checkbox input for boolean values',
		category: 'input',
	},
};
