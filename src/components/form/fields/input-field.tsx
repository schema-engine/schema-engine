import { Input } from '@/components/ui/input';
import { FieldGroup } from '@/components/field-group';
import { useControlledFormElement, combineHandlers } from '@/lib/form-engine/hooks';
import type { InputFieldConfig } from '@/lib/form-engine/types/form';

interface InputFieldProps {
	config: InputFieldConfig;
	onChange?: (value: string) => void;
	onBlur?: () => void;
}

/**
 * Input field component for text, email, password, etc.
 */
export function InputField({ config, onChange: propsOnChange, onBlur: propsOnBlur }: InputFieldProps) {
	const { value, error, onChange, onBlur, fieldProps, isRequired, containerStyles } =
		useControlledFormElement(config);

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
				<Input
					{...fieldProps}
					type={config.inputType}
					value={value || ''}
					onChange={(e) => combineHandlers(onChange, propsOnChange)(e.target.value)}
					onBlur={combineHandlers(onBlur, propsOnBlur)}
					placeholder={config.placeholder}
					maxLength={config.maxLength}
					minLength={config.minLength}
					pattern={config.pattern}
					autoComplete={config.autoComplete}
					autoFocus={config.autoFocus}
					className={config.className}
					style={config.style}
				/>
			</FieldGroup>
		</div>
	);
}
