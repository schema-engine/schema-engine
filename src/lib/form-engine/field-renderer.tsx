import { useFormEngine } from './provider';
import { useConstraintLogic } from './hooks/use-constraint-logic';
import { isFieldRequired } from './validation';
import type { FieldConfig } from './types/form';

export interface DynamicFieldProps {
	config: FieldConfig;
	className?: string;
	style?: React.CSSProperties;
}

/**
 * Dynamic field renderer that loads components from the registry
 * Supports conditional rendering based on other field values
 */
export function DynamicField({ config, className, style }: DynamicFieldProps) {
	return <DirectField config={config} className={className} style={style} />;
}

/**
 * Direct field renderer without conditional logic
 */
function DirectField({ config, className, style }: DynamicFieldProps) {
	const { registry } = useFormEngine();
	const Component = registry.getComponent(config.type);

	if (!Component) {
		return (
			<div className={`text-red-500 text-sm ${className || ''}`} style={style}>
				Error: Component "{config.type}" not found in registry
			</div>
		);
	}

	return <Component config={config} />;
}

/**
 * Complete field component that applies constraints and renders the field
 * Handles constraints to control field visibility and properties
 */
export function FormField({ config, className, style }: DynamicFieldProps) {
	// Apply constraint logic if constraints exist
	const { shouldShow, shouldDisable, isRequired } = useConstraintLogic(
		config.constraints,
		isFieldRequired(config.validation),
	);

	// If field should not be shown, return null early
	if (!shouldShow) {
		return null;
	}

	// Create enhanced config with constraint-based properties
	const enhancedConfig = {
		...config,
		disabled: config.disabled || shouldDisable,
		required: isRequired,
	};

	return <DynamicField config={enhancedConfig} className={className} style={style} />;
}
