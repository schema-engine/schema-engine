import { customElement } from '@ecopages/radiant';
import { RuiFieldElement, type RuiFieldProps } from '@ecopages/radiant-ui/field';
import { jsx, type JsxCustomElementAttributes } from '@ecopages/jsx';
import { FormController, formController } from '@/adapters/radiant/controller';
import { readHydratedRules } from '@/components/internals/field-rule-hydrator';
import type { ValidationRule, ElementGridConfig } from '@schema-engine/forms/schemas';
import { mergeFieldGridHost } from '@/hooks/grid-styles';

/** RuiField's registration and presentation, with scoped programmatic form access. */
@customElement('se-field')
export class FormFieldElement extends RuiFieldElement {
	@formController form!: FormController;

	protected override onConnected(): void {
		const rules = readHydratedRules(this);
		if (rules) {
			this.rules = rules;
		}
		super.onConnected();
	}

	get field() {
		return this.form.field(this.name);
	}
}

export function FormField({
	children,
	rules,
	validationRules,
	defaultValue,
	defaultValueData,
	class: className,
	grid,
	style,
	...props
}: JsxCustomElementAttributes<FormFieldElement, RuiFieldProps> & {
	validationRules?: ReadonlyArray<ValidationRule>;
	grid?: ElementGridConfig;
	style?: Record<string, string | number | undefined>;
}) {
	const fieldHost = mergeFieldGridHost(grid, style);

	return jsx('se-field', {
		...props,
		classes: ['se-form-field', className],
		'data-se-grid-theme': fieldHost.themeId,
		style: fieldHost.style,
		'prop:rules': rules,
		'data-se-validation-rules': validationRules ? JSON.stringify(validationRules) : undefined,
		'prop:defaultValue': defaultValue,
		'data-default-value':
			defaultValueData ?? (defaultValue !== undefined ? JSON.stringify(defaultValue) : undefined),
		children: (
			<div class="rui-field" data-ref="field">
				{children}
			</div>
		),
	});
}
