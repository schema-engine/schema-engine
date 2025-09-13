import { Textarea } from '@/components/ui/textarea';
import { FieldGroup } from '@/lib/form-engine/components/form/field-group';
import { useControlledFormElement, combineHandlers } from '@/lib/form-engine/hooks';
import type { TextareaFieldProps } from './form-textarea.types';

/**
 * Enhanced Textarea field component for the form engine.
 * Integrates with React Hook Form and provides validation, state management, etc.
 */
export function FormTextarea({ config, onChange: propsOnChange, onBlur: propsOnBlur }: TextareaFieldProps) {
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
					{...config}
					value={value || ''}
					onChange={(e) => combineHandlers(onChange, propsOnChange)(e.target.value)}
					onBlur={combineHandlers(onBlur, propsOnBlur)}
				/>
			</FieldGroup>
		</div>
	);
}
