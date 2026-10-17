import { customElement } from '@ecopages/radiant';
import { RuiFieldElement, type RuiFieldProps } from '@ecopages/radiant-ui/field';
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

/**
 * @remarks
 * `validation` takes the element's `rules`, `$type` and `name`. The live rules
 * and `data-se-validation-rules` come from one merged list. The hydrator
 * rebuilds rules from the attribute alone and has no `$type` to look up
 * `defaultFor` rules again, so the serialized list must already include them.
 */
export function FormField({
	children,
	validation,
	defaultValue,
	defaultValueData,
	class: className,
	grid,
	style,
	...props
}: Omit<JsxCustomElementAttributes<FormFieldElement, RuiFieldProps>, 'rules'> & {
	validation?: FieldRulesSource;
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
		'prop:rules': toFieldRules({ rules: validationRules, name: validation?.name }),
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
