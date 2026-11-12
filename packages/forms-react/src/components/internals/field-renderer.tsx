import type React from 'react';
import { useContext, useMemo } from 'react';
import { useFormEngine, useConstraintLogic } from '@/hooks';
import { applyFieldOverlay, type NormalizedElementConfig } from '@schema-engine/forms';
import { isNormalizedElementConfig } from '@schema-engine/forms/lib/normalized-form-config';
import {
	FieldAppearanceContext,
	FieldConstraintContext,
	InheritedFieldStateContext,
} from '@/contexts/field-constraint-context';
import { isElementRequired } from '@/hooks/is-element-required';
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
 * Constraints are evaluated once here, with the field type's default rules in the
 * base required flag, and handed to the element's `useControlledFormElement`
 * through {@link FieldConstraintContext}. The element's disabled state and the
 * `require` constraints around it reach the elements inside it through
 * {@link InheritedFieldStateContext}.
 */
export function FormElement({ config, name, id, instanceId, className, style }: FormElementProps) {
	const { engine } = useFormEngine();
	const elementType = config.$type;
	if (!isNormalizedElementConfig(config)) {
		throw new Error(`FormElement config must be normalized before render (${elementType}).`);
	}
	const fieldPath = name ?? config.name;
	const inherited = useContext(InheritedFieldStateContext);
	const evaluated = useConstraintLogic(
		fieldPath,
		'constraints' in config ? config.constraints : undefined,
		inherited.required,
	);
	const ownRequired = isElementRequired(config, engine.getValidationRegistry());
	const constraints = { ...evaluated, isRequired: evaluated.isRequired || ownRequired };
	const { shouldShow, shouldDisable } = constraints;
	const disabled = ('disabled' in config && config.disabled === true) || shouldDisable || inherited.disabled;
	const passedDown = useMemo(() => ({ disabled, required: evaluated.isRequired }), [disabled, evaluated.isRequired]);

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

	const Component = elementRegistration.render as React.ComponentType<Record<string, unknown>>;

	const enhancedConfig = applyFieldOverlay({ ...config, disabled }, { name, id, instanceId });

	return (
		<InheritedFieldStateContext.Provider value={passedDown}>
			<FieldConstraintContext.Provider value={{ fieldPath, constraints }}>
				<FieldAppearanceContext.Provider value={config.appearance}>
					<Component {...enhancedConfig} />
				</FieldAppearanceContext.Provider>
			</FieldConstraintContext.Provider>
		</InheritedFieldStateContext.Provider>
	);
}
