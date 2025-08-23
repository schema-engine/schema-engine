import { Checkbox } from '../../ui/checkbox';
import { useControlledFormElement, combineHandlers } from '../../../lib/form-engine/hooks/use-field';
import type { CheckboxFieldConfig } from '../../../lib/form-engine/types/form';

interface CheckboxFieldProps {
	config: CheckboxFieldConfig;
	onChange?: (value: boolean) => void;
}

/**
 * Checkbox field component
 */
export function CheckboxField({ config, onChange: propsOnChange }: CheckboxFieldProps) {
	const { value, error, onChange, fieldProps, labelProps, errorProps, containerStyles } =
		useControlledFormElement(config);

	return (
		<div className="space-y-2" style={containerStyles}>
			{config.description && <p className="text-sm text-muted-foreground">{config.description}</p>}

			<div className="flex items-center space-x-2">
				<Checkbox
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
