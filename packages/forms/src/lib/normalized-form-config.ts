import type { ContainerKind } from '../types/registration.js';
import { isPlainObject } from './is-plain-object.js';
import type { DeepReadonly } from './deep-readonly.js';
import type { FormActionConfig, FormConfig, FormStep, FormValidationModes } from '@/schemas/form-config.js';
import type { ElementConfig } from '@/schemas/field-config.js';
import type { BaseField } from '@/schemas/base-field.js';
import type { StandardSchemaV1 } from '@standard-schema/spec';
import type { FormValues } from '@/runtime/types.js';
import type { ParsedActionSequence } from '@schema-engine/actions';

const NORMALIZED_FORM_CONFIG = Symbol.for('@schema-engine/forms.normalized-form-config');
const ELEMENT_CONTAINER_KIND = Symbol.for('@schema-engine/forms.container-kind');

const NORMALIZED_ELEMENT_CONFIG = Symbol.for('@schema-engine/forms.normalized-element-config');

/**
 * Re-exported because the public config types below are built from it: a consumer's declaration
 * emit has to be able to name it from this subpath.
 */
export type { DeepReadonly };

/**
 * What a normalized form remembers of where it came from, and of the values it submits.
 *
 * @remarks `values` is the application's schema, bound by `validateForm(json, { values })`; the runtime parses a submission with it after the schema derived from the form.
 */
type NormalizedFormProvenance = {
	readonly owner: object;
	readonly values?: StandardSchemaV1;
};

declare const VALUES: unique symbol;

/**
 * The values type a form carries, as a required property that exists only in types.
 *
 * @remarks
 * `defineForm` infers it from a literal config and `validateForm` takes it from the schema's output, so a renderer and
 * the runtime type their callbacks by it. It is required so that only a normalized form has it: an object that was not
 * normalized matches no values type, and nothing can claim one for it. It is covariant: a form typed with its own
 * values is a form of any wider values type, and a form validated without a schema (`FormValues`) is not a form of a
 * narrower one.
 */
export type ValuesBrand<TValues> = { readonly [VALUES]: TValues };

/** Readable form shape. Accepts authoring config and frozen normalized output. */
export type FormConfigView<
	TElements extends Record<string, unknown> = Record<string, unknown>,
	TRecipes extends Record<string, unknown> = Record<string, unknown>,
	TActions extends Record<string, unknown> = Record<string, unknown>,
> = DeepReadonly<FormConfig<TElements, TRecipes, TActions>>;

type WithNormalizedChildren<T, TElements extends Record<string, unknown>> = {
	[K in keyof T]: K extends 'elements' ? ReadonlyArray<NormalizedElementConfig<TElements>> : T[K];
};

type NormalizedElementShape<TElements extends Record<string, unknown>> = string extends keyof TElements
	? DeepReadonly<BaseField> & {
			readonly [key: string]: unknown;
			readonly elements?: ReadonlyArray<NormalizedElementConfig<TElements>>;
		}
	: [keyof TElements] extends [never]
		? never
		: {
				[K in keyof TElements & string]: WithNormalizedChildren<
					DeepReadonly<{ readonly $type: K } & TElements[K] & BaseField>,
					TElements
				> &
					DeepReadonly<BaseField> & { readonly $type: K; readonly [key: string]: unknown };
			}[keyof TElements & string] & { readonly elements?: ReadonlyArray<NormalizedElementConfig<TElements>> };

/**
 * Element produced by {@link FormEngine.validateElement} or as part of a
 * {@link NormalizedFormConfig}. Distinct from authoring `ElementConfig`.
 *
 * Container children are typed for renderers via {@link WithNormalizedChildren}
 * / {@link ElementRenderProps}. The snapshot itself is frozen at runtime.
 */
export type NormalizedElementConfig<TElements extends Record<string, unknown> = Record<string, unknown>> =
	NormalizedElementShape<TElements> & {
		readonly [NORMALIZED_ELEMENT_CONFIG]: true;
	};

/**
 * The actions of a normalized form or step: parsed by {@link parseActions} against the engine's registrations,
 * which is what {@link ActionDispatcher.dispatch} takes.
 */
type NormalizedActions<TActions extends Record<string, unknown>> = ParsedActionSequence<
	DeepReadonly<FormActionConfig<TActions>>
>;

type NormalizedStep<TElements extends Record<string, unknown>, TActions extends Record<string, unknown>> = Omit<
	DeepReadonly<FormStep<TElements, TActions>>,
	'elements' | 'actions'
> & {
	readonly elements: ReadonlyArray<NormalizedElementConfig<TElements>>;
	readonly actions?: NormalizedActions<TActions>;
};

/**
 * Immutable form produced by {@link FormEngine.defineForm} / {@link FormEngine.validateForm}.
 *
 * Distinct from authoring input (`FormConfig` / JSON): registration schemas have already
 * applied defaults and transforms. Frozen at runtime and readonly in TypeScript.
 */
export type NormalizedFormConfig<
	TElements extends Record<string, unknown> = Record<string, unknown>,
	TRecipes extends Record<string, unknown> = Record<string, unknown>,
	TActions extends Record<string, unknown> = Record<string, unknown>,
	TValues = FormValues,
> = Omit<DeepReadonly<FormConfig<TElements, TRecipes, TActions>>, 'steps' | 'actions' | keyof FormValidationModes> &
	Readonly<FormValidationModes> & {
		readonly steps: ReadonlyArray<NormalizedStep<TElements, TActions>>;
		readonly actions?: NormalizedActions<TActions>;
		readonly [NORMALIZED_FORM_CONFIG]: NormalizedFormProvenance;
	} & ValuesBrand<TValues>;

