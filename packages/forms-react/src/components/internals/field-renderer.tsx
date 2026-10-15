import type React from 'react';
import { useFormEngine, useConstraintLogic } from '@/hooks';
import { isFieldRequired } from '@schema-engine/forms/schemas/validation/utils';
import { applyFieldOverlay, type NormalizedElementConfig } from '@schema-engine/forms';
import { isNormalizedElementConfig } from '@schema-engine/forms/lib/normalized-form-config';
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
 */
export function FormElement({ config, name, id, instanceId, className, style }: FormElementProps) {
	const { engine } = useFormEngine();
	const elementType = config.$type;
	if (!isNormalizedElementConfig(config)) {
		throw new Error(`FormElement config must be normalized before render (${elementType}).`);
	}
	const { shouldShow, shouldDisable, isRequired } = useConstraintLogic(
		name ?? config.name,
		'constraints' in config ? config.constraints : undefined,
		isFieldRequired('rules' in config ? config.rules : undefined),
	);

	if (!shouldShow) {
		return null;
	}

	const { $type } = config;

	const elementRegistration = engine.getElement($type);

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

	const Component = elementRegistration.render as React.ComponentType<any>;

	const enhancedConfig = applyFieldOverlay(
		{
			...config,
			disabled: ('disabled' in config ? config.disabled : false) || shouldDisable,
			required: isRequired,
		},
		{ name, id, instanceId },
	);

	return <Component {...enhancedConfig} />;
}
