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
