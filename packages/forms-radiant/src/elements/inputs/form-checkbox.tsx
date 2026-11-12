import '@ecopages/radiant-ui/checkbox-group';
import { RuiCheckbox } from '@ecopages/radiant-ui/checkbox';
import { isFieldRequired } from '@schema-engine/forms/schemas';
import { isRenderedRequired } from '@/lib/field-rules';
import { FieldGroup, RequiredMarker } from '../field-group';
import type { CheckboxFieldProps } from './form-checkbox.types';

export function FormCheckbox(config: CheckboxFieldProps) {
	return (
		<FieldGroup
			name={config.name}
			description={config.description}
			grid={config.grid}
			appearance={config.appearance}
			style={config.style}
			validation={config}
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
