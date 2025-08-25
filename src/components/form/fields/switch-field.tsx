import { Switch } from '../../ui/switch';
import { useControlledFormElement, combineHandlers } from '../../../lib/form-engine/hooks/use-field';
import type { SwitchFieldConfig } from '../../../lib/form-engine/types/form';

interface SwitchFieldProps {
	config: SwitchFieldConfig;
	onChange?: (value: boolean) => void;
}

/**
 * Switch field component
 */
export function SwitchField({ config, onChange: propsOnChange }: SwitchFieldProps) {
	const { value, error, onChange, fieldProps, labelProps, errorProps, containerStyles } =
		useControlledFormElement(config);

	return (
		<div className="space-y-2" style={containerStyles}>
			{config.description && <p className="text-sm text-muted-foreground">{config.description}</p>}

			<div className="flex items-center space-x-2">
				<Switch
					{...fieldProps}
					checked={value || false}
					onCheckedChange={combineHandlers(onChange, propsOnChange)}
					className={config.className}
					style={config.style}
				/>
				{config.label && (
					<label htmlFor={config.id} className={labelProps.className}>
						{config.label}
					</label>
				)}
			</div>

			{errorProps && <p {...errorProps}>{error}</p>}
		</div>
	);
}
