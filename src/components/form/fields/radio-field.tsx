import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { FieldGroup } from '../../field-group';
import { useControlledFormElement, combineHandlers } from '../../../lib/form-engine/hooks/use-field';
import type { RadioFieldConfig } from '@/lib/form-engine/types/form';

interface RadioFieldProps {
	config: RadioFieldConfig;
	onChange?: (value: string) => void;
}

/**
 * Radio field component
 */
export function RadioField({ config, onChange: propsOnChange }: RadioFieldProps) {
	const { value, error, onChange, fieldProps, isRequired, containerStyles } = useControlledFormElement(config);
	const orientation = config.orientation || 'vertical';

	return (
		<div style={containerStyles}>
			<FieldGroup
				label={config.label || config.name}
				hiddenLabel={!config.label}
				required={isRequired}
				error={error}
			>
				{config.description && <p className="text-sm text-muted-foreground mb-2">{config.description}</p>}
				<fieldset>
					<RadioGroup
						value={value || ''}
						onValueChange={combineHandlers(onChange, propsOnChange)}
						className={orientation === 'horizontal' ? 'flex flex-row space-x-4 space-y-0' : ''}
						disabled={fieldProps.disabled}
						required={fieldProps.required}
						aria-invalid={fieldProps['aria-invalid']}
						aria-describedby={fieldProps['aria-describedby']}
					>
						{config.options.map((option) => (
							<div key={option.value} className="flex items-center space-x-2">
								<RadioGroupItem
									value={String(option.value)}
									id={`${config.id}-${option.value}`}
									disabled={option.disabled}
								/>
								<Label htmlFor={`${config.id}-${option.value}`}>{option.label}</Label>
							</div>
						))}
					</RadioGroup>
				</fieldset>
			</FieldGroup>
		</div>
	);
}
