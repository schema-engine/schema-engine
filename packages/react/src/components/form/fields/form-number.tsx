import { Label } from '@/shadcn/ui/label';
import { Input } from '@/shadcn/ui/input';
import { useControlledFormElement } from '@/hooks';
import type { NumberFieldConfig } from './form-number.types';

interface FormNumberProps {
	config: NumberFieldConfig;
}

export function FormNumber({ config }: FormNumberProps) {
	const { fieldState, field, fieldProps, labelProps, errorProps, containerStyles } = useControlledFormElement(config);

	return (
		<div className="space-y-2" style={containerStyles}>
			{config.label && <Label {...labelProps}>{config.label}</Label>}
			{config.description && <p className="text-sm text-muted-foreground">{config.description}</p>}
			<Input
				{...fieldProps}
				type="number"
				value={field.value || ''}
				onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : '')}
				onBlur={field.onBlur}
				placeholder={config.placeholder}
				{...(config.min !== undefined && { min: config.min })}
				{...(config.max !== undefined && { max: config.max })}
				{...(config.step !== undefined && { step: config.step })}
				{...(config.autoComplete && { autoComplete: config.autoComplete })}
				{...(config.autoFocus && { autoFocus: config.autoFocus })}
				{...(config.inputMode && { inputMode: config.inputMode })}
			/>
			{errorProps && <div {...errorProps}>{fieldState.error?.message}</div>}
		</div>
	);
}
