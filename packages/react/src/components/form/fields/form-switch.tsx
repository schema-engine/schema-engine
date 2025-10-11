import { Label } from '@/shadcn/ui/label';
import { Switch } from '@/shadcn/ui/switch';
import { useControlledFormElement, combineHandlers } from '@/hooks';
import type { SwitchFieldConfig, SwitchFieldProps } from './form-switch.types';
import { SwitchFieldConfigSchema } from './form-switch.types';
import type { ElementRegistration } from '@json-form-engine/core/types';

export function FormSwitch({
	onChange: propsOnChange,
	onBlur: propsOnBlur,
	onFocus: propsOnFocus,
	...config
}: SwitchFieldProps) {
	const { fieldState, field, fieldProps, labelProps, errorProps, containerStyles } = useControlledFormElement(config);

	return (
		<div className="space-y-2" style={containerStyles}>
			{config.description && <p className="text-sm text-muted-foreground">{config.description}</p>}
			<div className="flex items-center space-x-2">
				<Switch
					{...fieldProps}
					checked={Boolean(field.value)}
					onCheckedChange={(checked) => combineHandlers(field.onChange, propsOnChange)(checked)}
					onBlur={combineHandlers(field.onBlur, propsOnBlur)}
					onFocus={propsOnFocus}
					autoFocus={config.autoFocus}
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

export const SwitchElement: ElementRegistration<SwitchFieldConfig, SwitchFieldProps> = {
	componentId: 'switch',
	render: FormSwitch,
	schema: SwitchFieldConfigSchema,
	metadata: {
		name: 'Switch Field',
		description: 'Toggle switch for boolean values',
		category: 'input',
	},
};
