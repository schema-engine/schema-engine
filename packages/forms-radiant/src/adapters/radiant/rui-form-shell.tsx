import '@ecopages/radiant-ui/form/styles.css';
import { RuiForm } from '@ecopages/radiant-ui/form';
import type { FormConfig } from '@schema-engine/forms/schemas';
import type { JsxRenderable } from '@ecopages/jsx';

export function collectFormDefaultValues(
	config: FormConfig,
	userDefaults: Partial<Record<string, unknown>> = {},
): Partial<Record<string, unknown>> {
	const defaults: Record<string, unknown> = { ...userDefaults };

	for (const step of config.steps) {
		for (const element of step.elements ?? []) {
			if (element.name && element.defaultValue !== undefined && defaults[element.name] === undefined) {
				defaults[element.name] = element.defaultValue;
			}
		}
	}

	return defaults;
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
	onSubmit,
	children,
}: {
	config: FormConfig;
	defaultValues?: Partial<Record<string, unknown>>;
	onSubmit?: (data: Record<string, unknown>) => void | Promise<void>;
	children: JsxRenderable;
}) {
	return (
		<RuiForm
			class={config.className}
			style={config.style}
			mode="onSubmit"
			reValidateMode="onChange"
			defaultValues={collectFormDefaultValues(config, defaultValues)}
			onSubmit={onSubmit}
			on:rui-invalid={rememberInvalidErrors}
			on:rui-submit={clearInvalidErrors}
		>
			{children}
		</RuiForm>
	);
}
