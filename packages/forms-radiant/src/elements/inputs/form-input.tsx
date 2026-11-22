import { RuiInput } from '@ecopages/radiant-ui/input';
import { isFieldRequired } from '@schema-engine/forms/schemas';
import { isRenderedRequired } from '@/lib/field-rules';
import { FieldGroup } from '../field-group';
import type { InputFieldProps } from './form-input.types';

export function FormInput(config: InputFieldProps) {
	const { inputType, placeholder } = config;

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
			<RuiInput
				id={config.id}
				name={config.name}
				type={inputType}
				value={typeof config.defaultValue === 'string' ? config.defaultValue : undefined}
				placeholder={placeholder}
				autocomplete={config.autoComplete}
				autofocus={config.autoFocus}
				inputMode={config.inputMode}
				spellcheck={config.spellCheck}
				disabled={config.disabled}
			/>
		</FieldGroup>
	);
}
