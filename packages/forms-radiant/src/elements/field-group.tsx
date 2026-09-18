import { FormField } from '@/elements/form-field';
import type { JsxRenderable } from '@ecopages/jsx';
import { RuiFieldDescription, RuiFieldError } from '@ecopages/radiant-ui/field';
import { RuiLabel } from '@ecopages/radiant-ui/label';
import type { FieldRules } from '@ecopages/radiant-ui/form';
import type { ElementGridConfig, ValidationRule } from '@schema-engine/forms/schemas';

export interface FieldGroupProps {
	label: string;
	htmlFor?: string;
	hiddenLabel?: boolean;
	required?: boolean;
	description?: string;
	className?: string;
	children: JsxRenderable;
	style?: Record<string, string | number | undefined>;
	grid?: ElementGridConfig;
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

/**
 * @remarks
 * Defaults use the JSON string channel because Radiant UI's Object-typed
 * defaultValue prop rejects serialized scalars during attribute adoption.
 */
export function FieldGroup({
	label,
	htmlFor,
	hiddenLabel = false,
	required = false,
	description,
	className,
	children,
	style,
	grid,
	name,
	rules,
	validationRules,
	defaultValue,
	disabled,
}: FieldGroupProps) {
	return (
		<FormField
			name={name ?? htmlFor ?? label}
			rules={rules}
			data-se-field-rules={serializeRules(rules)}
			data-se-validation-rules={validationRules ? JSON.stringify(validationRules) : undefined}
			defaultValueData={defaultValue !== undefined ? JSON.stringify(defaultValue) : undefined}
			disabled={disabled}
			classes={['se-form-field', className]}
			grid={grid}
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
		</FormField>
	);
}
