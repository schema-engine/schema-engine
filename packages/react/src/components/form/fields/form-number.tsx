import { Label } from '@/shadcn/ui/label';
import { Input } from '@/shadcn/ui/input';
import { useControlledFormElement, combineHandlers } from '@/hooks';
import type { NumberFieldConfig, NumberFieldProps } from './form-number.types';
import { NumberFieldConfigSchema } from './form-number.types';
import type { ElementRegistration } from '@json-form-engine/core/types';

export function FormNumber({
	onChange: propsOnChange,
	onBlur: propsOnBlur,
	onFocus: propsOnFocus,
	...config
}: NumberFieldProps) {
	const { fieldState, field, fieldProps, labelProps, errorProps, containerStyles } = useControlledFormElement(config);

	return (
		<div className="space-y-2" style={containerStyles}>
			{config.label && <Label {...labelProps}>{config.label}</Label>}
			{config.description && <p className="text-sm text-muted-foreground">{config.description}</p>}
			<Input
				{...fieldProps}
				type="number"
				value={field.value || ''}
				onChange={(e) => {
					const value = e.target.value ? Number(e.target.value) : '';
					combineHandlers(field.onChange, propsOnChange)(value);
				}}
				onBlur={combineHandlers(field.onBlur, propsOnBlur)}
				onFocus={propsOnFocus}
				placeholder={config.placeholder}
				min={config.min}
				max={config.max}
				step={config.step}
				autoComplete={config.autoComplete}
				autoFocus={config.autoFocus}
				inputMode={config.inputMode}
			/>
			{errorProps && <div {...errorProps}>{fieldState.error?.message}</div>}
		</div>
	);
}

export const NumberElement: ElementRegistration<NumberFieldConfig, NumberFieldProps> = {
	componentId: 'number',
	render: FormNumber,
	schema: NumberFieldConfigSchema,
	metadata: {
		name: 'Number Field',
		description: 'Numeric input field with min, max, and step controls',
		category: 'input',
	},
};
