import { Label } from '@/shadcn/ui/label';
import { RadioGroup, RadioGroupItem } from '@/shadcn/ui/radio-group';
import { useControlledFormElement, combineHandlers } from '@/hooks';
import type { RadioFieldProps } from './form-radio.types';

export function FormRadio({
	onChange: propsOnChange,
	onBlur: propsOnBlur,
	onFocus: propsOnFocus,
	...config
}: RadioFieldProps) {
	const { fieldState, field, fieldProps, labelProps, errorProps, containerStyles } = useControlledFormElement(config);

	return (
		<div className="space-y-2" style={containerStyles}>
			{config.label && <Label {...labelProps}>{config.label}</Label>}
			{config.description && <p className="text-sm text-muted-foreground">{config.description}</p>}
			<RadioGroup
				{...fieldProps}
				value={field.value || ''}
				onValueChange={(value) => combineHandlers(field.onChange, propsOnChange)(value)}
				onBlur={combineHandlers(field.onBlur, propsOnBlur)}
				onFocus={propsOnFocus}
				className={config.orientation === 'horizontal' ? 'flex space-x-4' : 'space-y-2'}
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
			{errorProps && <div {...errorProps}>{fieldState.error?.message}</div>}
		</div>
	);
}
