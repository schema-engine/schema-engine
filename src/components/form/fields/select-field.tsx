import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { FieldGroup } from '../../field-group';
import { useControlledFormElement, combineHandlers } from '../../../lib/form-engine/hooks/use-field';
import type { SelectFieldConfig } from '../../../lib/form-engine/types/form';

interface SelectFieldProps {
	config: SelectFieldConfig;
	onChange?: (value: string) => void;
}

/**
 * Select field component
 */
export function SelectField({ config, onChange: propsOnChange }: SelectFieldProps) {
	const { value, error, onChange, fieldProps, isRequired, containerStyles } = useControlledFormElement(config);

	return (
		<div style={containerStyles}>
			<FieldGroup
				label={config.label || config.name}
				htmlFor={config.id}
				hiddenLabel={!config.label}
				required={isRequired}
				error={error}
			>
				{config.description && <p className="text-sm text-muted-foreground mb-2">{config.description}</p>}
				<Select
					value={value || ''}
					onValueChange={combineHandlers(onChange, propsOnChange)}
					disabled={config.disabled}
					required={fieldProps.required}
				>
					<SelectTrigger
						className={config.className}
						style={config.style}
						id={fieldProps.id}
						name={fieldProps.name}
						aria-invalid={fieldProps['aria-invalid']}
						aria-describedby={fieldProps['aria-describedby']}
					>
						<SelectValue placeholder={config.placeholder} />
					</SelectTrigger>
					<SelectContent>
						{config.options.map((option) => (
							<SelectItem key={option.value} value={String(option.value)} disabled={option.disabled}>
								{option.label}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</FieldGroup>
		</div>
	);
}
