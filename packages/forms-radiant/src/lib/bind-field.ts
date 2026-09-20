import { isFieldRequired, type BaseField, type ElementGridConfig } from '@schema-engine/forms/schemas';
import { mergeControlProps } from '@schema-engine/forms/schemas/html-attributes';
import { getValidationRulesForElement } from '@schema-engine/forms/schemas/validation/utils';
import type { FieldRules } from '@ecopages/radiant-ui/form';
import { peekOwningFormEngine } from '@/contexts/form-engine-owner';
import type { FieldGroupProps } from '@/elements/field-group';
import { serializeFieldRules, toFieldRules } from '@/lib/field-rules';

export type BindFieldConfig = Pick<
	BaseField,
	| 'name'
	| 'id'
	| 'label'
	| 'description'
	| 'disabled'
	| 'defaultValue'
	| 'className'
	| 'style'
	| 'grid'
	| 'htmlAttributes'
	| 'rules'
	| '$type'
>;

export type FieldGroupChromeProps = Omit<FieldGroupProps, 'children'>;

export interface BindFieldHostProps {
	name: string;
	rules?: FieldRules;
	'data-se-field-rules'?: string;
	'data-se-validation-rules'?: string;
	defaultValueData?: string;
	disabled?: boolean;
	grid?: ElementGridConfig;
	style?: Record<string, string | number | undefined>;
	class?: string;
}

/**
 * Splits field config into chrome and static control props for Radiant widgets.
 *
 * @remarks
 * Pass static control props only. Wire event handlers on the JSX node after spreading `controlProps`.
 * Spread `fieldGroupProps` on `FieldGroup`, or `hostProps` on `FormField` for custom label layouts.
 */
export function bindField<const TControl extends Record<string, unknown>>(
	config: BindFieldConfig,
	controlOverrides?: TControl,
) {
	if (!config.name) {
		throw new Error(`Field configuration is missing required "name" property. Config: ${JSON.stringify(config)}`);
	}

	const registry = peekOwningFormEngine()?.getValidationRegistry();
	const isRequired = isFieldRequired(config.rules);
	const validationRules = registry ? getValidationRulesForElement(config, registry) : config.rules;
	const rules = toFieldRules(config, registry);

	const fieldGroupProps: FieldGroupChromeProps = {
		name: config.name,
		label: config.label || config.name,
		htmlFor: config.id,
		hiddenLabel: !config.label,
		required: isRequired,
		description: config.description,
		className: config.className,
		style: config.style,
		grid: config.grid,
		rules,
		validationRules,
		defaultValue: config.defaultValue,
		disabled: config.disabled,
	};

	const hostProps: BindFieldHostProps = {
		name: config.name,
		rules,
		'data-se-field-rules': serializeFieldRules(rules),
		'data-se-validation-rules': validationRules ? JSON.stringify(validationRules) : undefined,
		defaultValueData: config.defaultValue !== undefined ? JSON.stringify(config.defaultValue) : undefined,
		disabled: config.disabled,
		grid: config.grid,
		style: config.style,
		class: config.className,
	};

	const controlProps = mergeControlProps(
		{
			id: config.id,
			name: config.name,
			disabled: config.disabled,
			...controlOverrides,
		},
		config.htmlAttributes,
	);

	return {
		isRequired,
		fieldGroupProps,
		hostProps,
		controlProps,
	};
}

export type BindFieldReturn = ReturnType<typeof bindField>;
