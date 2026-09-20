import { FormField } from '@/elements/form-field';
import type { JsxRenderable } from '@ecopages/jsx';
import { RuiFieldDescription, RuiFieldError } from '@ecopages/radiant-ui/field';
import { RuiLabel } from '@ecopages/radiant-ui/label';
import type { FieldRules } from '@ecopages/radiant-ui/form';
import type { ElementGridConfig, ValidationRule } from '@schema-engine/forms/schemas';
import { serializeFieldRules } from '@/lib/field-rules';

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

export type FormFieldHostProps = {
	name: string;
	rules?: FieldRules;
	'data-se-field-rules'?: string;
	'data-se-validation-rules'?: string;
	defaultValueData?: string;
	disabled?: boolean;
	grid?: ElementGridConfig;
	style?: Record<string, string | number | undefined>;
	class?: string;
};

/**
 * Maps FieldGroup chrome onto `FormField` hydration attributes.
 *
 * @remarks
 * Custom-chrome widgets (checkbox, switch, radio) call this instead of wrapping `FieldGroup`.
 */
export function toFormFieldHost(chrome: Omit<FieldGroupProps, 'children'>): FormFieldHostProps {
	return {
		name: chrome.name ?? chrome.htmlFor ?? chrome.label,
		rules: chrome.rules,
		'data-se-field-rules': serializeFieldRules(chrome.rules),
		'data-se-validation-rules': chrome.validationRules ? JSON.stringify(chrome.validationRules) : undefined,
		defaultValueData: chrome.defaultValue !== undefined ? JSON.stringify(chrome.defaultValue) : undefined,
		disabled: chrome.disabled,
		grid: chrome.grid,
		style: chrome.style,
		class: chrome.className,
	};
}

/**
 * @remarks
 * Defaults use the JSON string channel because Radiant UI's Object-typed
 * defaultValue prop rejects serialized scalars during attribute adoption.
 */
export function FieldGroup({ children, hiddenLabel = false, required = false, ...chrome }: FieldGroupProps) {
	const { label, htmlFor, description } = chrome;

	return (
		<FormField {...toFormFieldHost({ ...chrome, hiddenLabel, required })}>
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
