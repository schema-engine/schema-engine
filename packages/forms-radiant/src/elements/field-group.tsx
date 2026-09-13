import type { JsxRenderable } from '@ecopages/jsx';
import { RuiField, RuiFieldDescription, RuiFieldError } from '@ecopages/radiant-ui/field';
import { RuiLabel } from '@ecopages/radiant-ui/label';
import type { FieldRules } from '@ecopages/radiant-ui/form';
import type { ValidationRule } from '@schema-engine/forms/schemas';

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
	validationRules?: ReadonlyArray<ValidationRule>;
	defaultValue?: unknown;
	disabled?: boolean;
}

function serializeRules(rules: FieldRules | undefined): string | undefined {
	if (!rules) {
		return undefined;
	}

	return JSON.stringify(rules, (_key, value: unknown) =>
		value instanceof RegExp ? { $type: 'regexp', source: value.source, flags: value.flags } : value,
	);
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
	validationRules,
	defaultValue,
	disabled,
}: FieldGroupProps) {
	return (
		<RuiField
			name={name ?? htmlFor ?? label}
			rules={rules}
			data-se-field-rules={serializeRules(rules)}
			data-se-validation-rules={validationRules ? JSON.stringify(validationRules) : undefined}
			// String channel only: the Object-typed `defaultValue` prop rejects
			// serialized scalars (e.g. `"en"`) during client attribute adoption.
			defaultValueData={defaultValue !== undefined ? JSON.stringify(defaultValue) : undefined}
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
