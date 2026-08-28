import type { JsxRenderable } from '@ecopages/jsx';
import '@ecopages/radiant-ui/field/styles.css';
import '@ecopages/radiant-ui/label/styles.css';
import { RuiField, RuiFieldDescription, RuiFieldError } from '@ecopages/radiant-ui/field';
import { RuiLabel } from '@ecopages/radiant-ui/label';
import type { FieldRules } from '@ecopages/radiant-ui/form';

export interface FieldGroupProps {
	label: string;
	htmlFor?: string;
	hiddenLabel?: boolean;
	required?: boolean;
	description?: string;
	className?: string;
	children: JsxRenderable;
	style?: Record<string, string | number | undefined>;
	name?: string;
	rules?: FieldRules;
	defaultValue?: unknown;
	disabled?: boolean;
}

export function FieldGroup({
	label,
	htmlFor,
	hiddenLabel = false,
	required = false,
	description,
	className,
	children,
	style,
	name,
	rules,
	defaultValue,
	disabled,
}: FieldGroupProps) {
	return (
		<RuiField
			name={name ?? htmlFor ?? label}
			rules={rules}
			defaultValue={defaultValue}
			disabled={disabled}
			class={className}
			style={style}
		>
			{!hiddenLabel ? (
				<RuiLabel htmlFor={htmlFor}>
					{label}
					{required ? ' *' : ''}
				</RuiLabel>
			) : null}
			{children}
			{description ? <RuiFieldDescription>{description}</RuiFieldDescription> : null}
			<RuiFieldError />
		</RuiField>
	);
}