export function isNormalizedElementConfig(value: unknown): value is NormalizedElementConfig {
	if (typeof value !== 'object' || value === null || !Object.isFrozen(value)) return false;
	return (value as NormalizedElementConfig)[NORMALIZED_ELEMENT_CONFIG];
}

/**
 * Copy plain objects and arrays into an owned snapshot.
 * Other objects (`Date`, class instances, etc.) are reused by reference.
 */
function cloneFormValue(value: unknown, seen: WeakMap<object, unknown>): unknown {
	if (value === null || typeof value !== 'object') return value;
	if (isNormalizedElementConfig(value)) return value;

	const cached = seen.get(value);
	if (cached) return cached;

	if (Array.isArray(value)) {
		const copy: unknown[] = [];
		seen.set(value, copy);
		for (const item of value) copy.push(cloneFormValue(item, seen));
		return copy;
	}

	if (!isPlainObject(value)) return value;

	const copy: Record<string, unknown> = {};
	seen.set(value, copy);
	for (const key of Object.keys(value)) {
		copy[key] = cloneFormValue(value[key], seen);
	}
	return copy;
}

function freezeOwnedTree(value: unknown, seen: WeakSet<object>): void {
	if (value === null || typeof value !== 'object') return;
	if (seen.has(value)) return;
	if (isNormalizedElementConfig(value)) return;
	seen.add(value);

	if (Array.isArray(value)) {
		for (const item of value) freezeOwnedTree(item, seen);
		Object.freeze(value);
		return;
	}

	if (!isPlainObject(value)) return;

	for (const key of Object.keys(value)) {
		freezeOwnedTree(value[key], seen);
	}
	Object.freeze(value);
}

function attachFormBrand(config: object, owner: object, values?: StandardSchemaV1): void {
	Object.defineProperty(config, NORMALIZED_FORM_CONFIG, {
		value: values ? { owner, values } : { owner },
		enumerable: false,
		configurable: false,
		writable: false,
	});
}

function attachElementBrand(element: object): void {
	Object.defineProperty(element, NORMALIZED_ELEMENT_CONFIG, {
		value: true,
		enumerable: false,
		configurable: false,
		writable: false,
	});
}

function getFormProvenance(value: object): NormalizedFormProvenance | undefined {
	const provenance = (value as NormalizedFormConfig)[NORMALIZED_FORM_CONFIG];
	if (!provenance || typeof provenance !== 'object' || !('owner' in provenance)) {
		return undefined;
	}
	return provenance;
}

export function getNormalizedFormOwner(value: unknown): object | undefined {
	if (typeof value !== 'object' || value === null || !Object.isFrozen(value)) return undefined;
	return getFormProvenance(value)?.owner;
}

export function isNormalizedFormConfig(value: unknown, owner?: object): value is NormalizedFormConfig {
	const provenanceOwner = getNormalizedFormOwner(value);
	if (!provenanceOwner) return false;
	return owner === undefined || provenanceOwner === owner;
}

/**
 * The application's schema of the submitted values, bound to a form by `validateForm(json, { values })`.
 *
 * @remarks `undefined` for a form with none, whose submission is checked against the schema derived from its elements alone.
 */
export function getNormalizedFormValues(value: unknown): StandardSchemaV1 | undefined {
	if (typeof value !== 'object' || value === null || !Object.isFrozen(value)) return undefined;
	return getFormProvenance(value)?.values;
}

/**
 * Freezes a form into a normalized one owned by `owner`.
 *
 * @remarks
 * A form `owner` already normalized comes back as it is, unless `values` says another schema binds it: that is a copy
 * with the schema, so the one it was given stays as it was.
 */
export function markNormalizedFormConfig(
	config: FormConfig,
	owner: object,
	values?: StandardSchemaV1,
): NormalizedFormConfig {
	if (isNormalizedFormConfig(config, owner) && (values === undefined || getNormalizedFormValues(config) === values)) {
		return config;
	}

	const snapshot = cloneFormValue(config, new WeakMap()) as FormConfig;
	attachFormBrand(snapshot, owner, values);
	freezeOwnedTree(snapshot, new WeakSet());
	return snapshot as unknown as NormalizedFormConfig;
}

export function markNormalizedElementConfig(
	config: ElementConfig | NormalizedElementConfig,
	containerKind?: ContainerKind,
): NormalizedElementConfig {
	const alreadyNormalized = isNormalizedElementConfig(config);
	const resolvedContainerKind = containerKind ?? (alreadyNormalized ? getElementContainerKind(config) : undefined);
	if (alreadyNormalized && getElementContainerKind(config) === resolvedContainerKind) {
		return config;
	}

	const snapshot = (alreadyNormalized ? { ...config } : cloneFormValue(config, new WeakMap())) as object;
	attachElementBrand(snapshot);
	if (resolvedContainerKind)
		Object.defineProperty(snapshot, ELEMENT_CONTAINER_KIND, { value: resolvedContainerKind });
	freezeOwnedTree(snapshot, new WeakSet());
	return snapshot as unknown as NormalizedElementConfig;
}

/** Registration container semantics attached to normalized element snapshots. */
export function getElementContainerKind(element: object): ContainerKind | undefined {
	return (element as { [ELEMENT_CONTAINER_KIND]?: ContainerKind })[ELEMENT_CONTAINER_KIND];
}
