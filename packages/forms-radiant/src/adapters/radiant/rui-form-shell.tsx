import { RuiForm } from '@ecopages/radiant-ui/form';
import { collectFieldDefaults, flattenStepElements } from '@schema-engine/forms/lib/field-scope';
import { mergePathValues } from '@schema-engine/forms/lib/path-values';
import type { FormConfigView } from '@schema-engine/forms';
import { flattenValues } from './controller/values';
import type { JsxRenderable } from '@ecopages/jsx';

export function collectFormDefaultValues(
	config: FormConfigView,
	userDefaults: Partial<Record<string, unknown>> = {},
): Partial<Record<string, unknown>> {
	return flattenValues(
		mergePathValues(collectFieldDefaults(flattenStepElements(config.steps), userDefaults), userDefaults),
	);
}

function rememberInvalidErrors(event: Event): void {
	const ruiForm = event.currentTarget as HTMLElement | null;
	const detail = (event as CustomEvent<{ errors: Record<string, { message?: string }> }>).detail;
	ruiForm?.setAttribute('data-se-last-invalid', JSON.stringify(detail?.errors ?? {}));
}

function clearInvalidErrors(event: Event): void {
	(event.currentTarget as HTMLElement | null)?.removeAttribute('data-se-last-invalid');
}

export function ConfiguredRuiForm({
	config,
	defaultValues = {},
	initialValues,
	children,
}: {
	config: FormConfigView;
	defaultValues?: Partial<Record<string, unknown>>;
	initialValues?: Record<string, unknown>;
	children: JsxRenderable;
}) {
	return (
		<RuiForm
			class={config.className}
			style={config.style}
			mode="onSubmit"
			reValidateMode="onChange"
			defaultValues={initialValues ?? collectFormDefaultValues(config, defaultValues)}
			on:rui-invalid={rememberInvalidErrors}
			on:rui-submit={clearInvalidErrors}
		>
			{children}
		</RuiForm>
	);
}
