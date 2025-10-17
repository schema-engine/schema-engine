import { FormElement } from '@/components/internals/field-renderer';
import type { FieldSetProps } from './form-fieldset.types';

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
export function FormFieldSet({ ...config }: FieldSetProps) {
	return (
		<div className="space-y-4" style={config.style}>
			<fieldset className="border-0 p-0 m-0">
				{config.legend && (
					<legend className="text-base font-semibold mb-8 pb-3 border-b border-border w-full">
						{config.legend}
						{config.description && (
							<span className="block text-sm font-normal text-muted-foreground mt-1">
								{config.description}
							</span>
						)}
					</legend>
				)}

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
			</fieldset>
		</div>
	);
}
