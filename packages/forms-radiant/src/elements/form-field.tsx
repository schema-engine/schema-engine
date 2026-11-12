import { getAppearanceAttributes, type AppearanceSelection } from '@schema-engine/forms/lib/appearance';
import { RuiFieldElement, type RuiFieldProps } from '@ecopages/radiant-ui/field';
import { findFieldControl, RUI_FIELD_MANAGED_ATTR, type FieldRules } from '@ecopages/radiant-ui/form';
import type { JsxCustomElementAttributes } from '@ecopages/jsx';
import { readHydratedRules } from '@/components/internals/field-rule-hydrator';
import type { ElementGridConfig } from '@schema-engine/forms/schemas';
import { resolveElementRules, toFieldRules, type FieldRulesSource } from '@/lib/field-rules';
import { FIELD_ARIA_TARGET_ATTR } from '@/lib/field-control';
import { mergeFieldGridHost } from '@/hooks/grid-styles';
import { formElement } from '@/lib/define-element';
import { onUpdated } from '@ecopages/radiant';
import { onContextUpdate } from '@ecopages/radiant/context';
import { constraintContext, formValuesContext, type ConstraintState } from '@/contexts/constraint-context';
import { FormController } from '@/adapters/radiant/controller';
import { shouldSurfaceDependentError } from '@schema-engine/forms/schemas/validation';

const REQUIRED_MARKER = '[data-se-required-marker]';

/** RuiField's registration and presentation, restoring hydrated rules and defaults. */
@formElement('se-field')
export class FormFieldElement extends RuiFieldElement {
	private constraint?: ConstraintState;
	private isAuthoredDisabled?: (renderedPath: string) => boolean;
	private authoredRules?: FieldRules;
	private appliedRules?: FieldRules;

	protected override onConnected(): void {
		this.hydrateDefaultValue();
		const rules = readHydratedRules(this);
		if (rules) {
			this.rules = rules;
		}
		super.onConnected();
		this.authoredRules ??= this.rules ?? {};
		this.applyConstraint();
	}

	/**
	 * Takes rules set from outside as the new authored baseline, then reapplies the constraint.
	 *
	 * @remarks
	 * A re-render can reuse this element with new `rules`. Only the object `applyConstraint`
	 * wrote is its own; any other is authored, and keeping the first baseline would
	 * overwrite it with stale rules on the next constraint change.
	 */
	@onUpdated(['rules'])
	onExternalRules(): void {
		if (this.authoredRules === undefined || this.rules === this.appliedRules) return;
		this.authoredRules = this.rules ?? {};
		this.applyConstraint();
	}

	@onContextUpdate({ context: constraintContext, requestUpdate: false })
	onConstraint(constraint: ConstraintState | undefined): void {
		this.constraint = constraint;
		this.applyConstraint();
	}

	@onContextUpdate({
		context: formValuesContext,
		select: (form) => form?.isAuthoredDisabled,
		requestUpdate: false,
	})
	onAuthoredDisabled(isAuthoredDisabled: ((renderedPath: string) => boolean) | undefined): void {
		this.isAuthoredDisabled = isAuthoredDisabled;
		this.applyConstraint();
	}

	/**
	 * Composes the field's authored state with the constraint wrappers around it.
	 *
	 * @remarks
	 * A field outside every wrapper never receives a constraint and keeps what render gave
	 * it. The live `disabled` already holds what a constraint applied at render, so the
	 * authored state comes from the config lookup, and the authored rules are kept as
	 * the object they were, because a clone would strip `validate` functions and `RegExp`
	 * patterns. It waits for the constraint context, the authored-disabled lookup and the authored
	 * rules, so an authored `disabled` is never lifted while the lookup is still on its
	 * way; a field inside a wrapper that has not evaluated yet keeps its render state too. A `required` that changes validates the field when the
	 * user has reached it, as a dependent field is.
	 */
	private applyConstraint(): void {
		const { constraint, isAuthoredDisabled, authoredRules: authored } = this;
		if (!constraint || !isAuthoredDisabled || !authored) return;
		const name = this.getAttribute('name') ?? this.name;

		this.disabled = isAuthoredDisabled(name) || constraint.disabled;

		const required = constraint.required
			? typeof authored.required === 'string'
				? authored.required
				: true
			: authored.required;
		if (this.rules?.required === required) return;
		this.appliedRules = { ...authored, required };
		this.rules = this.appliedRules;
		this.querySelector(REQUIRED_MARKER)?.toggleAttribute('hidden', !required);
		this.onRulesUpdated();

		const store = new FormController(this).store;
		if (!store || !name) return;
		const { touched, isSubmitted } = store.getState();
		if (shouldSurfaceDependentError({ touched: Boolean(touched[name]), submitted: isSubmitted })) {
			void store.validateField(name);
		}
	}

	/**
	 * Syncs the label and ARIA onto the control a custom host rendered, once.
	 *
	 * @remarks
	 * A custom host that renders its own control, such as the masked, phone and
	 * OTP inputs, renders after the field first synced. That sync finds no
	 * `data-rui-aria-target` inside the host, so the label and ARIA never reach
	 * the control. The host calls this from its `onConnected` through
	 * `syncFieldControl`; syncing only while the target is unmanaged ends the loop
	 * the field's own DOM writes would otherwise start.
	 */
	resyncControl(): void {
		const control = findFieldControl(this);
		const selector = control?.getAttribute(FIELD_ARIA_TARGET_ATTR);
		const target = selector ? control?.querySelector(selector) : null;
		if (target && !target.hasAttribute(RUI_FIELD_MANAGED_ATTR)) {
			this.onPresentationUpdated();
		}
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
	appearance,
	...props
}: Omit<JsxCustomElementAttributes<FormFieldElement, RuiFieldProps>, 'rules'> & {
	appearance?: AppearanceSelection;
	validation?: FieldRulesSource;
	validate?: FieldRules['validate'];
	grid?: ElementGridConfig;
	style?: Record<string, string | number | undefined>;
}) {
	const fieldHost = mergeFieldGridHost(grid, style);
	const validationRules = validation ? resolveElementRules(validation) : undefined;

	return (
		<FormFieldElement
			{...props}
			classes={['se-form-field', className]}
			data-se-grid-theme={fieldHost.themeId}
			style={fieldHost.style}
			{...getAppearanceAttributes(appearance)}
			rules={withCustomValidate(toFieldRules({ rules: validationRules, name: validation?.name }), validate)}
			data-se-validation-rules={validationRules ? JSON.stringify(validationRules) : undefined}
			defaultValue={defaultValue}
			data={{
				defaultValue:
					defaultValueData ?? (defaultValue !== undefined ? JSON.stringify(defaultValue) : undefined),
			}}
		>
			<div class="rui-field" data-ref="field">
				{children}
			</div>
		</FormFieldElement>
	);
}
