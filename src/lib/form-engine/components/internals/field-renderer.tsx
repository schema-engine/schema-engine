import { useFormEngine, useConstraintLogic } from '@/lib/form-engine/hooks';
import { isFieldRequired } from '@/lib/form-engine/validation';
import type { FieldConfig } from '@/lib/form-engine/types/form';

export interface FormElementProps {
	config: FieldConfig;
	className?: string;
	style?: React.CSSProperties;
}

/**
 * Complete field component that handles constraints, rendering, and error states
 */
export function FormElement({ config, className, style }: FormElementProps) {
	const { registry } = useFormEngine();
	const { shouldShow, shouldDisable, isRequired } = useConstraintLogic(
		config.constraints,
		isFieldRequired(config.rules),
	);

	if (!shouldShow) {
		return null;
	}

	const Component = registry.getComponent(config.type);

	if (!Component) {
		return (
			<div className={`text-red-500 text-sm ${className || ''}`} style={style}>
				Error: Component "{config.type}" not found in registry
			</div>
		);
	}

	const enhancedConfig = {
		...config,
		disabled: config.disabled || shouldDisable,
		required: isRequired,
	};

	return <Component config={enhancedConfig} />;
}
