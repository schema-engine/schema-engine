import { FormField } from '@/elements/form-field';
import type { JsxRenderable } from '@ecopages/jsx';
import { RuiFieldDescription, RuiFieldError } from '@ecopages/radiant-ui/field';
import { RuiLabel } from '@ecopages/radiant-ui/label';
import type { ElementGridConfig } from '@schema-engine/forms/schemas';
import type { FieldRulesSource } from '@/lib/field-rules';

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
	validation?: FieldRulesSource;
	defaultValue?: unknown;
	disabled?: boolean;
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
	validation,
	defaultValue,
	disabled,
}: FieldGroupProps) {
	return (
		<FormField
			name={name ?? htmlFor ?? label}
			validation={validation}
			defaultValueData={defaultValue !== undefined ? JSON.stringify(defaultValue) : undefined}
			disabled={disabled}
			classes={['se-form-field', className]}
			grid={grid}
			style={style}
		>
			{!hiddenLabel ? (
				<RuiLabel htmlFor={htmlFor}>
					{label}
					<span data-se-required-marker hidden={!required}>
						{' *'}
					</span>
				</RuiLabel>
			) : null}
			{children}
			{description ? <RuiFieldDescription>{description}</RuiFieldDescription> : null}
			<RuiFieldError />
		</FormField>
	);
}
