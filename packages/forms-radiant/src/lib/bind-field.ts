import { isFieldRequired, type BaseField } from '@schema-engine/forms/schemas';
import { mergeControlProps } from '@schema-engine/forms/schemas/html-attributes';
import { getValidationRulesForElement } from '@schema-engine/forms/schemas/validation/utils';
import { peekOwningFormEngine } from '@/contexts/form-engine-owner';
import { toFormFieldHost, type FieldGroupProps, type FormFieldHostProps } from '@/elements/field-group';
import { toFieldRules } from '@/lib/field-rules';

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
		rules: toFieldRules(config, registry),
		validationRules,
		defaultValue: config.defaultValue,
		disabled: config.disabled,
	};

	const hostProps: FormFieldHostProps = toFormFieldHost(fieldGroupProps);

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
