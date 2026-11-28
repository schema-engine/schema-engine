import { useEffect, useMemo, useRef, useState } from 'react';
import { getAppearanceAttributes } from '@schema-engine/layout';
import {
	type EngineOutputMaps,
	createFormRuntime,
	defaultNavigate,
	type FormConfigView,
	type FormValues,
} from '@schema-engine/forms';
import { getObjectIdentity } from '../lib/object-identity.js';
import { FormStateContext, type FormStateContextValue } from '../hooks/form-state/context.js';
import { createFieldRegistry, type FieldRegistry } from '../hooks/form-state/field-registry.js';
import type { FormProviderAction, FormProviderProps } from '../hooks/form-state/types.js';
import { useFormEngine } from '../hooks/use-form-context.js';

/** @remarks The form instance of one normalized config and one engine: the runtime, and the container it builds, are created once, from both. */
function FormInstance<TOutputs extends EngineOutputMaps, TValues extends FormValues>({
	config,
	defaultValues,
	children,
	onSubmit,
	onChange,
	onAction,
	onActionResults,
	navigate,
	formatIssue,
}: FormProviderProps<TOutputs, TValues>) {
	const { engine } = useFormEngine();
	const runtimeConfig: FormConfigView = config;

	const callbacks = useRef({ onSubmit, onChange, onAction, onActionResults, navigate });
	useEffect(() => {
		callbacks.current = { onSubmit, onChange, onAction, onActionResults, navigate };
	}, [onSubmit, onChange, onAction, onActionResults, navigate]);

	const [{ runtime, fields }] = useState(() => {
		let registry: FieldRegistry | undefined;
		const created = createFormRuntime<FormProviderAction<TOutputs>, TValues>({
			engine,
			config,
			defaults: defaultValues,
			host: { focus: (paths) => registry?.focusFirst(paths) },
			onSubmit: (data, helpers) => callbacks.current.onSubmit?.(data, helpers),
			onChange: (data) => callbacks.current.onChange?.(data),
			onAction: (action, data) => callbacks.current.onAction?.(action, data),
			onActionResults: (results, trigger) => callbacks.current.onActionResults?.(results, trigger),
			navigate: (url) => (callbacks.current.navigate ?? defaultNavigate)(url),
		});
		registry = createFieldRegistry(created.container);
		return { runtime: created, fields: registry };
	});
	useEffect(() => runtime.mount(), [runtime]);

	const resolvedFormatIssue = formatIssue ?? engine.getIssueFormatter();
	const formState = useMemo<FormStateContextValue>(
		() => ({ container: runtime.container, formatIssue: resolvedFormatIssue, fields, runtime }),
		[runtime, resolvedFormatIssue, fields],
	);

	return (
		<FormStateContext.Provider value={formState}>
			<form
				onSubmit={(event) => {
					event.preventDefault();
					void runtime.submit();
				}}
				onReset={(event) => {
					event.preventDefault();
					runtime.container.reset();
				}}
				className={runtimeConfig.className}
				style={runtimeConfig.style}
				data-se-theme={engine.getLayout().id}
				{...getAppearanceAttributes(runtimeConfig.appearance)}
				noValidate
			>
				{children}
			</form>
		</FormStateContext.Provider>
	);
}

/**
 * Creates the form's runtime, and the state container it owns, and renders the `<form>` around its children.
 *
 * @remarks
 * The runtime is one instance of the lifecycle: the container (the only form state) plus the submission, the
 * wizard steps and every action dispatch. It is created from the normalized config, the engine, the defaults
 * and the config's `validationMode`, `reValidateMode`, `navigation` and `payload`, and lives as long as the
 * identities of the config and the engine do: a new normalized config or engine starts a fresh instance
 * with its defaults and step state, whichever component renders the provider. `defaultValues` are read when the
 * instance starts. The callbacks may change on every render: the runtime calls the latest. The hooks under the
 * provider read the runtime and the container with `useSyncExternalStore`.
 *
 * The form is submitted by `onSubmit` and never by a React 19 `<form action>`: React resets the uncontrolled
 * fields of a form after an action, which would erase text the container still holds. Submitting before the
 * last step of a wizard acts as Next. A native reset button is the same: the browser would put the controls back
 * to their `defaultValue` attributes behind the container, so the form handles `reset` itself, restoring the
 * defaults through the container, whose write-back updates the controls; and since a reset bumps the container's
 * `generation`, the runtime returns to the first step and an idle submission with it. The one formatter of the
 * form is `formatIssue`, else the engine's.
 */
export function FormProvider<
	TOutputs extends EngineOutputMaps = EngineOutputMaps,
	TValues extends FormValues = FormValues,
>(props: FormProviderProps<TOutputs, TValues>) {
	const { engine } = useFormEngine();
	return <FormInstance key={`${getObjectIdentity(props.config)}:${getObjectIdentity(engine)}`} {...props} />;
}
