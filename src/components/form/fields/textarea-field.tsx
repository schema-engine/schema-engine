import { Textarea } from '@/components/ui/textarea';
import { FieldGroup } from '@/components/field-group';
import { useControlledFormElement, combineHandlers } from '@/lib/form-engine/hooks';
import type { TextareaFieldConfig } from '@/lib/form-engine/types/form';

interface TextareaFieldProps {
	config: TextareaFieldConfig;
	onChange?: (value: string) => void;
	onBlur?: () => void;
}

/**
 * Textarea field component
 */
export function TextareaField({ config, onChange: propsOnChange, onBlur: propsOnBlur }: TextareaFieldProps) {
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
				<Textarea
					{...fieldProps}
					value={value || ''}
					onChange={(e) => combineHandlers(onChange, propsOnChange)(e.target.value)}
					onBlur={combineHandlers(onBlur, propsOnBlur)}
					placeholder={config.placeholder}
					rows={config.rows}
					maxLength={config.maxLength}
					minLength={config.minLength}
					className={`${config.className || ''} resize-${config.resize || 'both'}`}
					style={config.style}
				/>
			</FieldGroup>
		</div>
	);
}
