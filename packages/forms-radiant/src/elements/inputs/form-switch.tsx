import { RuiSwitch } from '@ecopages/radiant-ui/switch';
import { isFieldRequired } from '@schema-engine/forms';
import { isRenderedRequired } from '../../lib/field-rules.js';
import { FieldGroup } from '../field-group.js';
import type { SwitchFieldProps } from './form-switch.types.js';

export function FormSwitch(config: SwitchFieldProps) {
	return (
		<FieldGroup
			name={config.name}
			label={config.label || config.name}
			htmlFor={config.id}
			hiddenLabel={!config.label}
			labelAfter
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
			<RuiSwitch id={config.id} name={config.name} disabled={config.disabled} />
		</FieldGroup>
	);
}
