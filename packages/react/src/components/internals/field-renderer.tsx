import { useFormEngine, useConstraintLogic } from '@/hooks';
import { isFieldRequired } from '@json-form-engine/core/schemas/validation';

export interface FormElementProps {
	config: FormEngine.FieldConfig;
	className?: string;
	style?: React.CSSProperties;
}

/**
 * Complete field component that handles constraints, rendering, and error states
 */
export function FormElement({ config, className, style }: FormElementProps) {
	const { registry } = useFormEngine();
	const { shouldShow, shouldDisable, isRequired } = useConstraintLogic(
		'constraints' in config ? config.constraints : undefined,
		isFieldRequired('rules' in config ? config.rules : undefined),
	);

	if (!shouldShow) {
		return null;
	}

	const Component = registry.getComponent(config.componentId);

	if (!Component) {
		return (
			<div className={`text-red-500 text-sm ${className || ''}`} style={style}>
				Error: Component "{config.componentId}" not found in registry
			</div>
		);
	}

	const enhancedConfig = {
		...config,
		disabled: ('disabled' in config ? config.disabled : false) || shouldDisable,
		required: isRequired,
	};

	return <Component config={enhancedConfig} />;
}
