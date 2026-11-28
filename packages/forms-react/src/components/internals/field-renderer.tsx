import type React from 'react';
import { useFormEngine } from '@/hooks';
import { useContainerSelector } from '@/hooks/form-state/context';
import { applyFieldOverlay, type NormalizedElementConfig, isNormalizedElementConfig } from '@schema-engine/forms';
import { selectFieldState } from '@schema-engine/forms/state-container';
import { FieldHostContext } from '@/contexts/field-constraint-context';
import { ElementError } from './element-error';

export interface FormElementProps {
	/**
	 * Element from a `NormalizedFormConfig` or `engine.validateElement`.
	 * Authoring JSON is not accepted.
	 */
	config: NormalizedElementConfig;
	/** Render-time field path. The frozen config is not cloned. */
	name?: string;
	/** Render-time HTML id. Prefer a stable instance id, not an array index. */
	id?: string;
	/** Stable array-item identity forwarded to nested containers. */
	instanceId?: string;
	className?: string;
	style?: React.CSSProperties;
}

/**
 * Renders a registered element. Config must already be normalized.
 *
 * @remarks
 * Whether the element is shown or disabled is the container's: `selectFieldState` says it, from the one ordered
 * evaluation of the form's constraints, with the constraints of the containers around the element folded in.
 * A field that takes no part is not rendered.
 */
export function FormElement({ config, name, id, instanceId, className, style }: FormElementProps) {
	const { engine } = useFormEngine();
	const elementType = config.$type;
	if (!isNormalizedElementConfig(config)) {
		throw new Error(`FormElement config must be normalized before render (${elementType}).`);
	}
	const fieldPath = name ?? config.name;
	const state = useContainerSelector((snapshot) => selectFieldState(snapshot, fieldPath));
	const disabled = ('disabled' in config && config.disabled === true) || state.disabled;

	if (state.hidden) {
		return null;
	}

	const { $type } = config;

	const elementRegistration = engine.elements.get($type);

	if (!elementRegistration) {
		return (
			<ElementError
				title="Component not found"
				message={`The component type "${$type}" is not registered in the form engine.`}
				componentType={$type}
				className={className}
				style={style}
			/>
		);
	}

	const Component = elementRegistration.render as React.ComponentType<Record<string, unknown>>;

	const enhancedConfig = applyFieldOverlay({ ...config, disabled }, { name, id, instanceId });

	return (
		<FieldHostContext.Provider value={{ appearance: config.appearance, className: config.className }}>
			<Component {...enhancedConfig} />
		</FieldHostContext.Provider>
	);
}
