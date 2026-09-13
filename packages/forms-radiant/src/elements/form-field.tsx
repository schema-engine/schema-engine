import { customElement } from '@ecopages/radiant';
import { RuiFieldElement, type RuiFieldProps } from '@ecopages/radiant-ui/field';
import { jsx, type JsxCustomElementAttributes } from '@ecopages/jsx';
import { FormController, formController } from '@/adapters/radiant/controller';
import { readHydratedRules } from '@/components/internals/field-rule-hydrator';

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
	defaultValue,
	defaultValueData,
	...props
}: JsxCustomElementAttributes<FormFieldElement, RuiFieldProps>) {
	return jsx('se-field', {
		...props,
		'prop:rules': rules,
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
