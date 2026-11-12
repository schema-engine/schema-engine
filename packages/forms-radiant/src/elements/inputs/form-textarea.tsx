import { RuiTextarea } from '@ecopages/radiant-ui/textarea';
import { isFieldRequired } from '@schema-engine/forms/schemas';
import { isRenderedRequired } from '@/lib/field-rules';
import { FieldGroup } from '../field-group';
import type { TextareaFieldProps } from './form-textarea.types';

export function FormTextarea(config: TextareaFieldProps) {
	return (
		<FieldGroup
			name={config.name}
			label={config.label || config.name}
			htmlFor={config.id}
			hiddenLabel={!config.label}
			required={isFieldRequired(config.rules) || isRenderedRequired(config)}
			description={config.description}
			grid={config.grid}
			appearance={config.appearance}
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
				cols={config.cols}
				wrap={config.wrap}
				spellcheck={config.spellCheck}
				style={{ fontFamily: 'inherit', resize: config.resize }}
				disabled={config.disabled}
			/>
		</FieldGroup>
	);
}
