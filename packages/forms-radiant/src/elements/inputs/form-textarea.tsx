import { RuiTextarea } from '@ecopages/radiant-ui/textarea';
import { FieldGroup } from '../field-group';
import { bindField } from '@/lib/bind-field';
import type { TextareaFieldProps } from './form-textarea.types';

export function FormTextarea({
	onChange: propsOnChange,
	onBlur: propsOnBlur,
	onFocus: propsOnFocus,
	...config
}: TextareaFieldProps) {
	const { fieldGroupProps, controlProps } = bindField(config, {
		placeholder: config.placeholder,
		rows: config.rows,
		style: { fontFamily: 'inherit' },
	});

	return (
		<FieldGroup {...fieldGroupProps}>
			<RuiTextarea
				{...controlProps}
				on:input={(event: Event) => {
					const target = event.target as HTMLTextAreaElement;
					propsOnChange?.(target.value);
				}}
				on:blur={propsOnBlur}
				on:focus={propsOnFocus}
			/>
		</FieldGroup>
	);
}
