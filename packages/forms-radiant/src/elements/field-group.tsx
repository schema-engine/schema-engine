import { FormField } from '@/elements/form-field';
import type { JsxRenderable } from '@ecopages/jsx';
import { RuiFieldDescription, RuiFieldError } from '@ecopages/radiant-ui/field';
import { RuiLabel } from '@ecopages/radiant-ui/label';
import type { AppearanceSelection } from '@schema-engine/forms/lib/appearance';
import type { ElementGridConfig } from '@schema-engine/forms/schemas';
import type { FieldRulesSource } from '@/lib/field-rules';

export interface FieldGroupProps {
	/** Omit when the control renders its own label, as a checkbox does. */
	label?: string;
	htmlFor?: string;
	/** Hides the label visually; it stays the control's accessible name. */
	hiddenLabel?: boolean;
	/** Places the label after the control, as a switch does. */
	labelAfter?: boolean;
	required?: boolean;
	description?: string;
	class?: string;
	children: JsxRenderable;
	style?: Record<string, string | number | undefined>;
	grid?: ElementGridConfig;
	/** The field's resolved appearance, emitted on the host as `data-se-<axis>` attributes. */
	appearance?: AppearanceSelection;
	name?: string;
	validation?: FieldRulesSource;
	defaultValue?: unknown;
	disabled?: boolean;
}

/**
 * The required marker every field label carries.
 *
 * @remarks
 * `se-field` shows and hides it through `data-se-required-marker`, so every
 * element prints it with this component, hidden until the field is required.
 */
export function RequiredMarker({ required = false }: { required?: boolean }) {
	return (
		<span data-se-required-marker hidden={!required}>
			{' *'}
		</span>
	);
}

/**
 * Label, description and error around one control, inside the field host.
 *
 * @remarks
 * Defaults use the JSON string channel because Radiant UI's Object-typed
 * defaultValue prop rejects serialized scalars during attribute adoption.
 */
export function FieldGroup({
	label,
	htmlFor,
	hiddenLabel = false,
	labelAfter = false,
	required = false,
	description,
	class: className,
	children,
	style,
	appearance,
	grid,
	name,
	validation,
	defaultValue,
	disabled,
}: FieldGroupProps) {
	const labelElement = label ? (
		<RuiLabel htmlFor={htmlFor} class={hiddenLabel ? 'se-visually-hidden' : undefined}>
			{label}
			<RequiredMarker required={required} />
		</RuiLabel>
	) : null;

	return (
		<FormField
			name={name ?? htmlFor ?? label ?? ''}
			validation={validation}
			defaultValueData={defaultValue !== undefined ? JSON.stringify(defaultValue) : undefined}
			disabled={disabled}
			class={className}
			grid={grid}
			style={style}
			appearance={appearance}
		>
			{labelAfter ? null : labelElement}
			{children}
			{labelAfter ? labelElement : null}
			{description ? <RuiFieldDescription>{description}</RuiFieldDescription> : null}
			<RuiFieldError />
		</FormField>
	);
}
