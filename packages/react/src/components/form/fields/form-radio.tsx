import { Label } from '@/shadcn/ui/label';
import { RadioGroup, RadioGroupItem } from '@/shadcn/ui/radio-group';
import { useControlledFormElement } from '@/hooks';
import type { RadioFieldConfig } from './form-radio.types';

interface FormRadioProps {
	config: RadioFieldConfig;
}

export function FormRadio({ config }: FormRadioProps) {
	const { fieldState, field, fieldProps, labelProps, errorProps, containerStyles } = useControlledFormElement(config);

	return (
		<div className="space-y-2" style={containerStyles}>
			{config.label && <Label {...labelProps}>{config.label}</Label>}
			{config.description && <p className="text-sm text-muted-foreground">{config.description}</p>}
			<RadioGroup
				{...fieldProps}
				value={field.value || ''}
				onValueChange={field.onChange}
				className={config.orientation === 'horizontal' ? 'flex space-x-4' : 'space-y-2'}
				{...(config.autoFocus && { autoFocus: config.autoFocus })}
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
