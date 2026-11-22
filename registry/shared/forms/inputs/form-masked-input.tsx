import { MaskedInput } from '@/components/ui/schema-engine/components/masked-input';
import { FieldGroup } from '@/components/ui/schema-engine/components/field';
import { useFormField, combineHandlers, fieldText, useFormContext } from '@schema-engine/forms-react/hooks';
import type { MaskedInputFieldProps } from './form-masked-input.types';

export function FormMaskedInput({
	onChange: propsOnChange,
	onBlur: propsOnBlur,
	onFocus: propsOnFocus,
	...config
}: MaskedInputFieldProps) {
	const { formState } = useFormContext();
	const { value, error, onChange, onBlur, fieldProps, required, containerStyles } = useFormField(config);

	return (
		<FieldGroup
			label={config.label || config.name}
			htmlFor={config.id}
			hiddenLabel={!config.label}
			required={required}
			description={config.description}
			error={error}
			style={containerStyles}
		>
			<MaskedInput
				key={`${config.name}-${formState.submitCount}`}
				{...fieldProps}
				mask={config.mask}
				unmask={config.unmask}
				lazy={config.lazy}
				overwrite={config.overwrite}
				placeholderChar={config.placeholderChar}
				definitions={config.definitions}
				placeholder={config.placeholder}
				autoComplete={config.autoComplete}
				autoFocus={config.autoFocus}
				inputMode={config.inputMode}
				defaultMaskValue={fieldText(value)}
				onAccept={combineHandlers(onChange, propsOnChange)}
				onBlur={combineHandlers(onBlur, propsOnBlur)}
				onFocus={propsOnFocus}
			/>
		</FieldGroup>
	);
}
