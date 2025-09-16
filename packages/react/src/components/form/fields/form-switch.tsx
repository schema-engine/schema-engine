import { Label } from '@/shadcn/ui/label';
import { Switch } from '@/shadcn/ui/switch';
import { useControlledFormElement } from '@/hooks';
import type { SwitchFieldConfig } from './form-switch.types';

interface FormSwitchProps {
	config: SwitchFieldConfig;
}

export function FormSwitch({ config }: FormSwitchProps) {
	const { fieldState, field, fieldProps, labelProps, errorProps, containerStyles } = useControlledFormElement(config);

	return (
		<div className="space-y-2" style={containerStyles}>
			{config.description && <p className="text-sm text-muted-foreground">{config.description}</p>}
			<div className="flex items-center space-x-2">
				<Switch
					{...fieldProps}
					checked={Boolean(field.value)}
					onCheckedChange={field.onChange}
					{...(config.autoFocus && { autoFocus: config.autoFocus })}
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
