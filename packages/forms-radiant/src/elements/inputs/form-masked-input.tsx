import '@ecopages/radiant-ui/input/styles.css';
import { RuiInput } from '@ecopages/radiant-ui/input';
import { isFieldRequired } from '@schema-engine/forms/schemas';
import { FieldGroup } from '../field-group';
import { getFieldGridStyles } from '@/hooks/grid-styles';
import { toFieldRules } from '@/lib/field-rules';
import type { MaskedInputFieldProps } from '@/registry/forms/inputs/form-masked-input.types';

export function FormMaskedInput({
	onChange: propsOnChange,
	onBlur: propsOnBlur,
	onFocus: propsOnFocus,
	...config
}: MaskedInputFieldProps) {
	return (
		<FieldGroup
			name={config.name}
			label={config.label || config.name}
			htmlFor={config.id}
			hiddenLabel={!config.label}
			required={isFieldRequired(config.rules)}
			description={config.description}
			style={{ ...getFieldGridStyles(config.grid), ...config.style }}
			rules={toFieldRules(config.rules)}
			defaultValue={config.defaultValue}
			disabled={config.disabled}
		>
			<RuiInput
				id={config.id}
				name={config.name}
				mask={config.mask}
				placeholder={config.placeholder}
				disabled={config.disabled}
				on:input={(event: Event) => {
					propsOnChange?.((event.target as HTMLInputElement).value);
				}}
				on:blur={propsOnBlur}
				on:focus={propsOnFocus}
			/>
		</FieldGroup>
	);
}
