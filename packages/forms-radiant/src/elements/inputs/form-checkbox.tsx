import '@ecopages/radiant-ui/checkbox-group';
import { RuiCheckbox } from '@ecopages/radiant-ui/checkbox';
import { isFieldRequired } from '@schema-engine/forms';
import { isRenderedRequired } from '@/lib/field-rules.js';
import { FieldGroup, RequiredMarker } from '../field-group.js';
import type { CheckboxFieldProps } from './form-checkbox.types.js';

export function FormCheckbox(config: CheckboxFieldProps) {
	return (
		<FieldGroup
			name={config.name}
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
			<RuiCheckbox
				id={config.id}
				name={config.name}
				indeterminate={config.indeterminate}
				disabled={config.disabled}
			>
				<span class={config.label ? undefined : 'se-visually-hidden'}>{config.label || config.name}</span>
				<RequiredMarker required={isFieldRequired(config.rules) || isRenderedRequired(config)} />
			</RuiCheckbox>
		</FieldGroup>
	);
}
