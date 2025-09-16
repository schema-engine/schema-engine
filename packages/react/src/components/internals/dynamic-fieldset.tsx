import type React from 'react';
import { FormElement } from './field-renderer';
import type { FieldConfig, ConstraintLogic } from '@json-form-engine/core/schemas';
import { useConstraintLogic } from '@/hooks';

interface DynamicFieldsetProps {
	id: string;
	label?: string;
	description?: string;
	constraints: ConstraintLogic[];
	elements: FieldConfig[];
	className?: string;
	style?: React.CSSProperties;
}

/**
 * A fieldset that conditionally renders its child elements based on constraint logic
 */
export function DynamicFieldset({
	id,
	label,
	description,
	constraints,
	elements,
	className = '',
	style,
}: DynamicFieldsetProps) {
	const { shouldShow, shouldDisable } = useConstraintLogic(constraints);

	if (!shouldShow) {
		return null;
	}

	return (
		<fieldset
			id={id}
			disabled={shouldDisable}
			className={`border border-gray-200 rounded-lg p-4 ${className}`}
			style={style}
		>
			{label && <legend className="text-lg font-medium text-gray-900 px-2">{label}</legend>}

			{description && <p className="text-sm text-gray-600 mb-4">{description}</p>}

			<div className="space-y-4">
				{elements.map((element) => (
					<FormElement
						key={element.id}
						config={element}
						className={element.className}
						style={element.style}
					/>
				))}
			</div>
		</fieldset>
	);
}
