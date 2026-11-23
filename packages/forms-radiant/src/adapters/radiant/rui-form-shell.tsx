import { RuiForm } from '@ecopages/radiant-ui/form';
import { type FormConfigView, collectInitialValues, flattenStepElements } from '@schema-engine/forms';
import type { JsxRenderable } from '@ecopages/jsx';
import { getAppearanceAttributes } from '@schema-engine/layout';

export function collectFormInitialValues(
	config: FormConfigView,
	userDefaults: Partial<Record<string, unknown>> = {},
): Record<string, unknown> {
	return collectInitialValues(flattenStepElements(config.steps), userDefaults);
}

/**
 * The `rui-form` of a form instance: chrome and layout only.
 *
 * @remarks
 * It carries no validation timing, default values or rules. `se-form-instance` injects the form's state
 * container with `connect`, and the container owns all three.
 */
export function ConfiguredRuiForm({
	config,
	layoutThemeId,
	action,
	method,
	children,
}: {
	config: FormConfigView;
	/** The engine's layout theme id, which scopes its token rules to this form. */
	layoutThemeId?: string;
	/** Native destination, which Radiant UI copies onto the inner `<form>` and a post without `onSubmit` uses. */
	action?: string;
	method?: string;
	children: JsxRenderable;
}) {
	return (
		<RuiForm
			class={config.className}
			style={config.style}
			data-se-theme={layoutThemeId}
			action={action}
			method={method}
			{...getAppearanceAttributes(config.appearance)}
		>
			{children}
		</RuiForm>
	);
}
