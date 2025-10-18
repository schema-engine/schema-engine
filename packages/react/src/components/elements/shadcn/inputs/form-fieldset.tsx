import { FormElement } from '@/components/internals/field-renderer';
import { FieldSet } from '@/components/elements/field-group';
import type { FieldSetProps as FieldSetConfigProps } from './form-fieldset.types';

/**
 * FieldSet component that groups related form fields into a nested object
 *
 * Unlike FormArrayElements which creates arrays, this creates a single nested object.
 * Perfect for grouping related fields like addresses, contact info, date ranges, etc.
 *
 * Features:
 * - Groups multiple fields under a single name
 * - Creates nested object structure in form data
 * - Supports validation on nested fields
 * - Styled with legend and border separator
 */
export function FormFieldSet({ ...config }: FieldSetConfigProps) {
	return (
		<div className="space-y-4" style={config.style}>
			<FieldSet legend={config.legend} description={config.description}>
				<div className="space-y-4">
					{config.elements.map((elementConfig, elementIndex) => (
						<FormElement
							key={`${elementConfig.id || elementConfig.__id}_${elementIndex}`}
							config={
								{
									...elementConfig,
									name: `${config.name}.${elementConfig.name}`,
									id: elementConfig.id ? `${elementConfig.id}_${elementIndex}` : undefined,
								} as FormEngine.ElementConfig
							}
						/>
					))}
				</div>
			</FieldSet>
		</div>
	);
}
