import { Textarea } from '@/components/ui/textarea';
import { FieldGroup } from '@/components/schema-engine/forms/field-group';
import { useControlledFormElement, combineHandlers } from '@schema-engine/forms-react/hooks';
import type { TextareaFieldProps } from './form-textarea.types';

export function FormTextarea({
	onChange: propsOnChange,
	onBlur: propsOnBlur,
	onFocus: propsOnFocus,
	...config
}: TextareaFieldProps) {
	const { value, error, onChange, onBlur, fieldProps, isRequired, containerStyles } =
		useControlledFormElement(config);

	return (
		<FieldGroup
			label={config.label || config.name}
			htmlFor={config.id}
			hiddenLabel={!config.label}
			required={isRequired}
			description={config.description}
			error={error}
			style={containerStyles}
		>
			<Textarea
				{...fieldProps}
				value={(value as string) || ''}
				onChange={(e) => combineHandlers(onChange, propsOnChange)(e.target.value)}
				onBlur={combineHandlers(onBlur, propsOnBlur)}
				onFocus={propsOnFocus}
				placeholder={config.placeholder}
				rows={config.rows}
				cols={config.cols}
				spellCheck={config.spellCheck}
				wrap={config.wrap}
				style={{ resize: config.resize }}
			/>
		</FieldGroup>
	);
}
