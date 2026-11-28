import { RuiTextarea } from '@ecopages/radiant-ui/textarea';
import { isFieldRequired } from '@schema-engine/forms';
import { isRenderedRequired } from '@/lib/field-rules.js';
import { FieldGroup } from '../field-group.js';
import type { TextareaFieldProps } from './form-textarea.types.js';

export function FormTextarea(config: TextareaFieldProps) {
	return (
		<FieldGroup
			name={config.name}
			label={config.label || config.name}
			htmlFor={config.id}
			hiddenLabel={!config.label}
			required={isFieldRequired(config.rules) || isRenderedRequired(config)}
			authoredRequired={isFieldRequired(config.rules)}
			description={config.description}
			grid={config.grid}
			appearance={config.appearance}
			class={config.className}
			style={config.style}
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
