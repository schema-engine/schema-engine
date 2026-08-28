import { Switch } from '@/components/ui/switch';
import {
	FieldGroupRoot,
	FieldLabel,
	FieldInputContainer,
	FieldContent,
	FieldHint,
} from '@/components/ui/schema-engine/components/field';
import { useControlledFormElement, combineHandlers } from '@schema-engine/forms-react/hooks';
import type { SwitchFieldProps } from '@/components/schema-engine/forms/inputs/form-switch.types';

export function FormSwitch({
	onChange: propsOnChange,
	onBlur: propsOnBlur,
	onFocus: propsOnFocus,
	...config
}: SwitchFieldProps) {
	const { value, error, onChange, onBlur, fieldProps, containerStyles } = useControlledFormElement(config);

	return (
		<FieldGroupRoot style={containerStyles}>
			<FieldContent>
				<FieldInputContainer>
					<Switch
						{...fieldProps}
						id={config.id}
						isSelected={Boolean(value)}
						onChange={combineHandlers(onChange, propsOnChange)}
						onBlur={combineHandlers(onBlur, propsOnBlur)}
						onFocus={propsOnFocus}
						autoFocus={config.autoFocus}
					/>
					{config.label ? (
						<FieldLabel htmlFor={config.id} error={error}>
							{config.label}
						</FieldLabel>
					) : null}
				</FieldInputContainer>
				<FieldHint error={error} description={config.description} display="alternate" />
			</FieldContent>
		</FieldGroupRoot>
	);
}
