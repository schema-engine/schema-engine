import type React from 'react';
import {
	type FieldScope,
	composeElementKey,
	composeFieldId,
	composeFieldName,
	type NormalizedElementConfig,
} from '@schema-engine/forms';
import { FormElement } from './field-renderer.js';

export interface FormElementsProps {
	elements: ReadonlyArray<NormalizedElementConfig>;
	className?: string;
	style?: React.CSSProperties;
	/**
	 * Object scope (`address`) or array-item scope (`contacts.0`).
	 * Fieldsets pass `config.name`; array items pass `${config.name}.${index}`.
	 */
	namePrefix?: string;
	/**
	 * `join` (default): `${namePrefix}.${child.name}`.
	 * `replace`: scalar array items bind to `namePrefix` itself.
	 */
	nameStrategy?: FieldScope['nameStrategy'];
	/** Stable array-item identity. Do not pass the item index. */
	instanceId?: string;
}

export function FormElements({ elements, className, style, namePrefix, nameStrategy, instanceId }: FormElementsProps) {
	const scope: FieldScope = { namePrefix, nameStrategy, instanceId };

	return (
		<>
			{elements.map((element, index) => (
				<FormElement
					key={composeElementKey(element, index, scope)}
					config={element}
					name={composeFieldName(element, scope)}
					id={composeFieldId(element, scope)}
					instanceId={instanceId}
					className={className}
					style={style}
				/>
			))}
		</>
	);
}
