import { FormElement } from '@/components/internals/field-renderer';
import { getFieldGridStyles } from '@/hooks/grid-styles';
import type { FieldSetProps } from '@/registry/forms/inputs/form-fieldset.types';
import './form-fieldset.css';

export function FormFieldSet(config: FieldSetProps) {
	return (
		<fieldset class="se-fieldset" style={{ ...getFieldGridStyles(config.grid), ...config.style }}>
			{config.legend ? <legend class="se-fieldset__legend">{config.legend}</legend> : null}
			{config.description ? <p class="se-fieldset__description">{config.description}</p> : null}
			<div class="se-fieldset__fields">
				{config.elements.map((elementConfig, elementIndex) => (
					<FormElement
						key={`${elementConfig.id || elementConfig.$type}_${elementIndex}`}
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
	);
}
