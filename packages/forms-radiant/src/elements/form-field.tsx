import { customElement } from '@ecopages/radiant';
import { RuiFieldElement, type RuiFieldProps } from '@ecopages/radiant-ui/field';
import type { FieldRules } from '@ecopages/radiant-ui/form';
import { jsx, type JsxCustomElementAttributes } from '@ecopages/jsx';
import { FormController, formController } from '@/adapters/radiant/controller';
import { readHydratedRules } from '@/components/internals/field-rule-hydrator';
import type { ElementGridConfig } from '@schema-engine/forms/schemas';
import { resolveElementRules, toFieldRules, type FieldRulesSource } from '@/lib/field-rules';
import { mergeFieldGridHost } from '@/hooks/grid-styles';

/** RuiField's registration and presentation, with scoped programmatic form access. */
@customElement('se-field')
export class FormFieldElement extends RuiFieldElement {
	@formController form!: FormController;

	protected override onConnected(): void {
		this.hydrateDefaultValue();
		const rules = readHydratedRules(this);
		if (rules) {
			this.rules = rules;
		}
		super.onConnected();
	}

	/**
	 * @remarks
	 * RuiField prefers its object prop over the JSON attribute. Radiant exposes an
	 * absent object prop as `null` during hydration, so decode the attribute first
	 * to prevent null from erasing a server-rendered field default.
	 */
	private hydrateDefaultValue(): void {
		if (this.defaultValue !== null) return;

		const raw = this.defaultValueData ?? this.getAttribute('data-default-value');
		if (!raw) {
			this.defaultValue = undefined;
			return;
		}

		try {
			this.defaultValue = JSON.parse(raw) as unknown;
		} catch {
			this.defaultValue = undefined;
		}
	}

	get field() {
		return this.form.field(this.name);
	}
}

/** Runs a hand-written `validate` after the validator derived from the engine rules; the first failure wins. */
function withCustomValidate(rules: FieldRules | undefined, validate: FieldRules['validate']): FieldRules | undefined {
	if (!validate) return rules;
	const derived =
		typeof rules?.validate === 'function' ? { '@schema-engine/rules': rules.validate } : rules?.validate;
	const custom = typeof validate === 'function' ? { custom: validate } : validate;
	return { ...rules, validate: { ...derived, ...custom } };
}

/**
 * @remarks
 * `validation` takes the element's `rules`, `$type` and `name`. The live rules
 * and `data-se-validation-rules` come from one merged list. The hydrator
 * rebuilds rules from the attribute alone and has no `$type` to look up
 * `defaultFor` rules again, so the serialized list must already include them.
 *
 * `validate` adds a client-side check to those rules. A function cannot be
 * serialized, so a server-rendered field has it only once it renders on the client.
 */
export function FormField({
	children,
	validation,
	validate,
	defaultValue,
	defaultValueData,
	class: className,
	grid,
	style,
	...props
}: Omit<JsxCustomElementAttributes<FormFieldElement, RuiFieldProps>, 'rules'> & {
	validation?: FieldRulesSource;
	validate?: FieldRules['validate'];
	grid?: ElementGridConfig;
	style?: Record<string, string | number | undefined>;
}) {
	const fieldHost = mergeFieldGridHost(grid, style);
	const validationRules = validation ? resolveElementRules(validation) : undefined;

	return jsx('se-field', {
		...props,
		classes: ['se-form-field', className],
		'data-se-grid-theme': fieldHost.themeId,
		style: fieldHost.style,
		'prop:rules': withCustomValidate(toFieldRules({ rules: validationRules, name: validation?.name }), validate),
		'data-se-validation-rules': validationRules ? JSON.stringify(validationRules) : undefined,
		'prop:defaultValue': defaultValue,
		data: {
			defaultValue: defaultValueData ?? (defaultValue !== undefined ? JSON.stringify(defaultValue) : undefined),
		},
		children: (
			<div class="rui-field" data-ref="field">
				{children}
			</div>
		),
	});
}
