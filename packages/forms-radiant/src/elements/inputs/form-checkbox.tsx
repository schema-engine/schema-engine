import { FormField } from '@/elements/form-field';
import '@ecopages/radiant-ui/checkbox-group';
import { RuiCheckbox } from '@ecopages/radiant-ui/checkbox';
import { RuiFieldDescription, RuiFieldError } from '@ecopages/radiant-ui/field';
import { bindField } from '@/lib/bind-field';
import type { CheckboxFieldProps } from './form-checkbox.types';

export function FormCheckbox({
	onChange: propsOnChange,
	onBlur: propsOnBlur,
	onFocus: propsOnFocus,
	...config
}: CheckboxFieldProps) {
	const { hostProps, controlProps } = bindField(config, {
		indeterminate: config.indeterminate,
	});

	return (
		<FormField {...hostProps}>
			<RuiCheckbox
				{...controlProps}
				on:change={(event: Event) => {
					const detail = (event as CustomEvent<{ checked: boolean }>).detail;
					propsOnChange?.(detail?.checked ?? false);
				}}
				on:blur={propsOnBlur}
				on:focus={propsOnFocus}
			>
				{config.label}
			</RuiCheckbox>
			{config.description ? <RuiFieldDescription>{config.description}</RuiFieldDescription> : null}
			<RuiFieldError />
		</FormField>
	);
}
