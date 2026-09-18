/** @jsxImportSource react */
import { Switch } from '@/components/ui/switch';
import {
	FieldGroupRoot,
	FieldLabel,
	FieldInputContainer,
	FieldContent,
	FieldHint,
} from '@/components/ui/schema-engine/components/field';
import { useControlledFormElement, combineHandlers } from '@schema-engine/forms-react/hooks';
import type { SwitchFieldProps } from './form-switch.types';

export function FormSwitch({
	onChange: propsOnChange,
	onBlur: propsOnBlur,
	onFocus: propsOnFocus,
	...config
}: SwitchFieldProps) {
	const { value, error, onChange, onBlur, fieldProps, containerStyles, gridThemeId } =
		useControlledFormElement(config);

	return (
		<FieldGroupRoot gridThemeId={gridThemeId} style={containerStyles}>
			<FieldContent>
				<FieldInputContainer>
					<Switch
						{...fieldProps}
						id={config.id}
						checked={Boolean(value)}
						onCheckedChange={combineHandlers(onChange, propsOnChange)}
						onBlur={combineHandlers(onBlur, propsOnBlur)}
						onFocus={propsOnFocus}
						autoFocus={config.autoFocus}
					/>
					{config.label && (
						<FieldLabel htmlFor={config.id} error={error}>
							{config.label}
						</FieldLabel>
					)}
				</FieldInputContainer>
				<FieldHint error={error} description={config.description} display="alternate" />
			</FieldContent>
		</FieldGroupRoot>
	);
}
