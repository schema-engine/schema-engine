import { useContext } from 'react';
import { useFormEngine, useConstraintLogic } from '@/hooks';
import { isFieldRequired } from '@schema-engine/forms/schemas/validation/utils';
import { parseStandardSchema } from '@schema-engine/forms/lib/standard-schema';
import { ValidatedFormConfigContext } from '@/components/provider';
import { ElementError } from './element-error';

export interface FormElementProps {
	config: FormEngine.ElementConfig;
	className?: string;
	style?: React.CSSProperties;
}

/**
 * Complete field component that handles constraints, rendering, and error states
 */
export function FormElement({ config, className, style }: FormElementProps) {
	const { engine, configValidated: engineConfigValidated } = useFormEngine();
	const contextConfigValidated = useContext(ValidatedFormConfigContext);
	const configValidated = engineConfigValidated ?? contextConfigValidated;
	const { shouldShow, shouldDisable, isRequired } = useConstraintLogic(
		'constraints' in config ? config.constraints : undefined,
		isFieldRequired('rules' in config ? config.rules : undefined),
	);

	if (!shouldShow) {
		return null;
	}

	const { $type, ...componentConfig } = config;

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

	if (!configValidated) {
		try {
			parseStandardSchema(elementRegistration.schema, config);
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : 'Invalid configuration';
			return (
				<ElementError
					title="Invalid element configuration"
					message={errorMessage}
					componentType={$type}
					className={className}
					style={style}
				/>
			);
		}
	}
	const Component = elementRegistration.render as React.ComponentType<any>;

	const enhancedConfig = {
		...componentConfig,
		disabled: ('disabled' in config ? config.disabled : false) || shouldDisable,
		required: isRequired,
	};

	return <Component {...enhancedConfig} />;
}
