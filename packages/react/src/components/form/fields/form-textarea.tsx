import { Textarea } from '@/components/ui/textarea';
import { FieldGroup } from '@/components/form/field-group';
import { useControlledFormElement, combineHandlers } from '@/hooks';
import type { TextareaFieldProps } from './form-textarea.types';

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
