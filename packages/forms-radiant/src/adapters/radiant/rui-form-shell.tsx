import { RuiForm } from '@ecopages/radiant-ui/form';
import {
	arrayItemScope,
	composeFieldName,
	getElementChildren,
	objectFieldScope,
	usesScalarArrayItem,
	type FieldScope,
	type FormConfigView,
} from '@schema-engine/forms';
import { collectFieldDefaults, flattenStepElements } from '@schema-engine/forms/lib/field-scope';
import { getValueAtPath, mergePathValues, setValueAtPath } from '@schema-engine/forms/lib/path-values';
import { expandValues, flattenValues } from './controller/values';
import type { JsxRenderable } from '@ecopages/jsx';
import { createArrayItemDefaultValue } from '@/lib/array-item-default';

export function collectFormDefaultValues(
	config: FormConfigView,
	userDefaults: Partial<Record<string, unknown>> = {},
): Partial<Record<string, unknown>> {
	return flattenValues(collectFormInitialValues(config, userDefaults));
}

export function collectFormInitialValues(
	config: FormConfigView,
	userDefaults: Partial<Record<string, unknown>> = {},
): Record<string, unknown> {
	const values = mergePathValues(
		collectFieldDefaults(flattenStepElements(config.steps), userDefaults, { seedMinItems: false }),
		userDefaults,
	);
	seedMinimumArrayRows(flattenStepElements(config.steps), values, userDefaults);
	return values;
}

function seedMinimumArrayRows(
	elements: readonly object[],
	values: Record<string, unknown>,
	userDefaults: Partial<Record<string, unknown>>,
	scope?: FieldScope,
): void {
	for (const element of elements) {
		const path = composeFieldName(element, scope);
		if (!path) continue;

		const children = getElementChildren(element) as object[] | undefined;
		if (!children?.length) continue;

		if ('$type' in element && element.$type === 'arrayElements') {
			const rows = getValueAtPath<unknown[]>(values, path);
			const minItems = 'minItems' in element && typeof element.minItems === 'number' ? element.minItems : 0;
			const seededRows = Array.isArray(rows) ? [...rows] : [];
			const scalar = usesScalarArrayItem(element, path, children, values);
			const createDefaultItem = () =>
				createArrayItemDefaultValue({
					initialValues: 'initialValues' in element ? element.initialValues : undefined,
					elements: children,
					scalar,
				});
			while (seededRows.length < minItems) seededRows.push(createDefaultItem());
			if (seededRows.length > 0 || Array.isArray(rows)) setValueAtPath(values, path, seededRows);

			for (let index = 0; index < seededRows.length; index += 1) {
				seedMinimumArrayRows(
					children,
					values,
					userDefaults,
					arrayItemScope(path, index, `seed-${index}`, { scalar, parentInstanceId: scope?.instanceId }),
				);
			}
			continue;
		}

		seedMinimumArrayRows(children, values, userDefaults, objectFieldScope(path, scope));
	}
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
	onSubmit,
	children,
}: {
	config: FormConfigView;
	defaultValues?: Partial<Record<string, unknown>>;
	initialValues?: Record<string, unknown>;
	onSubmit?: (data: Record<string, unknown>) => void | Promise<void>;
	children: JsxRenderable;
}) {
	const effectiveOnSubmit = (values: Record<string, unknown>) => onSubmit?.(expandValues(values));

	return (
		<RuiForm
			class={config.className}
			style={config.style}
			mode="onSubmit"
			reValidateMode="onChange"
			defaultValues={initialValues ?? collectFormDefaultValues(config, defaultValues)}
			onSubmit={effectiveOnSubmit}
			on:rui-invalid={rememberInvalidErrors}
			on:rui-submit={clearInvalidErrors}
		>
			{children}
		</RuiForm>
	);
}
