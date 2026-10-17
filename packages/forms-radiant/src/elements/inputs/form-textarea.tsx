import { RuiTextarea } from '@ecopages/radiant-ui/textarea';
import { isFieldRequired } from '@schema-engine/forms/schemas';
import { FieldGroup } from '../field-group';
import type { TextareaFieldProps } from './form-textarea.types';

export function FormTextarea({
	onChange: propsOnChange,
	onBlur: propsOnBlur,
	onFocus: propsOnFocus,
	...config
}: TextareaFieldProps) {
	return (
		<FieldGroup
			name={config.name}
			label={config.label || config.name}
			htmlFor={config.id}
			hiddenLabel={!config.label}
			required={isFieldRequired(config.rules)}
			description={config.description}
			grid={config.grid}
			style={config.style}
			validation={config}
			defaultValue={config.defaultValue}
			disabled={config.disabled}
		>
			<RuiTextarea
				id={config.id}
				name={config.name}
				placeholder={config.placeholder}
				rows={config.rows}
				style={{ fontFamily: 'inherit' }}
				disabled={config.disabled}
				on:input={(event: Event) => {
					const target = event.target as HTMLTextAreaElement;
					propsOnChange?.(target.value);
				}}
				on:blur={propsOnBlur}
				on:focus={propsOnFocus}
			/>
		</FieldGroup>
	);
}
